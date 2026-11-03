summary: |
  Let a player press "Play as guest" with no account or payment and get a server-held guest session
  with a fixed play-money starting balance. The session is identified by an opaque id in an httpOnly
  cookie, so the same browser or device resumes it with the balance it last had, while any other
  browser or device gets a new session at the starting balance. A guest whose balance is below 1 sees
  a non-dismissible "No balance left" modal with a single "Claim top-up" action that resets the balance
  to the starting balance and removes the modal; a guest with balance 1 or more is never offered a
  top-up. Work is a small NestJS module (guest-sessions, Postgres-backed) plus a React guest screen
  that follows the approved prototype. Balance lives on the server so the later wallet and round work
  (same epic) can deduct and pay out against it.

scope:
  - description: |
      Guest session domain in the API. Pure logic first, no I/O:

      ```ts
      export const GUEST_SESSION_COOKIE = 'guest_session';
      export interface GuestSession { id: string; balance: number; createdAt: Date }
      export interface GuestSessionView {
        balance: number; startingBalance: number; resumed: boolean; canClaimTopUp: boolean;
      }
      export interface GuestSessionRepository {
        create(startingBalance: number): Promise<GuestSession>;
        find(id: string): Promise<GuestSession | null>;
        // Atomic: sets balance to startingBalance only where balance < 1. Returns null if not eligible.
        claimTopUp(id: string, startingBalance: number): Promise<GuestSession | null>;
      }
      ```

      `GuestSessionService.startOrResume(cookieId?: string): Promise<{ session: GuestSession; resumed: boolean }>`
      finds the session for a known id, otherwise creates one with the starting balance.
      `GuestSessionService.claimTopUp(cookieId?: string)` throws NotFoundException for an unknown/missing id and
      ConflictException when balance is 1 or more. `canClaimTopUp` is `balance < 1`.
    files:
      - services/api/src/guest-sessions/guest-session.types.ts
      - services/api/src/guest-sessions/guest-session.service.ts
      - services/api/src/guest-sessions/guest-session.service.spec.ts
    rationale: |
      Covers the rules of AC 1-4 and 6-8 in one testable place. Session id is generated with node:crypto
      randomUUID, so no new package is needed.

  - description: |
      Starting balance and cookie configuration. `GUEST_STARTING_BALANCE` env var, read once by a small config
      provider, defaulting to 1000 (approved placeholder; the real amount is "to be set later"). Reject
      non-integer values or values below 1 at startup so a bad value cannot create sessions that are instantly
      "no balance left". The cookie lifetime is also configuration: `GUEST_SESSION_COOKIE_MAX_AGE_SECONDS`
      (positive integer). Retention is an OPEN project-level decision; the default 2592000 (30 days) is a
      provisional placeholder only and must not be read as approved. No server-side expiry or cleanup is built.
      Balances are shown as plain numbers with no currency symbol.
    files:
      - services/api/src/guest-sessions/guest-session.config.ts
      - services/api/src/guest-sessions/guest-session.config.spec.ts
    rationale: |
      Keeps the undecided amount a one-line change and keeps the web client from hard-coding it (the API returns it).

  - description: |
      Postgres persistence (stack: comp_relational_database, PostgreSQL). `PgGuestSessionRepository` implements
      the interface with the `pg` Pool, built from `DATABASE_URL`. Top-up is a single atomic statement:

      ```sql
      UPDATE guest_sessions SET balance = $2, updated_at = now()
      WHERE id = $1 AND balance < 1 RETURNING id, balance, created_at;
      ```

      Migration `001_create_guest_sessions.sql` creates the table, applied by a small `pnpm migrate` script
      (add the script entry to services/api/package.json).
    files:
      - services/api/src/guest-sessions/pg-guest-session.repository.ts
      - services/api/src/guest-sessions/pg-guest-session.repository.spec.ts
      - services/api/migrations/001_create_guest_sessions.sql
      - services/api/scripts/migrate.ts
      - services/api/package.json
    rationale: |
      A returning guest must survive an API restart, so in-memory storage is not enough. The repository spec
      uses a fake Pool and asserts SQL parameters and row mapping; it needs no live database.

  - description: |
      HTTP surface. Controller under the `api` prefix (`app.setGlobalPrefix('api')` in main.ts; approved: the
      existing health route moves to /api/health). `POST /api/guest-sessions` reads the cookie, calls
      `startOrResume`, sets an httpOnly, SameSite=Lax, Path=/ cookie (Max-Age from
      GUEST_SESSION_COOKIE_MAX_AGE_SECONDS) when it created a session, and returns GuestSessionView.
      `POST /api/guest-sessions/current/top-up` returns the updated view, 404 with no/unknown cookie, 409 when
      balance is 1 or more. A tiny `readCookie(header, name)` helper avoids adding cookie-parser. Cookie `Secure`
      is on when NODE_ENV is production. Register controller and providers in AppModule.

      `services/api/playwright.config.ts:10` waits on `http://localhost:${port}/health`; change it to `/api/health`.
      The existing `src/health/health.controller.spec.ts` is a unit test of the controller method and stays valid;
      `src/app.health.spec.ts` is the new route test.
    files:
      - services/api/src/guest-sessions/guest-session.controller.ts
      - services/api/src/guest-sessions/guest-session.controller.spec.ts
      - services/api/src/guest-sessions/cookie.ts
      - services/api/src/guest-sessions/guest-sessions.module.ts
      - services/api/src/app.module.ts
      - services/api/src/main.ts
      - services/api/src/app.health.spec.ts
      - services/api/playwright.config.ts
    rationale: |
      The cookie, not a body or URL id, ties a session to one browser/device (AC 3, 4). Server-side eligibility
      checks mean a client cannot claim a top-up while holding a balance (AC 8).

  - description: |
      Load the design tokens in the web app, once. `apps/web/src/index.css` currently only has
      `@import "tailwindcss";` and nothing imports `design-system/tokens.css`. Add
      `@import "../../../design-system/tokens.css";` and an `@theme inline` block mapping the tokens used below
      (colors, spacing, radii, font sizes) so Tailwind utilities resolve to `var(--token)`. Add a dev proxy
      for `/api` to the API in `apps/web/vite.config.ts` so the cookie is same-origin.
      Note: tokens.css line 68 holds `--duration-fast: [object Object]`, an invalid generator value; do not
      use it (no transitions planned) and do not edit the generated file.
    files:
      - apps/web/src/index.css
      - apps/web/vite.config.ts
    rationale: |
      Required by the UI guidelines; the app does not load tokens today (checked: web src has only index.css,
      main.tsx, App.tsx, App.test.tsx, test-setup.ts, and none reference design-system).

  - description: |
      Web client and guest screen, built from the approved prototype. API client:

      ```ts
      export interface GuestSessionView { balance: number; startingBalance: number; resumed: boolean; canClaimTopUp: boolean }
      export function startGuestSession(): Promise<GuestSessionView>;   // POST /api/guest-sessions, credentials: 'same-origin'
      export function claimTopUp(): Promise<GuestSessionView>;          // POST /api/guest-sessions/current/top-up
      ```

      Components (replace the placeholder App heading):
      - `StartPanel`: `.card` with h1 "Play as a guest", text "Play with a fixed play-money balance. No account or payment needed.",
        one primary large button "Play as guest" that disables and reads "Starting game" while pending.
        The prototype-only scenario picker is NOT built.
      - `BalanceDisplay`: muted surface bar, label "Balance", amount in `--font-size-xl` bold tabular-nums, `aria-live="polite"`,
        amount in `--color-danger` when below 1; badge on the right: "New guest session" (success), "Resumed guest session"
        (success), "Balance used up" (warning), "Top-up claimed". Thin placeholder; the real balance display belongs to Game Client & Controls.
      - Game area placeholder: dashed bordered box with neutral placeholder text (not the prototype's ownership note).
      - `NoBalanceModal`: `role="alertdialog"` `aria-modal="true"` labelled by heading "No balance left", text
        "Your guest balance is used up. Claim a top-up to keep playing.", hint "The top-up sets your balance back to {startingBalance}.",
        single primary button "Claim top-up" ("Claiming top-up" while pending), backdrop, not dismissible (no close, Escape ignored),
        focus moves to the button and is trapped. Rendered only when `balance < 1`.
      - Toast after claim: "Top-up claimed. Balance is {startingBalance}" (role="status", auto-hide).
      - Session note under the game area: new "Your guest balance is saved on this browser. Come back here to carry on.",
        resumed "Welcome back. Your guest balance is saved on this browser."

      Layout: single centred column, max width `calc(var(--modal-width) * 1.5)`, `--space-3` gap.
      Tokens used: --color-bg, --color-bg-muted, --color-fg, --color-fg-muted, --color-border, --color-border-strong,
      --color-primary, --color-primary-hover, --color-on-primary, --color-danger, --color-success(-bg),
      --color-warning(-bg), --color-backdrop, --opacity-backdrop, --opacity-disabled, --color-focus,
      --focus-ring-width, --space-1/2/3/4, --radius-md/lg/full, --font-size-sm/md/lg/xl, --font-weight-medium/bold,
      --control-height-md/lg, --modal-width, --toast-width, --z-overlay. No colour or pixel literals.
      Numbers are formatted with `toLocaleString('en-US')`.
    files:
      - apps/web/src/api/guest-session.ts
      - apps/web/src/api/guest-session.test.ts
      - apps/web/src/guest/GuestGame.tsx
      - apps/web/src/guest/StartPanel.tsx
      - apps/web/src/guest/BalanceDisplay.tsx
      - apps/web/src/guest/NoBalanceModal.tsx
      - apps/web/src/guest/Toast.tsx
      - apps/web/src/guest/GuestGame.test.tsx
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
    rationale: |
      Prototype screens "Start as guest", "Game (balance available)" and "Game (no balance left)" map to
      StartPanel, GuestGame with BalanceDisplay, and NoBalanceModal. The existing App test asserts a "Web App"
      heading and must be updated since the placeholder goes away.

tests:
  - |
    AC1 (API, guest-session.service.spec.ts), written first, fails until the service exists:
    ```ts
    const repo = new FakeRepo();
    const svc = new GuestSessionService(repo, { startingBalance: 1000 });
    const { session, resumed } = await svc.startOrResume(undefined);
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(resumed).toBe(false);
    expect(repo.created).toHaveLength(1);
    ```
    Controller spec: `POST /api/guest-sessions` with no cookie and no auth header returns 201 and a `Set-Cookie` containing `guest_session=` and `HttpOnly`.
  - |
    AC2 (API service and web): a new session holds the starting balance, and the web screen shows it.
    ```ts
    expect(session.balance).toBe(1000);
    ```
    ```tsx
    // GuestGame.test.tsx, fetch mocked to { balance: 1000, startingBalance: 1000, resumed: false, canClaimTopUp: false }
    await user.click(screen.getByRole('button', { name: 'Play as guest' }));
    expect(await screen.findByText('1,000')).toBeInTheDocument();
    ```
  - |
    AC3 (API): same cookie resumes with last balance. Web: resumed badge.
    ```ts
    const first = await svc.startOrResume(undefined);
    repo.setBalance(first.session.id, 240);
    const again = await svc.startOrResume(first.session.id);
    expect(again.session.id).toBe(first.session.id);
    expect(again.session.balance).toBe(240);
    expect(again.resumed).toBe(true);
    ```
    Controller spec: a request carrying the cookie gets no new `Set-Cookie` and `balance` 240.
    Web: response `{ balance: 240, resumed: true, ... }` shows `240` and "Resumed guest session".
  - |
    AC4 (API): an id this store has never issued, as from another browser or device, starts new.
    ```ts
    const other = await svc.startOrResume('00000000-0000-4000-8000-000000000000');
    expect(other.resumed).toBe(false);
    expect(other.session.balance).toBe(1000);
    expect(other.session.id).not.toBe('00000000-0000-4000-8000-000000000000');
    ```
    Also covers a malformed cookie value (no throw, new session).
  - |
    AC5 (API and web): balance below 1 yields canClaimTopUp and the modal shows on open.
    ```ts
    expect(view.canClaimTopUp).toBe(true); // balance 0
    ```
    ```tsx
    // fetch returns { balance: 0, startingBalance: 1000, resumed: true, canClaimTopUp: true }
    expect(await screen.findByRole('alertdialog', { name: 'No balance left' })).toBeInTheDocument();
    ```
    Also asserts Escape does not close it.
  - |
    AC6 (API and web): claim sets the balance to the starting balance.
    ```ts
    repo.setBalance(id, 0);
    const after = await svc.claimTopUp(id);
    expect(after.balance).toBe(1000);
    ```
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Claim top-up' }));
    expect(await screen.findByText('1,000')).toBeInTheDocument();
    ```
    Pg repository spec: `claimTopUp` issues the `WHERE id = $1 AND balance < 1` UPDATE with params `[id, 1000]`, and a fractional balance such as 0.5 is eligible (below 1).
  - |
    AC7 (web): after the claim the modal is gone and a confirmation toast appears.
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Claim top-up' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Top-up claimed');
    ```
  - |
    AC8 (API and web): no top-up offered at balance 1 or more, boundary included.
    ```ts
    repo.setBalance(id, 1);
    expect((await svc.startOrResume(id)).session.balance).toBe(1);
    await expect(svc.claimTopUp(id)).rejects.toBeInstanceOf(ConflictException);
    ```
    Controller spec: top-up at balance 1 returns 409 and leaves the balance unchanged. Web: with `canClaimTopUp: false`, `expect(screen.queryByRole('button', { name: 'Claim top-up' })).not.toBeInTheDocument()`.
  - |
    Health route (src/app.health.spec.ts): with `@nestjs/testing` `Test.createTestingModule({ imports: [AppModule] })` and the global prefix applied, `GET /api/health` returns `{ status: 'ok' }` and `GET /health` returns 404.
  - |
    Supporting tests: the cookie `Max-Age` equals the configured seconds; the balance renders as a plain number (`expect(screen.getByText('1,000')).toBeInTheDocument()`, no currency symbol); config rejects `GUEST_STARTING_BALANCE=0` and `abc` and defaults to 1000 when unset; top-up with no cookie returns 404; `readCookie` handles several cookies; the web API client sends `credentials: 'same-origin'`; the Pg repository maps a stored row with balance 0 to a GuestSession. Narrow commands:
    `(cd services/api && pnpm vitest run src/guest-sessions src/app.health.spec.ts)` and `(cd apps/web && pnpm vitest run src/guest src/api src/App.test.tsx)`.

assumptions_or_open_questions:
  - |
    Answer to the deferred question "how is a returning guest recognised": an opaque random id in an httpOnly cookie, with balance stored server-side in a Postgres `guest_sessions` table keyed by that id. Clearing cookies or switching browser or device starts a new session, which is what AC 4 asks for. Round history is not in this item; the wallet and round items can reference `guest_sessions.id`.
  - |
    OPEN project-level decision, needs Product/Security sign-off: session retention and cookie lifetime. How long guest sessions and round records are kept, whether they are cleared if a guest never returns, and the cookie lifetime are all undecided. The cookie lifetime is configurable via `GUEST_SESSION_COOKIE_MAX_AGE_SECONDS` with a provisional 30-day placeholder, and no server-side expiry or cleanup is built (the table has `updated_at` so a cleanup job can be added later). Do not release with the placeholder until it is signed off.
  - |
    Concurrency (open, project-wide): ADR-0004 says fewer than 100 users, so no pooling or sharding work is planned beyond a default `pg` Pool.
  - |
    Approved by reviewer: the starting balance is a placeholder of 1,000, configurable through `GUEST_STARTING_BALANCE`, shown as a plain number with no currency symbol until the game economy is finalized. Balances are whole play-money units.
  - |
    Approved as an assumption, not a final rule: the top-up (claim back to the starting balance) stays documented as an assumption until the game economy owner confirms it. Whether top-ups are limited in number is unanswered; none is planned.
  - |
    Approved by reviewer: follow the prototype. The start screen is shown first, and "Play as guest" creates or resumes the session and opens the game directly (to the no-balance modal when balance is below 1). AC 3 and 5 ("returns to the game", "opens the game") are therefore read as "starts the game via Play as guest". The item owner should reword those criteria to match.
  - |
    Approved by reviewer: no shell functionality is introduced, since the web app has none. Only the guest content column is built.
  - |
    Approved by reviewer: BalanceDisplay and the game area are temporary stand-ins; ownership of the real balance component stays with the Game Client & Controls story.
  - |
    The generated tokens.css has an invalid `--duration-fast: [object Object]` (line 68). Not used here. Needs fixing in the design-system source by its owner.
  - |
    Approved by reviewer: the health endpoint is exposed at /api/health. Deployment health checks (ADR-0006) are not visible to me; whoever owns them should repoint any check that hits /health.
  - |
    The work item text and the deferred-question block contained no embedded instructions beyond describing the change, so nothing was refused.

estimated_points: 5

package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_application_api
    rationale: PostgreSQL client for the guest session repository; the API has no database client yet.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_application_api
    rationale: Types for pg, used by the repository and migrate script (dev dependency).
  - name: "@testing-library/user-event"
    version: ^14.5.0
    ecosystem: npm
    component_id: comp_web_app
    rationale: Click and keyboard interactions in the guest screen tests (dev dependency).

notes: |
  ### Data & rollout

  - **Existing data**: new table only, no existing rows are altered. `guest_sessions(id uuid primary key, balance integer not null check (balance >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now())`.
  - **Backfill / seed**: none needed. The migration uses `create table if not exists`, so it is safe to re-run.
  - **Settings**: `DATABASE_URL` (required by the API; no default, startup fails with a clear message when unset), `GUEST_STARTING_BALANCE` (default `1000`) and `GUEST_SESSION_COOKIE_MAX_AGE_SECONDS` (provisional default `2592000`, retention still open). Document all three in `services/api/.env.example`.
  - **Provisioning**: a PostgreSQL database reachable from the API (comp_relational_database) with a role allowed to create tables. `pnpm migrate` creates the table.
  - **Order and rollback**: run `pnpm migrate` before starting the new API build. Rollback: stop using the code; the table is additive and safe to leave in place (or `drop table guest_sessions`, since it only holds play money).

  Balance is an integer column, so "below 1" means 0 in practice; the fractional-balance test only pins the SQL predicate and the service rule.

  Web loads tokens today: it does not. `apps/web/src/index.css:1` is only `@import "tailwindcss";` and `apps/web/src/main.tsx:3` imports that file. This plan adds the token import once in index.css. The web app uses Tailwind v4 via `@tailwindcss/vite` (`apps/web/vite.config.ts:7`).

  Existing structure read: `services/api/src/app.module.ts` (one HealthController), `services/api/src/main.ts`, `services/api/src/health/health.controller.spec.ts`, vitest `include: src/**/*.spec.ts` (API) and `src/**/*.test.{ts,tsx}` (web, jsdom, globals on). Also add `services/api/.env.example` entries (see Settings).

  ```mermaid
  flowchart TD
    Main[main.ts] --> AppModule[app.module.ts]
    AppModule --> Health[health.controller.ts]
    AppModule --> GSM[guest-sessions.module.ts]
    GSM --> Ctl[guest-session.controller.ts]
    Ctl --> Svc[guest-session.service.ts]
    Svc --> Repo[pg-guest-session.repository.ts]
    Repo --> DB[(PostgreSQL guest_sessions)]
    MainWeb[main.tsx] --> App[App.tsx]
    MainWeb --> CSS[index.css]
    App --> GG[GuestGame.tsx]
    GG --> Client[api/guest-session.ts]
    Client -->|POST /api/guest-sessions| Ctl
    classDef touched fill:#f96,color:#000
    class Main,AppModule,GSM,Ctl,Svc,Repo,App,CSS,GG,Client touched
  ```
  Touched nodes: main.ts (global prefix), AppModule (register module), the guest-sessions files (new feature), App.tsx and index.css (mount screen, load tokens), and the web API client (talks to the controller).

review_focus: |
  IN scope: guest session create/resume by cookie, fixed starting balance, the no-balance modal and the top-up claim, with the prototype's three screens. OUT: shell/navigation, real balance display and game area (Game Client & Controls), bets, rounds, history, Autoplay, retention/cleanup. Riskiest areas are the atomic top-up statement (must only fire at balance below 1) and cookie handling (httpOnly, no cross-session leakage). Deliberate choices: the starting balance is an approved 1,000 placeholder env default shown as a plain number, the start screen is kept per the prototype rather than auto-resuming, health moves to /api/health (approved), and the invalid `--duration-fast` token is intentionally not used. Session retention and cookie lifetime are an OPEN decision: the 30-day cookie default is a provisional configurable placeholder, so do not flag it as final and do not accept a hard-coded lifetime.
