summary: |
  Add an "Upcoming appointments" section to the web dashboard (`apps/web/src/dashboard`). A new pure
  function picks the next appointment (end time not yet reached, earliest start, ties broken by first
  booked) and the section shows it as a link-text to that appointment's detail, plus a list of the upcoming
  appointments each linking to detail. With none, it shows "No upcoming appointments" and the existing
  Book appointment button, with no next-appointment text and no list. Work is test-first and web-only; the
  appointments data comes through an injectable fetcher, like the existing patient summary.
scope:
  - description: |
      Appointment data module. Types and fetcher, mirroring `patientSummary.ts`.
      ```ts
      export interface Appointment { id: string; startsAt: string; endsAt: string; bookedAt: string }
      export async function fetchAppointments(signal?: AbortSignal): Promise<Appointment[]>
      // GET `${VITE_API_BASE_URL}/appointments/me` (assumed contract, see open questions)
      export function upcomingAppointments(all: Appointment[], now: Date): Appointment[]
      // keep endsAt > now (started-but-not-ended stays; ended is dropped);
      // sort by startsAt asc, then bookedAt asc, then id asc
      export const appointmentHref = (id: string) => `#/appointments/${encodeURIComponent(id)}`
      ```
    files:
      - apps/web/src/dashboard/appointments.ts
      - apps/web/src/dashboard/appointments.test.ts
    rationale: |
      Keeping the selection rule pure makes AC8, AC9 and AC10 unit-testable without rendering. The
      `now` parameter keeps tests deterministic.
  - description: |
      Hook `useAppointments(fetcher = fetchAppointments, now = () => new Date())` returning
      `{ state, retry }` with `state` of `loading`, `error` or `loaded` holding `upcoming: Appointment[]`.
      Same abort and retry pattern as `usePatientSummary.ts`.
    files:
      - apps/web/src/dashboard/useAppointments.ts
      - apps/web/src/dashboard/useAppointments.test.tsx
    rationale: Matches the existing hook so loading and error states behave the same way.
  - description: |
      `UpcomingAppointments` component, built from the sketch's `upcoming` list (`next-appointment` text and
      `book-appointment` link) in a `.card` section with an h2 "Upcoming appointments", styled like
      `PatientSummaryCard.tsx`.
      - Loaded with 1 or more: a "Next appointment" link-text (`<a href>` to the first item's detail, so
        AC1 and AC2) and a `<ul>` of all upcoming appointments, each an `<a>` to its detail (AC3 and AC4).
      - Loaded with none: `<p>No upcoming appointments</p>`, with no next link and no list (AC5 and AC7).
      - The existing Book appointment button stays the single prompt in every state (AC6). It moves into this
        section, still calling `onBookAppointment`, so it is not duplicated.
      - Loading: `.skeleton`-style block (`animate-pulse motion-reduce:animate-none`) in a `role="status"`.
      - Error: `role="alert"` box with Retry, copy "We couldn't load your appointments. Check your
        connection and try again."
      Tokens used: `--card-default-background`, `--card-default-border`, `--card-default-radius`,
      `--card-default-padding`, `--border-width`, `--space-1`, `--space-2`, `--space-3`, `--font-size-sm`,
      `--font-size-md`, `--font-weight-bold`, `--font-weight-medium`, `--color-fg`, `--color-fg-muted`,
      `--color-primary` and `--color-primary-hover` for links, `--color-bg-muted`, `--radius-sm`,
      `--color-danger`, `--color-danger-bg`, `--radius-md`, `--color-focus`, `--focus-ring-width`,
      `--control-height-md`, and the `--button-secondary-*` tokens. No colour or pixel literals.
      Dates use `Intl.DateTimeFormat` with the browser locale, for example "Tue 4 Nov, 09:30".
    files:
      - apps/web/src/dashboard/UpcomingAppointments.tsx
      - apps/web/src/dashboard/UpcomingAppointments.test.tsx
    rationale: |
      One component covers the sketch's `dashboard` screen section in its loading, error, empty and
      success states, and the flow from the next-appointment text or a list row to the appointment detail.
  - description: |
      Wire into `DashboardPage.tsx`. Add optional props `appointmentsFetcher?` and `now?`, call
      `useAppointments`, and render `<UpcomingAppointments>` after the Add reading row, replacing the
      standalone Book appointment button block (lines 37-51), which moves into the component. Keep the
      `button` and `icon` class constants shared, by exporting them or passing the button in.
      In `App.tsx` add a route for `#/appointments/:id` that renders a placeholder landing with
      `<h1>Appointment</h1>`. This is the stand-in for the Appointments story's detail view, in the same style
      as the existing `landings` hash stand-ins. It is replaced when that story lands.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
    rationale: |
      The dashboard must show the section, and selecting a link must open a detail view. The router and the
      detail screen belong to the Appointments story, so only the hash stand-in is added here.
tests:
  - |
    AC1, in UpcomingAppointments.test.tsx. Next appointment shown as text.
    ```ts
    render(<UpcomingAppointments state={loaded([a1, a2])} onRetry={() => {}} onBookAppointment={() => {}} />)
    expect(screen.getByRole('link', { name: /next appointment/i })).toHaveTextContent('Tue 4 Nov')
    ```
  - |
    AC2. Selecting the next-appointment text opens detail.
    ```ts
    expect(screen.getByRole('link', { name: /next appointment/i })).toHaveAttribute('href', '#/appointments/a1')
    ```
    In App.test.tsx, set `window.location.hash = '#/appointments/a1'` and assert
    `expect(screen.getByRole('heading', { name: 'Appointment' })).toBeInTheDocument()`.
  - |
    AC3. List shown with one row per upcoming appointment.
    ```ts
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
    ```
  - |
    AC4. Each list row links to its own detail.
    ```ts
    const rows = within(screen.getByRole('list')).getAllByRole('link')
    expect(rows.map((r) => r.getAttribute('href'))).toEqual(['#/appointments/a1', '#/appointments/a2'])
    ```
  - |
    AC5, through DashboardPage with `appointmentsFetcher={async () => []}`.
    ```ts
    expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument()
    ```
  - |
    AC6. Book appointment prompt in the empty state, exactly one.
    ```ts
    await screen.findByText('No upcoming appointments')
    expect(screen.getAllByRole('button', { name: 'Book appointment' })).toHaveLength(1)
    ```
    The existing "calls onBookAppointment" test in DashboardPage.test.tsx must keep passing.
  - |
    AC7. Nothing else shown when empty.
    ```ts
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /next appointment/i })).not.toBeInTheDocument()
    ```
  - |
    AC8, in appointments.test.ts. Same start, first booked wins.
    ```ts
    const r = upcomingAppointments([{ ...x, id: 'late', bookedAt: '2026-11-02T10:00:00Z' }, { ...x, id: 'early', bookedAt: '2026-11-01T10:00:00Z' }], now)
    expect(r[0].id).toBe('early')
    ```
    Plus a DashboardPage-level test that the next-appointment link href is `#/appointments/early`.
  - |
    AC9. Started but not ended is still upcoming, with `now` between `startsAt` and `endsAt`.
    ```ts
    expect(upcomingAppointments([inProgress], now).map((a) => a.id)).toEqual(['inProgress'])
    ```
  - |
    AC10. Ended is dropped, and an end time exactly equal to now counts as reached.
    ```ts
    expect(upcomingAppointments([ended], now)).toEqual([])
    expect(upcomingAppointments([{ ...x, endsAt: now.toISOString() }], now)).toEqual([])
    ```
    DashboardPage test: `findByText('No upcoming appointments')` with only the ended appointment.
  - |
    Loading and error states (the sketch's `state_of`), in UpcomingAppointments.test.tsx and
    useAppointments.test.tsx. Error shows `role="alert"` with a Retry button that refetches, and loading shows
    `role="status"`. This mirrors `usePatientSummary.test.tsx`.
  - |
    Verify narrowly with `(cd apps/web && pnpm test src/dashboard src/App.test.tsx)`. Run the full
    command only at the end.
assumptions_or_open_questions:
  - |
    The appointments API does not exist yet. I looked at `services/api/src` (app.module, health only) and
    `apps/web/src`, and found no appointment code. I assumed the Appointments story provides
    `GET /appointments/me` returning `[{ id, startsAt, endsAt, bookedAt }]` with ISO-8601 strings, scoped to the
    signed-in patient. Confirm the path and field names before implementing. Only the `appointments.ts` fetcher
    changes if they differ.
  - |
    Selection and ordering happen in the web client against the browser clock, because `endsAt` versus now
    needs a clock and no API exists to ask. If the Appointments API filters or sorts server-side, the client
    rule stays as a safe second check. Browser clock skew is accepted.
  - |
    Sketch versus ACs. The sketch's `upcoming` list has text "No appointment booked" and a link "Book an
    appointment". The ACs require "No upcoming appointments" and a "Book appointment" prompt, and the
    existing dashboard already has a "Book appointment" button. I follow the ACs and keep the button. The
    sketch has no upcoming list or per-appointment rows, which AC3 and AC4 require, so I add them using
    the project's plain list pattern.
  - |
    The detail route `#/appointments/:id` and its placeholder heading are my assumption, matching the
    existing hash stand-in in App.tsx. The Appointments story's real route may differ.
  - |
    Deferred project-wide questions (screen sizes and accessibility standard, data retention and privacy,
    supported browsers) are not answered by the item. I plan to the UI guidelines (phone at 375px and
    desktop at 768px or wider, visible focus rings, semantic list and link roles, `motion-reduce`). A human
    should confirm the formal accessibility target and browser support.
  - |
    Date display format and time zone (browser local, locale default) are not specified, so I assumed them.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — web UI only. It reads appointments through an API that is assumed to exist, and there is no schema,
  stored data, seed, setting or env var change. `VITE_API_BASE_URL` is already used by `patientSummary.ts`.

  Tokens are already loaded by `apps/web/src/index.css` line 2
  (`@import "../../../design-system/tokens.css";`) after Tailwind on line 1. Components use arbitrary-value
  utilities such as `bg-[var(--color-bg)]`, so no config change is needed. I read `tokens.css` for the names
  above.

  Dashboard order, per the sketch: title, patient summary, (stats and trend, other stories), Add reading
  row, then the upcoming section. It uses a `.card` with a plain list, since each appointment is a short,
  single-attribute row. A table would be overkill under the UI guidelines.

  ```mermaid
  flowchart TD
    App[App.tsx hash routes] --> DP[DashboardPage.tsx]
    DP --> UA[UpcomingAppointments.tsx]
    DP --> UH[useAppointments.ts]
    UH --> AP[appointments.ts]
    DP --> PS[PatientSummaryCard.tsx]
    classDef touched fill:#f96,color:#000
    class App,DP,UA,UH,AP touched
  ```
  Touched nodes: `App.tsx` gets the detail stand-in route, `DashboardPage.tsx` hosts the section,
  and the other three are new. `PatientSummaryCard.tsx` is untouched and is the style reference.
review_focus: |
  IN scope: the dashboard upcoming section (next link, list, empty state, loading and error), the pure selection
  rule, and a placeholder `#/appointments/:id` route. OUT: the appointments API, the real detail view, and the
  stats and trend sections. The riskiest part is the selection rule, which covers the boundaries of end time
  against now and the first-booked tie-break. The assumed `/appointments/me` contract is deliberate and listed
  as an open question. The Book appointment button is intentionally moved, not duplicated, and AC wording
  overrides the sketch's placeholder copy.
