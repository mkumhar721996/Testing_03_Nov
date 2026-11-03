summary: |
  Replace the scaffold placeholder in `apps/web` with the Health dashboard as the app's home screen. It has a "Today" h1 and a Patient summary card that shows the patient's name, consultancy and condition from their profile. The card has skeleton loading, an inline error with Retry, and leaves out any missing field (no placeholder). Below it sit the "Add reading" (primary) and "Book appointment" (secondary) entry points, laid out as in the approved prototype. Stats, trend and upcoming appointment stay out of scope: they are separate stories (022, 023, 024). Work is test-first with vitest and Testing Library, one failing test per acceptance criterion, then the minimal React code. The design-system tokens are wired into the app once, in `index.css`.
scope:
  - description: |
      Load the design-system tokens once in the app's entry stylesheet. Today `apps/web/src/index.css` contains only `@import "tailwindcss";` and nothing imports `design-system/tokens.css`. Add the import after the Tailwind import:

      ```css
      @import "tailwindcss";
      @import "../../../design-system/tokens.css";
      ```

      Vite resolves this relative path with no config change. `main.tsx` already imports `./index.css` (line 3). Every component below styles only through `var(--token)`, written as Tailwind arbitrary values, for example `bg-[var(--color-bg)]` and `p-[var(--space-3)]`. There are no hex or px literals.
    files:
      - apps/web/src/index.css
    rationale: |
      The app does not load the tokens yet, so the UI guidelines require adding the import once.
  - description: |
      Patient summary data layer (AC1, 5, 6, 7, 8). Create the types and the fetch client:

      ```ts
      // patientSummary.ts
      export interface PatientSummary { name?: string | null; consultancy?: string | null; condition?: string | null }
      export async function fetchPatientSummary(signal?: AbortSignal): Promise<PatientSummary>

      // usePatientSummary.ts
      export type SummaryState =
        | { status: 'loading' }
        | { status: 'error' }
        | { status: 'loaded'; summary: PatientSummary }
      export function usePatientSummary(fetcher = fetchPatientSummary): { state: SummaryState; retry: () => void }
      ```

      The client calls `GET /patients/me` (approved by the reviewer). The base URL comes from `import.meta.env.VITE_API_BASE_URL` (typed through the `vite/client` types already in `tsconfig.json`) and is never hard-coded. When it is unset, the base falls back to an empty string, so the request is same-origin relative. It trims a trailing slash from the base and treats a non-2xx response as an error.

      ```ts
      const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
      const res = await fetch(`${base}/patients/me`, { signal })
      if (!res.ok) throw new Error(`Patient summary failed: ${res.status}`)
      ```

      The hook starts in `loading` and moves to `loaded` or `error`. `retry()` sets `loading` again and refetches. It ignores stale or unmounted results by using an AbortController or a cancelled flag. A blank or whitespace-only string is treated as missing when the card renders. The fetcher is injectable, so tests never need the network.
    files:
      - apps/web/src/dashboard/patientSummary.ts
      - apps/web/src/dashboard/usePatientSummary.ts
    rationale: |
      Loading, error and retry belong to the data layer. The component stays presentational and easy to test.
  - description: |
      `PatientSummaryCard` component (AC1, 5, 6, 7, 8). It follows the prototype's `section.card[data-wf-id=patient-summary]` with `h2.card-title` "Patient summary" and `aria-busy` matching the loading state.

      - **Loaded:** `.summary-body` is an avatar plus fields. The avatar is a circle showing the initials, `aria-hidden`, 1.5 times `--avatar-size`, with `--color-info-bg` and `--color-info`. It is shown only when a name exists. The name uses `--font-size-lg` and `--font-weight-bold`. The Consultancy row has a muted label (`--color-fg-muted`, `--font-size-sm`) and the value. The Condition row has a muted label and a badge (`--color-bg-muted`, `--radius-full`, `--space-2`). A missing field's whole row, label included, is not rendered.
      - **Loading:** `role="status"`, skeleton avatar and three skeleton lines at 60%, 80% and 40% width in `--color-bg-muted` with `--radius-sm`, and the text "Loading your details". The skeleton pulse is disabled under `prefers-reduced-motion`, so add that media rule.
      - **Error:** `role="alert"` box using `--color-danger-bg`, `--color-danger`, `--radius-md` and `--space-2`/`--space-3`. It has an alert icon, the message "We couldn't load your details. Check your connection and try again.", and a secondary "Retry" button (`--button-secondary-*` tokens, `--control-height-md`).
      - **Focus:** the focus ring uses `--focus-ring-width` and `--color-focus`.

      ```tsx
      export function PatientSummaryCard(props: { state: SummaryState; onRetry: () => void }): JSX.Element
      ```
    files:
      - apps/web/src/dashboard/PatientSummaryCard.tsx
    rationale: |
      Builds the prototype's loaded, loading, error and missing-field states with design-system tokens only.
  - description: |
      `DashboardPage` and app wiring (AC2, 3, 4). `DashboardPage` renders the h1 "Today", then `PatientSummaryCard`, then the entry points.

      - **Add reading:** a `.btn-primary` button with a plus icon, right-aligned in the `cta-row`.
      - **Book appointment:** a secondary button with a calendar icon, in the upcoming-appointment card position at the bottom of the page.
      - **Layout:** `--space-3` gap between blocks and `--content-max-width` on the content.
      - **Props:** the page takes `onAddReading` and `onBookAppointment` callbacks.

      `App.tsx` replaces the "Web App" placeholder with `<DashboardPage />` as the only, default screen, which is the home screen (AC4). Entry points navigate by setting `window.location.hash` to `#/readings/new` and `#/appointments/new`. A small `useRoute` hook reads the hash, and `App` renders the target form when a dependency story supplies it. Until then it renders a minimal labelled landing region with an "Add reading" or "Book appointment" heading, so the "opens" behaviour is observable. Swap this for the real form component and router once the dependency stories land (see the open questions).

      ```tsx
      export function DashboardPage(props: { onAddReading: () => void; onBookAppointment: () => void }): JSX.Element
      ```

      The prototype's stat tiles, trend chart, "No appointment booked" text and prototype state bar are deliberately NOT built.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/App.tsx
    rationale: |
      Gives the patient a home screen with the two entry points, and keeps the entry-point targets swappable for the dependency stories' real forms.
  - description: |
      Document the new setting. Add `apps/web/.env.example` with `VITE_API_BASE_URL=http://localhost:3000` as an example value, with a one-line comment. Do not read or edit `.env.local`.
    files:
      - apps/web/.env.example
    rationale: |
      The API base URL must come from environment configuration, and the new setting needs a documented home.
  - description: |
      Update the scaffold tests. `App.test.tsx` asserts the "Web App" heading and `e2e/app.spec.ts` asserts the same heading, and both break once the placeholder is replaced. Rewrite them for the dashboard.
    files:
      - apps/web/src/App.test.tsx
      - apps/web/e2e/app.spec.ts
    rationale: |
      The placeholder heading no longer exists, so the existing assertions would fail.
tests:
  - |
    AC1 — write first in `apps/web/src/dashboard/PatientSummaryCard.test.tsx`; it fails because the component does not exist yet.
    ```tsx
    render(<PatientSummaryCard state={{ status: 'loaded', summary: { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' } }} onRetry={() => {}} />)
    expect(screen.getByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.getByText('Northside Heart Clinic')).toBeInTheDocument()
    expect(screen.getByText('Hypertension')).toBeInTheDocument()
    ```
  - |
    AC2 — in `DashboardPage.test.tsx`, write the failing test first.
    ```tsx
    const onAddReading = vi.fn()
    render(<DashboardPage onAddReading={onAddReading} onBookAppointment={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(onAddReading).toHaveBeenCalledTimes(1)
    ```
    Then add an `App.test.tsx` case that clicks Add reading and asserts `window.location.hash === '#/readings/new'` and that the Add reading landing heading is visible. `@testing-library/user-event` is not installed, so use `fireEvent.click`, or approve the added dev dependency (see the open questions).
  - |
    AC3 — the same pattern for Book appointment, in `DashboardPage.test.tsx` and `App.test.tsx`.
    ```tsx
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(onBookAppointment).toHaveBeenCalledTimes(1)
    expect(window.location.hash).toBe('#/appointments/new')
    ```
  - |
    Client — in `patientSummary.test.ts`, stub `fetch` and assert the URL is built from the env var.
    ```ts
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'A', consultancy: null, condition: null }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchPatientSummary()
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/patients/me')
    ```
    A non-2xx response (`ok: false`) must reject.
  - |
    AC4 — in `App.test.tsx`, stub the fetcher or `fetch` and assert the dashboard is the default screen.
    ```tsx
    window.location.hash = ''
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
    ```
    Playwright (`e2e/app.spec.ts`): `await page.goto('/')`, then `await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()`, with the profile request mocked via `page.route`.
  - |
    AC5 — in `PatientSummaryCard.test.tsx`, loading shows a status indicator and no profile fields.
    ```tsx
    render(<PatientSummaryCard state={{ status: 'loading' }} onRetry={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading your details')
    expect(screen.queryByText('Condition')).not.toBeInTheDocument()
    ```
    In `usePatientSummary.test.tsx`, use a never-resolving fetcher and `renderHook` to assert `result.current.state.status === 'loading'` on first render.
  - |
    AC6 — `PatientSummaryCard.test.tsx` covers the card, and `usePatientSummary.test.tsx` covers the hook with a rejecting fetcher.
    ```tsx
    render(<PatientSummaryCard state={{ status: 'error' }} onRetry={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your details")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    ```
    Hook:
    ```ts
    const { result } = renderHook(() => usePatientSummary(() => Promise.reject(new Error('x'))))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    ```
  - |
    AC7 — a `DashboardPage` or `App` integration test with a fetcher that rejects first and then resolves.
    ```tsx
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' })
    // render with the injected fetcher
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
    ```
  - |
    AC8 — `PatientSummaryCard.test.tsx`, parameterised with `it.each` over the three fields. The profile has the other two fields, and the absent field's value and label must not render.
    ```tsx
    it.each([['name','Jordan Davies',null],['consultancy','Consultancy','Northside Heart Clinic'],['condition','Condition','Hypertension']])(...)
    expect(screen.queryByText('Consultancy')).not.toBeInTheDocument() // when consultancy is missing
    expect(screen.queryByText('Not set')).not.toBeInTheDocument()
    ```
    Also add cases for `null`, `undefined` and `''` values. When the name is missing, the avatar is not rendered either.
assumptions_or_open_questions:
  - |
    Resolved by the reviewer. The profile endpoint is `GET /patients/me`, returning `{ name, consultancy, condition }` with each a string or null, and all optional. The web app reads the base URL from `VITE_API_BASE_URL`. The endpoint itself does not exist in the API yet (`services/api/src` has only the health controller) and is assumed to come from a dependency story.
  - |
    Resolved by the reviewer. Hash navigation (`#/readings/new`, `#/appointments/new`) is an accepted placeholder until the shell, routing and form stories land. Those stories replace it.
  - |
    Resolved by the reviewer. "Add reading" is the primary button and "Book appointment" is a secondary button, rather than the prototype's anchor styling. The prototype h1 "Today" is kept.
  - |
    Acknowledged by the reviewer. The `--duration-fast` token in `design-system/tokens.css` (line 68) has the invalid value `[object Object]`. It is a design-system defect to be tracked separately, and this story neither uses nor repairs it.
  - |
    AC4 is covered only as "the dashboard is the default screen". Sign-in and auth gating belong to the shell story. The plan adds no guard for unauthenticated users.
  - |
    Agreed by the reviewer. The deferred project-wide questions (accessibility standard, browser support, retention, privacy and breakpoints) stay project-level decisions. For this story the plan uses the UI guideline breakpoints (phone at 375px and below, desktop at 768px and above) and does no client-side caching or persistence of the summary.
  - |
    `@testing-library/user-event` is not installed. The plan uses `fireEvent` from `@testing-library/react` so no new package is needed.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: none. There is no schema or stored-data change, and the profile endpoint is read-only (`GET /patients/me`, provided by a dependency story).
  - **Backfill / seed**: none.
  - **Settings**: one new web env var, `VITE_API_BASE_URL`. Unset, it falls back to same-origin relative requests, which is safe. It is documented in `apps/web/.env.example`.
  - **Provisioning**: the deployed web build needs `VITE_API_BASE_URL` set at build time, and the `/patients/me` endpoint must exist.
  - **Order and rollback**: deploy the endpoint first, then the web build. Rollback is reverting the web build, with nothing to undo in data.

  **Token loading:** today `apps/web/src/index.css` line 1 holds only `@import "tailwindcss";`, and `main.tsx` line 3 imports it. The tokens are not loaded. The plan adds the single `@import` of `design-system/tokens.css` there. Styling follows the stack (Tailwind v4 through `@tailwindcss/vite`, set up in `vite.config.ts`), using arbitrary `var(--token)` values.

  **Prototype elements read (`TESTING-03-NOV-STORY-021-design.html`):** `h1` "Today"; `section.card` Patient summary; `.avatar.summary-avatar` with initials; `.summary-name`; `.summary-row` with a `.label` and either a text value or `.badge`; `#st-loading` skeleton block with "Loading your details"; `#st-error` `.alert-danger` with the message and a `.btn-secondary` "Retry"; and `.btn-primary` "Add reading" with a plus icon in `.cta-row`. The `.btn-secondary` "Book appointment" with a calendar icon sits in the upcoming card, and the `.grid` of stat tiles and `.trend-svg` are placeholders for other stories. Tokens used: `--color-fg`, `--color-fg-muted`, `--color-bg`, `--color-bg-muted`, `--color-border`, `--color-primary`, `--color-primary-hover`, `--color-on-primary`, `--color-danger`, `--color-danger-bg`, `--color-info`, `--color-info-bg`, `--color-focus`, `--space-1` to `--space-4`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`, `--font-size-sm`, `--font-size-lg`, `--font-size-xl`, `--font-weight-bold`, `--font-weight-medium`, `--control-height-md`, `--avatar-size`, `--border-width`, `--focus-ring-width`, `--icon-size`, `--content-max-width`, `--opacity-disabled`, and the `--button-*` and `--card-default-*` tokens.

  **Untrusted input:** the work item, the deferred questions and the empty current plan and feedback contained no instructions that needed refusing.

  ```mermaid
  flowchart TD
    main[main.tsx] --> App[App.tsx]
    main --> css[index.css]
    css --> tokens[design-system/tokens.css]
    App --> Dash[DashboardPage.tsx]
    Dash --> Card[PatientSummaryCard.tsx]
    App --> Hook[usePatientSummary.ts]
    Hook --> Client[patientSummary.ts]
    Client --> API[Patient profile API - dependency story]
    classDef touched fill:#f96,color:#000
    class App,css,Dash,Card,Hook,Client touched
  ```

  Touched nodes are marked in orange. `App.tsx` is touched to make the dashboard the home screen. `index.css` is touched to load the tokens. The other four are new files for the dashboard, the card, the loading and retry hook, and the fetch client.
review_focus: |
  IN scope: the `VITE_API_BASE_URL`-based client for `GET /patients/me`, documented in `.env.example`, and the Patient summary card with its loading, error and retry and missing-field states, the Add reading and Book appointment entry points, the dashboard as the default screen, and the one-time token import in `index.css`. OUT of scope: stats, trend, the upcoming appointment, the app shell and auth, the actual reading and booking forms, and any API or database change. The riskiest area is the assumed patient-profile endpoint and the hash-navigation stand-in for "form opens", both of which depend on stories that have not landed. Entry-point targets are deliberately swappable. Hiding a missing field must remove its label as well, with no placeholder, and styling must use tokens only.
