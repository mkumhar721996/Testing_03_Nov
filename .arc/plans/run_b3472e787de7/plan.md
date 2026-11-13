summary: |
  Add customer self-registration, sign-in and sign-out with email and password. The Application API (NestJS, PostgreSQL) gets an `accounts` / `sessions` / `sign_in_attempts` schema (migration 006), a scrypt password hasher built on `node:crypto` (no new packages), opaque server-side session tokens sent as a Bearer header, an `AuthService` that enforces the email and password rules, the generic duplicate-email message, the single `role` (customer, technician, admin) and the 5-failures / 15-minute lockout, and an `AuthController` exposing `POST /auth/register`, `POST /auth/sign-in`, `POST /auth/sign-out` and `GET /auth/session`. The Web App (React + Vite + Tailwind over the design-system tokens) gets the approved "Sign in" screen: slim top bar, Sign in / Create account tabs, the register form with inline email and password checks and no phone field, the sign-in error and locked states, and the signed-in panel with a role badge and Sign out. Technician and admin account creation, profile, saved addresses, phone verification and wiring `AdminGuard` to sessions stay out of scope.

scope:
  - description: |
      Migration `services/api/migrations/006_accounts.sql` (tool-neutral SQL like the existing ones; 004 and 005 are already taken by the technicians, visit-limit and jobs migrations, so the next free number is 006). Three tables, no phone column anywhere (AC 6).
      ```sql
      CREATE TABLE IF NOT EXISTS accounts (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL CHECK (role IN ('customer','technician','admin')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_key ON accounts (lower(email));
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash text PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES accounts(id),
        expires_at timestamptz NOT NULL
      );
      -- keyed by email, not account, so unknown emails are throttled and answered identically
      CREATE TABLE IF NOT EXISTS sign_in_attempts (
        email text PRIMARY KEY,
        failed_count integer NOT NULL,
        last_failed_at timestamptz NOT NULL
      );
      ```
    files:
      - services/api/migrations/006_accounts.sql
    rationale: |
      Role is stored once per account with a CHECK so it can only be one of three values (AC 8). The unique index on lower(email) makes duplicate detection race-safe (AC 7). Only a hash of the session token is stored.

  - description: |
      Pure validators, constants and hasher.
      ```ts
      // auth.validation.ts
      export function normaliseEmail(raw: string): string   // trim + lower-case
      export function isValidEmail(email: string): boolean  // exactly one '@', non-empty local part, domain has an inner dot
      export function isValidPassword(pw: string): boolean  // length >= 8, /[A-Za-z]/, /\d/
      // password.hasher.ts (node:crypto scrypt, random 16-byte salt, timingSafeEqual)
      export async function hashPassword(pw: string): Promise<string>   // "scrypt$<salt>$<hash>"
      export async function verifyPassword(pw: string, stored: string): Promise<boolean>
      // auth.constants.ts
      export const ROLES = ['customer', 'technician', 'admin'] as const;
      export type Role = (typeof ROLES)[number];
      export const MAX_FAILED_ATTEMPTS = 5;
      export const LOCK_WINDOW_MS = 15 * 60 * 1000;
      export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
      export const REGISTER_REFUSED = 'Registration could not be completed';
      export const SIGN_IN_REFUSED = 'Email or password is incorrect';
      ```
    files:
      - services/api/src/auth/auth.constants.ts
      - services/api/src/auth/auth.validation.ts
      - services/api/src/auth/password.hasher.ts
    rationale: |
      Keeps the AC 10 to 12 rules and password storage in small units tested without a database. scrypt from `node:crypto` avoids a new native dependency.

  - description: |
      Repository port, service, Postgres adapter, mirroring `player/player.repository.ts` + `pg-player.repository.ts` and the `capacity/fake-capacity.repository.ts` fake pattern.
      ```ts
      export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');
      export interface Account { id: string; email: string; passwordHash: string; role: Role }
      export interface AccountRepository {
        create(a: Account): Promise<boolean>;                 // false when the email already exists
        findByEmail(email: string): Promise<Account | undefined>;
        findById(id: string): Promise<Account | undefined>;
        createSession(tokenHash: string, accountId: string, expiresAt: Date): Promise<void>;
        findSession(tokenHash: string, now: Date): Promise<Account | undefined>; // undefined when expired
        deleteSession(tokenHash: string): Promise<void>;
        getAttempts(email: string): Promise<{ failedCount: number; lastFailedAt: Date } | undefined>;
        recordFailure(email: string, now: Date): Promise<void>; // upsert, failed_count + 1
        clearAttempts(email: string): Promise<void>;
      }
      // auth.service.ts
      export const CLOCK = Symbol('CLOCK'); // () => Date, injected so lockout tests never sleep
      register(email: string, password: string): Promise<AuthResult>  // role always 'customer'
      signIn(email: string, password: string): Promise<AuthResult>
      signOut(token: string): Promise<void>
      sessionFor(token: string | undefined): Promise<SessionUser>     // throws UnauthorizedException
      type AuthResult = { token: string; user: { id: string; email: string; role: Role } }
      ```
      Sign-in order: normalise email; if `failed_count >= 5` and `now - last_failed_at < 15 min` throw 429 "Too many failed sign-in attempts for this email. Try again in 15 minutes." WITHOUT touching the counter (lock ends exactly 15 minutes after the fifth failure, AC 13/14); else look up the account and `verifyPassword` (dummy hash when the account is missing, so timing does not differ); on mismatch `recordFailure` (restart the count at 1 when the previous window expired) and throw 401 `SIGN_IN_REFUSED`; on match `clearAttempts` and mint a session (32 random bytes base64url, store sha256). Register: validate (400 with field-level reasons, AC 10/12), hash, `create`; a duplicate returns 409 with exactly `REGISTER_REFUSED` (AC 7/15); on success sign the new account in (AC 1/11).
    files:
      - services/api/src/auth/account.repository.ts
      - services/api/src/auth/fake-account.repository.ts
      - services/api/src/auth/pg-account.repository.ts
      - services/api/src/auth/auth.service.ts
    rationale: |
      Same port + Pg adapter + service split as the existing modules. The injected clock is the only deterministic way to test AC 13/14.

  - description: |
      HTTP surface and wiring.
      ```ts
      @Controller('auth')
      POST /auth/register  body { email, password } -> 201 AuthResult | 400 | 409 { message: 'Registration could not be completed' }
      POST /auth/sign-in   body { email, password } -> 200 AuthResult | 401 { message } | 429 { message }
      POST /auth/sign-out  Authorization: Bearer <token> -> 204
      GET  /auth/session   Authorization: Bearer <token> -> 200 { id, email, role } | 401
      ```
      Register reads `{ email, password }` only; a client-sent `role` is ignored (AC 9). `app.module.ts` registers `AuthController`, `AuthService`, `ACCOUNT_REPOSITORY` (Pg factory throwing without `DATABASE_URL`, like the existing factories) and `CLOCK`. `main.ts` line 9 `allowedHeaders` gains `authorization`. A `bearerToken(header)` helper parses the header.
    files:
      - services/api/src/auth/auth.controller.ts
      - services/api/src/app.module.ts
      - services/api/src/main.ts
    rationale: |
      A Bearer header fits the existing cross-origin setup (explicit CORS headers, `x-guest-id` precedent) and avoids cookie/CSRF work. `GET /auth/session` is the "signed-in role is checked" endpoint for AC 8.

  - description: |
      Web client plumbing.
      ```ts
      // authApi.ts
      export type Role = 'customer' | 'technician' | 'admin'
      export interface SessionUser { id: string; email: string; role: Role }
      export class AuthRefusedError extends Error { status: number }  // message is the server's wording
      export function register(email: string, password: string): Promise<{ token: string; user: SessionUser }>
      export function signIn(email: string, password: string): Promise<{ token: string; user: SessionUser }>
      export function signOut(token: string): Promise<void>
      export function fetchSession(token: string): Promise<SessionUser>
      // clientValidation.ts: isValidEmail / isValidPassword, same rules as the server
      // useAuth.ts: { user, status: 'loading' | 'signed-in' | 'signed-out', register, signIn, signOut }
      ```
      Same `VITE_API_BASE_URL` handling as `slot/spinApi.ts`. Token kept in `sessionStorage` (cleared on sign-out); on load `useAuth` calls `fetchSession` and drops a token the server refuses. `vite.config.ts` line 9 proxy gains `/auth` next to `/spin`.
    files:
      - apps/web/src/auth/authApi.ts
      - apps/web/src/auth/clientValidation.ts
      - apps/web/src/auth/useAuth.ts
      - apps/web/vite.config.ts
    rationale: |
      Follows the feature-folder layout (`slot/spinApi.ts`, `slot/useSlotGame.ts`, `balance/useBalance.ts`). The server stays the authority; client rules only give the inline feedback the design shows.

  - description: |
      The approved "Sign in" screen (design screen "Sign in"), reached at hash route `#/account` added to `App.tsx` (hash routing is the project's stand-in, see the comment in `App.tsx`).
      - Slim top bar (`AuthTopBar`): flex row, `--space-2` / `--space-3` padding, `--color-bg` fill, bottom border `--border-width` solid `--color-border`; "Bounteous Repairs" wordmark and an Account `.btn .btn-ghost .btn-sm` with `aria-current="page"`. No sidebar (pre-auth page). The prototype's "Book a visit" button and toast are not built (no booking story).
      - Page background `--color-bg-muted`; one centred column, margin `--space-4` auto, horizontal padding `--space-3`.
      - Tabs: `.tabs` with two `.tab` buttons ("Sign in", "Create account"), `role="tablist"` / `role="tab"`, `aria-selected`. Defined in `design-system/prototype-utils.css`, imported by `apps/web/src/index.css` line 3 (tokens on line 2), so no new import.
      - Panel (`AuthPanel`): `--card-default-background`, 1px `--card-default-border`, `--card-default-radius`, padding `--space-4`, children spaced `--space-3`; `h1` at `--font-size-xl`.
      - Sign-in form: "Sign in to your account", `.field` + `.input` for Email (`type=email`, `autocomplete=email`) and Password (`autocomplete=current-password`), full-width `.btn .btn-primary` "Sign in", link "No account yet? Create one".
      - Sign-in error: `.alert .alert-danger` `role="alert"` "Email or password is incorrect. Check both and try again."; both inputs `.is-invalid` and `aria-invalid="true"`; values kept.
      - Locked: `.alert .alert-warning` `role="alert"` "Too many failed sign-in attempts for this email. Try again in 15 minutes."; submit `disabled` (`--opacity-disabled` via `.btn:disabled`). Driven by the server's 429, not a client counter.
      - Register form: "Create your account", `.text-muted` intro, Email and Password, `.field-hint` "At least 8 characters, with a letter and a digit." linked by `aria-describedby`, `.field-error` `role="alert"` and `.is-invalid` on blur and on submit (prototype copy), full-width primary "Create account". NO phone field (AC 6).
      - Register refused: `.alert .alert-danger` with the server's `Registration could not be completed` followed by the prototype hint "Check your details, or sign in if you already have an account."; email `.is-invalid`.
      - Signed in: `h1` "Signed in", "Signed in as <email>", role row with `.badge .badge-success` showing the server's role, `.btn .btn-secondary` "Sign out". No name is collected, so no "Welcome, Sam".
      - Signed out: `.alert .alert-success` `role="status"` "You have been signed out." above an empty sign-in form; focus moves to the email field.
      - Loading (checking a stored session): `.skeleton` blocks in the panel; submit shows `.spinner` while in flight and is disabled.
      The prototype's "Prototype only: simulate..." buttons are not built; states come from real responses. Every value is `var(--token)` through Tailwind arbitrary values as `App.tsx` does (`p-[var(--space-3)]`); no colour literals.
    files:
      - apps/web/src/auth/AuthPage.tsx
      - apps/web/src/auth/AuthPanel.tsx
      - apps/web/src/auth/AuthTopBar.tsx
      - apps/web/src/App.tsx
    rationale: |
      The component catalogue holds only `BetControl` (unrelated) and `slot/TopBar` is slot-specific, so these small components are new, as the design notes ("auth form card, auth tabs"). `.auth` / `.auth-panel` / `.topbar` exist only in the prototype's inline style, so they are built from the same tokens.

  - description: |
      Test files (written first, see `tests`): API specs colocated as `*.spec.ts` using the fake repository and a controllable clock; Pg spec guarded by `TEST_DATABASE_URL` like `pg-player.repository.spec.ts`; web `*.test.tsx` colocated.
    files:
      - services/api/src/auth/auth.service.spec.ts
      - services/api/src/auth/auth.controller.spec.ts
      - services/api/src/auth/auth.validation.spec.ts
      - services/api/src/auth/password.hasher.spec.ts
      - services/api/src/auth/pg-account.repository.spec.ts
      - apps/web/src/auth/AuthPage.test.tsx
      - apps/web/src/auth/authApi.test.ts
      - apps/web/src/auth/useAuth.test.tsx
      - apps/web/src/auth/clientValidation.test.ts
    rationale: |
      Mirrors the repo's existing test layout.

tests:
  - |
    AC 1 — auth.service.spec.ts (fails until `register` exists).
    ```ts
    const res = await service.register('sam@example.com', 'Passw0rd1');
    expect(res.user.email).toBe('sam@example.com');
    expect(await service.sessionFor(res.token)).toMatchObject({ email: 'sam@example.com' });
    ```
    Web: AuthPage.test.tsx fills the register form, submits with `fetch` mocked to 201, expects `screen.getByText('Signed in as sam@example.com')`.
  - |
    AC 2 — auth.service.spec.ts
    ```ts
    const first = await service.register('sam@example.com', 'Passw0rd1');
    await service.signOut(first.token);
    const again = await service.signIn('SAM@Example.com ', 'Passw0rd1');
    expect(again.user.id).toBe(first.user.id);
    ```
    pg-account.repository.spec.ts: stored hash is not the plain password: `expect(stored.passwordHash).not.toContain('Passw0rd1')`.
  - |
    AC 3 — auth.service.spec.ts. Wrong password and unknown email are both refused and no session exists.
    ```ts
    await expect(service.signIn('sam@example.com', 'WrongPass9')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.signIn('nobody@example.com', 'Passw0rd1')).rejects.toBeInstanceOf(UnauthorizedException);
    ```
  - |
    AC 4 — auth.controller.spec.ts for the 401 body, AuthPage.test.tsx for the screen.
    ```ts
    expect(err.getResponse()).toMatchObject({ message: 'Email or password is incorrect' });
    // web
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    ```
  - |
    AC 5 — auth.service.spec.ts and useAuth.test.tsx.
    ```ts
    await service.signOut(token);
    await expect(service.sessionFor(token)).rejects.toBeInstanceOf(UnauthorizedException);
    // web
    expect(result.current.status).toBe('signed-out');
    expect(sessionStorage.getItem('auth-token')).toBeNull();
    ```
  - |
    AC 6 — AuthPage.test.tsx; pg spec asserts no phone column.
    ```ts
    await user.click(screen.getByRole('tab', { name: 'Create account' }));
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.getAllByRole('textbox')).toHaveLength(1); // email only
    ```
  - |
    AC 7 — auth.service.spec.ts and pg-account.repository.spec.ts (unique index, case-insensitive).
    ```ts
    await service.register('sam@example.com', 'Passw0rd1');
    await expect(service.register('SAM@example.com', 'Passw0rd2')).rejects.toBeInstanceOf(ConflictException);
    expect(await repo.create({ ...account, email: 'Sam@Example.com' })).toBe(false);
    ```
  - |
    AC 8 — auth.controller.spec.ts and pg-account.repository.spec.ts.
    ```ts
    expect(ROLES).toContain((await controller.session(`Bearer ${token}`)).role);
    // Pg: the CHECK rejects anything else
    await expect(pool.query("INSERT INTO accounts (id,email,password_hash,role) VALUES ($1,'x@y.co','h','owner')", [randomUUID()])).rejects.toThrow();
    // technician and admin rows seeded directly sign in and report their own role
    expect((await service.signIn('tech@example.com', 'Passw0rd1')).user.role).toBe('technician');
    ```
  - |
    AC 9 — auth.service.spec.ts and auth.controller.spec.ts. A client-supplied role is ignored.
    ```ts
    const res = await controller.register({ email: 'sam@example.com', password: 'Passw0rd1', role: 'admin' } as never);
    expect(res.user.role).toBe('customer');
    ```
  - |
    AC 10 — auth.validation.spec.ts, auth.service.spec.ts, clientValidation.test.ts, AuthPage.test.tsx.
    ```ts
    it.each(['Pass1', 'password', '12345678', 'Passw0r'])('rejects %s', (pw) => expect(isValidPassword(pw)).toBe(false));
    await expect(service.register('sam@example.com', 'password')).rejects.toBeInstanceOf(BadRequestException);
    expect(await repo.findByEmail('sam@example.com')).toBeUndefined();
    // web: inline error, no request sent
    expect(screen.getByText('Password needs at least 8 characters, a letter and a digit.')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    ```
  - |
    AC 11 — auth.service.spec.ts, boundary password.
    ```ts
    expect(isValidPassword('Passw0rd')).toBe(true); // exactly 8 chars
    expect((await service.register('new@example.com', 'Passw0rd')).user.email).toBe('new@example.com');
    ```
  - |
    AC 12 — auth.validation.spec.ts, auth.service.spec.ts, AuthPage.test.tsx.
    ```ts
    it.each(['sam.example.com', 'a@@b.com', 'a@b@c.com', 'sam@localhost', 'sam@example.', '@example.com'])('rejects %s', (e) => expect(isValidEmail(e)).toBe(false));
    expect(isValidEmail('sam@example.com')).toBe(true);
    // web
    expect(screen.getByText(/Enter an email address with one @/)).toBeVisible();
    ```
  - |
    AC 13 — auth.service.spec.ts with a controllable clock (no sleeping); AuthPage.test.tsx for the 429 state.
    ```ts
    for (let i = 0; i < 5; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
    clock.advance(14 * 60 * 1000 + 59_000);
    await expect(service.signIn('sam@example.com', 'Passw0rd1')).rejects.toMatchObject({ status: 429 });
    // an attempt while locked does not extend the lock (see AC 14)
    // web: warning text "Too many failed sign-in attempts for this email" shows and the Sign in button is disabled
    ```
  - |
    AC 14 — auth.service.spec.ts
    ```ts
    for (let i = 0; i < 5; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
    await service.signIn('sam@example.com', 'Passw0rd1').catch(() => {}); // refused while locked, not counted
    clock.advance(15 * 60 * 1000);
    expect((await service.signIn('sam@example.com', 'Passw0rd1')).user.email).toBe('sam@example.com');
    ```
    Also: 4 failures then the correct password succeeds, and a success resets the count (consecutive failures only).
  - |
    AC 15 — auth.controller.spec.ts and AuthPage.test.tsx.
    ```ts
    expect(err.getResponse()).toEqual(expect.objectContaining({ message: 'Registration could not be completed' }));
    // web
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration could not be completed');
    expect(screen.getByRole('alert').textContent).not.toMatch(/already (exists|registered)/i);
    ```
  - |
    Extra (session expiry, from the deferred question) — auth.service.spec.ts and password.hasher.spec.ts.
    ```ts
    clock.advance(SESSION_TTL_MS + 1);
    await expect(service.sessionFor(token)).rejects.toBeInstanceOf(UnauthorizedException);
    ```
    `verifyPassword` is true for the right password, false otherwise; two hashes of one password differ.
  - |
    Narrow commands: API `cd services/api && pnpm test -- src/auth`; web `cd apps/web && pnpm test -- src/auth`. Pg specs need `TEST_DATABASE_URL` and are skipped without it, as in `pg-player.repository.spec.ts`.

assumptions_or_open_questions:
  - |
    CONFLICT WITH AN ACCEPTED ADR: ADR-0012 (`.arc/decisions/ADR-0012-cross-cutting-authentication.md`) says sign-in is through corporate SSO with no built-in passwords. This story requires email and password accounts, so it contradicts that ADR. ADR-0010 also names different roles than customer / technician / admin. I followed the story; a human should supersede or amend ADR-0012 and ADR-0010, or stop before code is written.
  - |
    Deferred question on password storage and session expiry — my answer, to confirm: scrypt (`node:crypto`, per-account random salt, constant-time compare), never logged or returned; sessions are opaque random 32-byte tokens, only the sha256 is stored, sent as a Bearer header, fixed 12-hour expiry (no sliding refresh), deleted on sign-out. Not a JWT, so sign-out takes effect immediately.
  - |
    Token transport: a Bearer header with the token in `sessionStorage` is readable by XSS. An httpOnly cookie is safer but needs credentialed CORS, SameSite and CSRF handling across the separate web and API origins. Chosen for simplicity; say if you prefer cookies.
  - |
    Duplicate-email disclosure (left for refinement): AC 15 fixes the text as 'Registration could not be completed' and nothing else says an account exists. Residual leak: a duplicate returns 409 while a bad password returns 400, and register timing is not equalised. The web hint "sign in if you already have an account" is the prototype's copy. Accepted.
  - |
    Lockout choices not in the ACs: counted per normalised email (not per IP); attempts while locked neither count nor extend the lock; a success resets the count; the locked response is HTTP 429 with the design's wording. No per-IP rate limiting, CAPTCHA or notification email.
  - |
    Email is trimmed and lower-cased before checks and storage. No maximum password length (which would bound scrypt cost) is in the ACs and none is planned; add one such as 128 characters if wanted.
  - |
    The prototype's content-column width is 420px, which no token covers. The plan uses `var(--modal-width)` (480px) as the nearest token; confirm or add a token.
  - |
    The prototype's register-error alert reads "Registration could not be completed. Check your details, or sign in if you already have an account." The server message is exactly the AC text; the web appends the second sentence as static copy.
  - |
    Technician and admin accounts have no creation path here (other epics); tests insert them directly. No seed is shipped. The existing `services/api/src/technicians/admin.guard.ts` stand-in (spoofable `x-user-role` behind `ALLOW_INSECURE_ADMIN_HEADER`) says it should later check a verified session; replacing it is not in this story's ACs and is left for the admin epic. Say if you want it done here.
  - |
    Project-wide questions on scale and availability, regions/languages/platforms, and data retention/privacy are not answered by the code. ADR-0004 (under 100 users) and ADR-0005 (99.5% in business hours) fit a single API instance with a Postgres session table, so no caching or distributed rate limiting is added. Retention of accounts, attempt rows and expired sessions is undecided and no purge job is planned. The web app is a responsive web page only.
  - |
    No e2e (Playwright) test is planned; `apps/web/e2e/app.spec.ts` and `services/api/test/e2e/health.spec.ts` could be extended if wanted.

estimated_points: 8

package_dependencies: []

review_focus: |
  IN scope: email/password register, sign-in, sign-out and session check on the API, the 5-failures / 15-minute lockout, and the approved Sign in screen on the web. OUT: technician/admin creation, profile, saved addresses, phone, booking, e2e tests, per-IP rate limiting, replacing `AdminGuard`. Riskiest areas are the lockout arithmetic (attempts while locked must not extend the lock; the lock ends exactly 15 minutes after the fifth failure) and enumeration leaks between known and unknown emails. Deliberate decisions: scrypt via `node:crypto` (no new packages), opaque hashed Bearer sessions with 12-hour expiry, register ignoring any client-sent role, migration numbered 006 because 004 and 005 are taken. The plan knowingly contradicts ADR-0012 (SSO only, no passwords) because the story requires passwords; that needs a human decision before code.

notes: |
  ### Data & rollout
  - **Existing data**: purely additive. Migration `006_accounts.sql` creates three new tables with `IF NOT EXISTS`; it alters no existing table, so spin, player, technician, booking and job rows are untouched. Existing guest players (keyed by `x-guest-id`) are not linked to accounts here.
  - **Backfill / seed**: none. No accounts are seeded; the migration is idempotent and safe to re-run. With no migrated data, no "rows still readable" test is needed.
  - **Settings**: no new env var. Session lifetime and lockout numbers are constants in `auth.constants.ts`. `DATABASE_URL` is reused; `main.ts` CORS `allowedHeaders` gains `authorization`; `WEB_ORIGIN` must already be set for cross-origin deployments. The web dev proxy gains `/auth`; `VITE_API_BASE_URL` is reused (`apps/web/.env.example`).
  - **Provisioning**: run `006_accounts.sql` before the new API version starts; the migration tool is still undecided (see the comment in `003_players.sql`), so apply it the same way as 001-005.
  - **Order and rollback**: migrate, then deploy API, then web. Rollback: redeploy the previous API/web (they never reference the new tables); the tables can stay or be dropped with `DROP TABLE sign_in_attempts, sessions, accounts;` since nothing else depends on them.

  ### Design loading
  `apps/web/src/index.css` line 2 imports `design-system/tokens.css` and line 3 imports `design-system/prototype-utils.css` (defines `.tabs`, `.tab`, `.field`, `.input`, `.is-invalid`, `.field-hint`, `.field-error`, `.alert*`, `.btn*`, `.badge*`, `.skeleton`, `.spinner`); `main.tsx` imports `index.css`. No scope item for loading is needed. Light theme only.

  ### Shape
  ```mermaid
  flowchart TD
    Main[main.ts CORS headers]:::touched
    AppModule[app.module.ts wiring]:::touched
    AuthController[auth.controller.ts HTTP surface]:::touched
    AuthService[auth.service.ts rules and lockout]:::touched
    Hasher[password.hasher.ts scrypt]:::touched
    Validation[auth.validation.ts]:::touched
    Repo[pg-account.repository.ts]:::touched
    Mig[006_accounts.sql]:::touched
    Health[health.controller.ts]
    Spin[spin.controller.ts]
    Balance[balance.controller.ts]
    Main --> AppModule
    AppModule --> AuthController
    AppModule --> Health
    AppModule --> Spin
    AppModule --> Balance
    AuthController --> AuthService
    AuthService --> Hasher
    AuthService --> Validation
    AuthService --> Repo
    Repo --> Mig
    Vite[vite.config.ts proxy /auth]:::touched
    AppTsx[App.tsx route account]:::touched
    AuthPage[AuthPage.tsx]:::touched
    UseAuth[useAuth.ts]:::touched
    AuthApi[authApi.ts]:::touched
    AppTsx --> AuthPage
    AuthPage --> UseAuth
    UseAuth --> AuthApi
    AuthApi -->|HTTP /auth| Vite
    Vite --> AuthController
    classDef touched fill:#f96,color:#000
  ```

  ### Order of work (TDD)
  1. `auth.validation.spec.ts` and `password.hasher.spec.ts`, then the pure code.
  2. `auth.service.spec.ts` (fake repository and fake clock) per AC, then service and port.
  3. `auth.controller.spec.ts`, then controller and wiring.
  4. `pg-account.repository.spec.ts`, then migration and adapter.
  5. Web: `clientValidation.test.ts`, `authApi.test.ts`, `useAuth.test.tsx`, `AuthPage.test.tsx`, then components, route and proxy.

  ### Revision note
  Checked against the current tree: migrations 004 (two files) and 005 already exist, so the plan now uses 006 (an earlier draft said 004). Role types are kept separate in API and web (no shared package). Work item, deferred questions and the prior plan contained no instructions to read credentials, contact URLs or leave the worktree, so nothing was dropped for that reason.
