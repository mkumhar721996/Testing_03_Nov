summary: |
  Build the read-only Organization screen (with the sketch's exact colours added as design-system tokens) from the approved prototype (title, reference caption, muted view panel holding one white card with name, address, admin, created by, a tinted finance-contact block, and inert Edit and Delete buttons), backed by real data. The API gets a new `GET /organizations/:id` endpoint reading an `organizations` table in PostgreSQL (new migration 004). The web app gets an `OrganizationPage` reached at hash route `#/organizations/<uuid>`, which follows the stand-in hash routing already in `App.tsx`. The page has the loading skeleton, the error alert with "Try again", and wrapping for long names and addresses. A missing finance email or phone shows a dash. Edit and Delete do nothing, with no toast, since the item says inert.
scope:
  - description: |
      Add the sketch's colours as design-system tokens (reviewer decision: match the sketch exactly). Add to `design-system/tokens.json` (source, W3C format) and the matching custom properties to `design-system/tokens.css` (generated from it, same order), with no change to existing tokens:
      - `color-panel-bg` = `#f4f3ea` (view panel background)
      - `button-edit-background` = `#703030`, `button-edit-background-hover` = `#5a2525`, `button-edit-border` = `{button-edit-background}`
      - `button-delete-background` = `#905050`, `button-delete-background-hover` = `#7a4141`, `button-delete-border` = `{button-delete-background}`
      - `button-edit-foreground` and `button-delete-foreground` = `{color-on-primary}`
      ```css
      --color-panel-bg: #f4f3ea;
      --button-edit-background: #703030;
      --button-edit-background-hover: #5a2525;
      --button-edit-border: var(--button-edit-background);
      --button-edit-foreground: var(--color-on-primary);
      --button-delete-background: #905050;
      --button-delete-background-hover: #7a4141;
      --button-delete-border: var(--button-delete-background);
      --button-delete-foreground: var(--color-on-primary);
      ```
      The hex values are the prototype's sampled `--ref-*` values and live only in the token files. The page styles reference the tokens, never hex.
    files:
      - design-system/tokens.json
      - design-system/tokens.css
    rationale: |
      The sketch's maroon Edit, rose Delete and beige panel have no existing token. The reviewer asked for exact matching, so new tokens are added once in the design system, and the app's `index.css` already imports `tokens.css`.
  - description: |
      Migration `004_organizations.sql`, tool-neutral like 003. Table `organizations`:
      `id uuid PRIMARY KEY, name text NOT NULL, address text NOT NULL, admin_name text NOT NULL, admin_email text NOT NULL, created_by text NOT NULL, finance_contact_role text NOT NULL, finance_contact_name text NOT NULL, finance_contact_email text NULL, finance_contact_phone text NULL, created_at timestamptz NOT NULL DEFAULT now()`.
      Email and phone are nullable so ACs 12 and 13 are real data states.
    files:
      - services/api/migrations/004_organizations.sql
    rationale: |
      The prototype's sample data is not scope; the screen needs stored data. A new table means no existing rows are touched.
  - description: |
      API read path, mirroring the `player` module (repository interface with an injection token, Pg implementation, controller).
      ```ts
      export interface Organization {
        id: string; name: string; address: string;
        admin: { name: string; email: string };
        createdBy: string;
        financeContact: { role: string; name: string; email: string | null; phone: string | null };
      }
      export interface OrganizationRepository { findById(id: string): Promise<Organization | null> }
      export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY')
      // OrganizationController: @Controller('organizations') @Get(':id') get(@Param('id') id: string): Promise<Organization>
      ```
      The controller throws `BadRequestException` for a non-uuid id and `NotFoundException` for null. Register the controller and a `useFactory` provider in `app.module.ts`, built like `PLAYER_REPOSITORY` and throwing when `DATABASE_URL` is unset. Reuse the uuid check style from `player/guest-id.ts`.
    files:
      - services/api/src/organization/organization.repository.ts
      - services/api/src/organization/pg-organization.repository.ts
      - services/api/src/organization/organization.controller.ts
      - services/api/src/app.module.ts
    rationale: |
      The data must come from the project's own backend (comp_application_api, NestJS and PostgreSQL). Reading by id is the only access needed; there is no list, create, edit or delete.
  - description: |
      Web data layer, mirroring `balance/playerBalance.ts` and `balance/useBalance.ts`.
      ```ts
      export async function fetchOrganization(id: string, signal?: AbortSignal): Promise<Organization>
      export type OrganizationState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; organization: Organization }
      export function useOrganization(id: string, fetcher = fetchOrganization): { state: OrganizationState; retry: () => void }
      ```
      It uses `VITE_API_BASE_URL` like `fetchBalance`. A non-2xx response throws, which gives the error state. The hook refetches when `id` changes.
    files:
      - apps/web/src/organization/organizationApi.ts
      - apps/web/src/organization/useOrganization.ts
    rationale: |
      Reuses the project's existing fetch-hook pattern, so loading, error and retry behave like the balance code.
  - description: |
      `OrganizationPage` per the prototype screen "Organization" (read from the design HTML):
      - `h1` "Organization" and the caption paragraph "UI REFERENCE — VIEW PANEL WITH FC SECTION", muted colour and md size.
      - `.view-box` panel (background `--color-panel-bg`, border `--border-width`/`--color-border`, `--radius-md`, padding `--space-4`) holding one `.card` (`--radius-lg`, padding `--space-4`, text `--font-size-lg`).
      - Fields stacked label-over-value, gap `--space-1`. Labels are `--color-fg-muted` and `--font-size-md`. Name is an `h2` at `--font-size-xl`. All values use `overflow-wrap: anywhere` and `min-width: 0` so long text wraps (ACs 14, 15).
      - Admin: name (link-styled, `--color-primary`) plus email in an inline wrap row. Created by: name.
      - Finance-contact block: background `--color-info-bg`, text `--color-info`, `--radius-md`, padding `--space-3`. It holds the role, the name as an `h3` at `--font-size-xl`, and email as `mailto:` and phone as `tel:` links separated by "·". An absent value renders `—` with `role="img"` and `aria-label="No finance contact email"` or `"No finance contact phone"` (ACs 12, 13).
      - Actions, gap `--space-3`: "Edit" (`.btn .btn-primary`, icon edit) then "Delete" (`.btn .btn-secondary`, icon trash), min 44px, `--font-size-lg`, `--control-height-lg`. Edit overrides the class colours with `--button-edit-background/-hover/-border/-foreground`, Delete with `--button-delete-*`, via Tailwind arbitrary values (`bg-[var(--button-edit-background)] hover:bg-[var(--button-edit-background-hover)]`). The class names stay so tests and semantics match the design's primary and secondary. Both are `type="button"` with no handler (ACs 10, 11).
      - Loading: `role="status"` with `aria-label="Loading organization details"` and `.skeleton` bars as in the prototype.
      - Error: `.alert .alert-danger` with `role="alert"`, "We couldn’t load this organization." and a `.btn .btn-secondary` "Try again" calling `retry`.
      Styling uses Tailwind arbitrary values on the tokens, as `App.tsx` and `SlotGamePage.tsx` do, plus the existing `.card`, `.btn*`, `.alert*` and `.skeleton` classes. These are defined in `design-system/prototype-utils.css`, which `index.css` already imports. The person links (Admin, Created by) render as plain text styled with `--color-primary`, with no href, because profile screens are out of scope.
    files:
      - apps/web/src/organization/OrganizationPage.tsx
    rationale: |
      Builds the approved design. The catalogue has only `BetControl`, which does not fit, so the prototype's new FieldGroup and ContactBlock become small local components in this file rather than new shared components.
  - description: |
      Route the page. Add to `App.tsx` a matcher for `#/organizations/<uuid>` (regex `^#/organizations/([0-9a-f-]{36})$`) rendering `<OrganizationPage organizationId={id} />`, placed before the dashboard fallback. This is the same hash stand-in as the existing `#/slot` route.
    files:
      - apps/web/src/App.tsx
    rationale: |
      Answers the deferred question: with no list or navigation built, the organization is chosen by id in the URL.
tests:
  - |
    AC1-6 (API). `services/api/src/organization/organization.controller.spec.ts` uses a fake repository, as `balance.controller.spec.ts` does.
    ```ts
    expect(await controller.get(id)).toEqual({ id, name: 'Alain Leroy Locke College Prep Academy', address: '325 E 111th St, Los Angeles CA 90061', admin: { name: 'Karishmah', email: 'karishmah@gmail.com' }, createdBy: 'Daniel Gonzalez Bermudez', financeContact: { role: 'Fundraising Consultant', name: 'Morgan Gould', email: 'mgould@wfchocolate.com', phone: '(555) 218-4400' } })
    ```
  - |
    AC12-13 (API). A stored organization with null finance email and phone returns them as `null`, not dropped or empty.
    ```ts
    expect((await controller.get(id)).financeContact).toMatchObject({ email: null, phone: null })
    ```
  - |
    Error handling (API). An unknown id gives 404 and a malformed id gives 400.
    ```ts
    await expect(controller.get(randomUUID())).rejects.toBeInstanceOf(NotFoundException)
    await expect(controller.get('nope')).rejects.toBeInstanceOf(BadRequestException)
    ```
  - |
    Repository (API). `pg-organization.repository.spec.ts` runs `describe.skipIf(!url)` with `TEST_DATABASE_URL`, like `pg-player.repository.spec.ts`. It applies migrations 001 to 004, inserts a row, and checks `findById` maps the snake_case columns to the nested shape, returns null FC email and phone for NULL columns, and returns null for an unknown id.
  - |
    AC1-6 (web). `OrganizationPage.test.tsx` passes a fake fetcher through the page's `fetcher` prop, defaulting to `fetchOrganization` like `useBalance`.
    ```ts
    expect(await screen.findByRole('heading', { name: 'Alain Leroy Locke College Prep Academy' })).toBeInTheDocument()
    expect(screen.getByText('325 E 111th St, Los Angeles CA 90061')).toBeInTheDocument()
    expect(screen.getByText('Karishmah')).toBeInTheDocument()
    expect(screen.getByText('karishmah@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('Daniel Gonzalez Bermudez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'mgould@wfchocolate.com' })).toHaveAttribute('href', 'mailto:mgould@wfchocolate.com')
    expect(screen.getByRole('link', { name: '(555) 218-4400' })).toHaveAttribute('href', 'tel:+15552184400')
    ```
  - |
    AC7 (web). The screen shows the title, the reference caption and the view panel in order.
    ```ts
    expect(screen.getByRole('heading', { level: 1, name: 'Organization' })).toBeInTheDocument()
    expect(screen.getByText('UI REFERENCE — VIEW PANEL WITH FC SECTION')).toBeInTheDocument()
    expect(screen.getByText('Fundraising Consultant')).toBeInTheDocument()
    ```
  - |
    AC8-9 (web). Edit and Delete are shown, Edit as primary and Delete as secondary.
    ```ts
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass('btn-primary')
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-secondary')
    ```
  - |
    AC10-11 (web). Clicking Edit or Delete changes nothing and opens nothing: the details are unchanged, `window.location.hash` is unchanged, and no extra `fetch` call is made.
    ```ts
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(window.location.hash).toBe(before)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(screen.getByText('325 E 111th St, Los Angeles CA 90061')).toBeInTheDocument()
    ```
    The same test runs for Delete.
  - |
    AC12-13 (web). With null finance email and phone, dashes with the accessible labels replace them.
    ```ts
    expect(screen.getByRole('img', { name: 'No finance contact email' })).toHaveTextContent('—')
    expect(screen.getByRole('img', { name: 'No finance contact phone' })).toHaveTextContent('—')
    ```
  - |
    AC14-15 (web). A 120-character name and a 120-character address are in the document in full, and their elements carry the wrap class (`[overflow-wrap:anywhere]`). jsdom does no layout, so the class is asserted, and the wrapped look is covered by the Playwright check below.
    ```ts
    expect(screen.getByRole('heading', { name: longName })).toHaveClass('[overflow-wrap:anywhere]')
    expect(screen.getByText(longAddress)).toHaveClass('[overflow-wrap:anywhere]')
    ```
  - |
    Loading and error states (web). `useOrganization.test.tsx` mirrors `useBalance.test.tsx`: loading, then loaded; a rejected fetch gives `{ status: 'error' }`; `retry()` recovers. A page test shows the status `Loading organization details` first, then the alert "We couldn’t load this organization." with a "Try again" button that refetches.
  - |
    Routing (web). `App.test.tsx` sets `window.location.hash = '#/organizations/<uuid>'` and expects the Organization heading. It also checks that `#/slot` and the dashboard still render.
  - |
    Tokens (web). No separate token-file test is planned; the page test asserts the buttons reference the tokens, not hex.
    ```ts
    expect(screen.getByRole('button', { name: 'Edit' }).className).toContain('var(--button-edit-background)')
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('var(--button-delete-background)')
    ```
  - |
    End to end (Playwright, comp_web_app). Open `#/organizations/<seeded id>` against the API and DB with a long-name row, and assert that the full text is visible, wrapped and not clipped (`scrollWidth <= clientWidth` on the card). Run it narrowly with the project's Playwright config for that one spec file.
assumptions_or_open_questions:
  - |
    Reviewer decision: no seed. No organizations data exists in the repo and the plan adds no seed row, so until rows are inserted by hand the screen only shows the error state. The Playwright test inserts its own rows.
  - |
    Deferred question answered. The details come from `GET /organizations/:id` over PostgreSQL. The organization is chosen by the uuid in the URL hash `#/organizations/<uuid>`. No list or navigation is built, per scope.
  - |
    Reviewer decision: match the sketch's colours exactly. The prototype's `--ref-*` hex values become new tokens in `design-system/tokens.json` and `tokens.css` (first scope item). The token names are my choice and can be renamed in review.
  - |
    The prototype's app shell (top bar, sidebar, footer) is not built, and the item scopes this to the Organization screen only, so it is left out. The UI guidelines would put the screen under Items. Existing pages (`SlotGamePage`) also render without a shell.
  - |
    The prototype shows a toast when Edit or Delete is clicked, and when a person link is clicked. The ACs say inert with no other screen opening, so the plan adds no toast and no handlers. Admin and Created by names are plain styled text, not links.
  - |
    The prototype shows the finance contact's role, name, email and phone, but ACs 5 and 6 only require email and phone. Role and name are stored and shown as in the sketch, and are assumed non-null.
  - |
    A 404 (unknown id) and a 400 (malformed id) both show the same error state, "We couldn’t load this organization." The design has no separate not-found state.
  - |
    Reviewer decision: access checks are not required. The endpoint applies no authentication, tenant or role checks (ADR-0010, 0011, 0012), as the existing endpoints use only an `x-guest-id`.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: new table only, so no existing rows are touched. `004_organizations.sql` uses `CREATE TABLE IF NOT EXISTS`.
  - **Backfill / seed**: none planned. Whether to seed the sketch's organization is an open question above.
  - **Settings**: none new. The API already requires `DATABASE_URL`, and the web app uses the existing `VITE_API_BASE_URL`.
  - **Provisioning**: the migration must be applied by whatever runs migrations today (tool-neutral SQL files, per the note in 003).
  - **Order and rollback**: apply migration 004, then deploy the API, then the web app. Rollback is `DROP TABLE organizations`; leaving the empty table in place is also safe, since nothing else reads it.

  Design tokens are already loaded: `apps/web/src/index.css:2-3` imports `design-system/tokens.css` and `design-system/prototype-utils.css`, after `@import "tailwindcss"`, and `main.tsx` imports `index.css`. The classes `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.alert`, `.alert-danger` and `.skeleton` are defined in `prototype-utils.css`, so no new stylesheet import is needed. The new tokens are added once to those same two files (first scope item). Tokens used: `--color-panel-bg`, `--button-edit-*`, `--button-delete-*`, `--space-1/2/3/4`, `--radius-md/lg`, `--border-width`, `--color-border`, `--color-fg`, `--color-fg-muted`, `--color-bg-muted`, `--color-primary`, `--color-info`, `--color-info-bg`, `--font-size-md/lg/xl`, `--font-weight-bold`, `--control-height-lg`.

  ```mermaid
  flowchart TD
    URL["#/organizations/uuid"] --> App["App.tsx useRoute"]
    App --> Page["OrganizationPage"]
    Page --> Hook["useOrganization"]
    Hook --> Fetch["organizationApi fetchOrganization"]
    Fetch --> Ctl["OrganizationController GET :id"]
    Ctl --> Repo["PgOrganizationRepository"]
    Repo --> DB[("organizations table, migration 004")]
    Mod["app.module.ts"] --> Ctl
    classDef touched fill:#f96,color:#000
    class App,Page,Hook,Fetch,Ctl,Repo,DB,Mod touched
  ```

  Every node is new or modified by this plan. It mirrors the existing balance path (`useBalance`, `playerBalance`, `BalanceController`, `PgPlayerRepository`, `003_players.sql`).
review_focus: |
  IN: the single read-only Organization screen, `GET /organizations/:id`, the `organizations` table, the hash route, and new colour tokens for the sketch's panel and Edit/Delete buttons. OUT: list, edit, delete, shell, person profiles, toasts, seed data and access checks (all reviewer-confirmed). The riskiest parts are the data source (no seed, so the screen shows the error state until rows exist) and keeping `tokens.json` and `tokens.css` in sync; the hex values appear only in those two files. Edit and Delete are deliberately handler-free per AC10 and 11, even though the prototype toasts.
