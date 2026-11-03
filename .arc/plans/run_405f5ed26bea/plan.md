summary: |
  Add an "Upcoming appointments" section to the web dashboard (`apps/web/src/dashboard`). A pure function
  keeps appointments whose end time is not yet reached, sorted by start, then first booked. The section
  shows the first one as a link-text to its detail, plus a list of all upcoming appointments each linking
  to detail. With none it shows "No upcoming appointments" and the Book appointment prompt, with no next
  text and no list. Web-only and test-first. Appointments come through an injectable fetcher, like the
  patient summary. The worktree already holds a first implementation of every file below (read this
  session), so the plan is to pin each AC with a test, confirm the code passes, and close the gaps listed
  under scope item 5.
scope:
  - description: |
      Appointment data module, already present. Confirm it matches this contract and keep it pure.
      ```ts
      export interface Appointment { id: string; startsAt: string; endsAt: string; bookedAt: string }
      export async function fetchAppointments(signal?: AbortSignal): Promise<Appointment[]>
      export function upcomingAppointments(all: Appointment[], now: Date): Appointment[]
      // keep endsAt > now; sort startsAt asc, then bookedAt asc, then id asc
      export const appointmentHref = (id: string) => `#/appointments/${encodeURIComponent(id)}`
      ```
    files:
      - apps/web/src/dashboard/appointments.ts
      - apps/web/src/dashboard/appointments.test.ts
    rationale: |
      A pure rule with an injected `now` makes AC8, AC9 and AC10 unit-testable without rendering.
  - description: |
      Hook `useAppointments(fetcher = fetchAppointments, now = () => new Date())` returning `{ state, retry }`.
      `state` is `loading`, `error` or `loaded` with `upcoming: Appointment[]`. It uses the same abort and
      retry pattern as `usePatientSummary.ts`.
    files:
      - apps/web/src/dashboard/useAppointments.ts
      - apps/web/src/dashboard/useAppointments.test.tsx
    rationale: |
      Matches the existing hook so loading and error behave the same way (sketch `state_of`: loading, error).
  - description: |
      `UpcomingAppointments` component for the sketch's `dashboard` screen, `upcoming` list element
      (`next-appointment` text and `book-appointment` link), in a card section with an h2 "Upcoming appointments".
      Reuses `buttonStyles.ts` (`button`, `icon`) and the styling of `PatientSummaryCard.tsx`. No new shared
      component is needed, since the catalogue only lists BetControl.
      - Loaded with 1 or more: link "Next appointment: <date>" to the first item (AC1, AC2) and a `ul` of
        links to every upcoming appointment (AC3, AC4).
      - Loaded with none: `No upcoming appointments`, with no next link and no list (AC5, AC7).
      - The Book appointment button is always shown, calling `onBookAppointment` (AC6).
      - Loading: `role="status"` skeleton blocks with `animate-pulse motion-reduce:animate-none`.
      - Error: `role="alert"` with copy and a secondary Retry button.
      Tokens: `--card-default-background`, `--card-default-border`, `--card-default-radius`,
      `--card-default-padding`, `--card-default-foreground`, `--border-width`, `--space-1`, `--space-2`,
      `--space-3`, `--font-size-sm`, `--font-size-md`, `--font-weight-bold`, `--font-weight-medium`,
      `--color-fg-muted`, `--color-primary`, `--color-primary-hover`, `--color-bg-muted`, `--radius-sm`,
      `--radius-md`, `--color-danger`, `--color-danger-bg`, `--color-focus`, `--focus-ring-width`,
      `--control-height-md`, `--button-secondary-*`. No colour or pixel literals.
      Dates use `Intl.DateTimeFormat` with the browser locale.
    files:
      - apps/web/src/dashboard/UpcomingAppointments.tsx
      - apps/web/src/dashboard/UpcomingAppointments.test.tsx
    rationale: |
      One component covers the sketch's upcoming element in its loading, error, empty and success states,
      and the flow from the next text or a list row to the appointment detail.
  - description: |
      Wire it into `DashboardPage.tsx`, after the Add reading row. It takes optional `appointmentsFetcher`
      and `now` props, and the Book appointment button lives only inside the section. In `App.tsx`, the
      hash `#/appointments/:id` (not `new`) renders a placeholder landing with `<h1>Appointment</h1>`, in
      the style of the existing `landings` stand-ins.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
    rationale: |
      The dashboard must show the section and a selected link must open a detail view. The real router and
      detail screen belong to the Appointments story.
  - description: |
      Gap check on the existing code. Add only what is missing.
      1. DashboardPage-level tests for AC1 to AC4 (next link text and href, list rows) if absent, since
         DashboardPage.test.tsx currently covers AC5 to AC10 only.
      2. A test that `fetchAppointments` sends no credentials and uses `VITE_API_BASE_URL`, only if the
         existing "returns the list" test does not already assert the URL.
      3. Run `(cd apps/web && pnpm test src/dashboard src/App.test.tsx)`, then the full test command once at the end.
    files:
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/dashboard/appointments.test.ts
    rationale: |
      The implementation predates this plan, so the first step is proving each AC with a test, not rewriting code.
tests:
  - |
    AC1 in UpcomingAppointments.test.tsx and DashboardPage.test.tsx.
    ```ts
    expect(screen.getByRole('link', { name: /next appointment/i })).toBeInTheDocument()
    ```
  - |
    AC2. Next link opens the detail.
    ```ts
    expect(screen.getByRole('link', { name: /next appointment/i })).toHaveAttribute('href', '#/appointments/a1')
    ```
    In App.test.tsx, `window.location.hash = '#/appointments/a1'` renders
    `screen.getByRole('heading', { name: 'Appointment' })`.
  - |
    AC3. One row per upcoming appointment.
    ```ts
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
    ```
  - |
    AC4. Each row links to its own detail.
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
    AC6. Exactly one Book appointment prompt, and it still calls `onBookAppointment`.
    ```ts
    expect(screen.getAllByRole('button', { name: 'Book appointment' })).toHaveLength(1)
    ```
  - |
    AC7. Nothing else shown when empty.
    ```ts
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /next appointment/i })).not.toBeInTheDocument()
    ```
  - |
    AC8 in appointments.test.ts, plus a DashboardPage test that the next link href is `#/appointments/early`.
    ```ts
    expect(upcomingAppointments([lateBooked, earlyBooked], now)[0].id).toBe('early')
    ```
  - |
    AC9. Started but not ended stays upcoming.
    ```ts
    expect(upcomingAppointments([inProgress], now).map((a) => a.id)).toEqual(['inProgress'])
    ```
  - |
    AC10. Ended is dropped, and an end time equal to now counts as reached.
    ```ts
    expect(upcomingAppointments([{ ...x, endsAt: now.toISOString() }], now)).toEqual([])
    ```
    The DashboardPage test finds `No upcoming appointments` when the only appointment has ended.
  - |
    Loading and error states in UpcomingAppointments.test.tsx and useAppointments.test.tsx. Loading shows
    `role="status"`, error shows `role="alert"`, and Retry refetches.
assumptions_or_open_questions:
  - |
    The appointments API was not found. I read `apps/web/src` and found `appointments.ts` calling
    `GET ${VITE_API_BASE_URL}/appointments/me`, returning `[{ id, startsAt, endsAt, bookedAt }]` with ISO-8601
    strings. I did not search `services/api` this session, so confirm the endpoint and field names with the
    Appointments story. Only `fetchAppointments` changes if they differ.
  - |
    Selection and ordering run in the browser against the browser clock, since no API exists to ask. Clock
    skew is accepted. A server-side filter would not conflict with the client rule.
  - |
    Sketch versus ACs. The sketch's `upcoming` element says "No appointment booked" with a link "Book an
    appointment". The ACs require "No upcoming appointments" and a "Book appointment" prompt, so I follow
    the ACs. The sketch has no per-appointment rows, which AC3 and AC4 require, so I use the guidelines'
    plain list pattern. The Book appointment prompt is a secondary button, not a link as in the sketch.
  - |
    The detail route `#/appointments/:id` and its placeholder heading are assumed, matching the existing hash
    stand-ins in App.tsx. The Appointments story's real route may differ.
  - |
    Deferred project-wide questions (screen sizes and accessibility standard, data retention and privacy,
    supported browsers) are unanswered. I plan to the UI guidelines (phone at 375px, desktop at 768px or
    more, visible focus rings, semantic list and link roles, `motion-reduce`). A human should confirm the
    formal accessibility target and browser support.
  - |
    The date format and time zone (browser locale and local time) are not specified, so I assumed them.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — web UI only, no schema, stored data, seed, setting or env var change. `VITE_API_BASE_URL` is
  already used by `patientSummary.ts`.

  Tokens load from `apps/web/src/index.css` line 2 (`@import "../../../design-system/tokens.css";`) after
  Tailwind. Components use arbitrary-value utilities such as `bg-[var(--color-bg)]`, so no config change is
  needed.

  Current state: the worktree already holds `appointments.ts`, `useAppointments.ts`,
  `UpcomingAppointments.tsx`, the `DashboardPage.tsx` wiring, the `App.tsx` detail stand-in and tests for
  each. This plan therefore verifies and fills gaps rather than writing from scratch.

  ```mermaid
  flowchart TD
    App[App.tsx hash routes] --> DP[DashboardPage.tsx]
    DP --> UA[UpcomingAppointments.tsx]
    DP --> UH[useAppointments.ts]
    UH --> AP[appointments.ts]
    UA --> BS[buttonStyles.ts]
    DP --> PS[PatientSummaryCard.tsx]
    classDef touched fill:#f96,color:#000
    class App,DP,UA,UH,AP touched
  ```
  `App.tsx` holds the detail stand-in route, `DashboardPage.tsx` hosts the section, and the other three
  hold the section's logic. `PatientSummaryCard.tsx` and `buttonStyles.ts` are reused unchanged.
review_focus: |
  IN scope: the dashboard upcoming section (next link, list, empty, loading, error), the pure selection
  rule and a placeholder `#/appointments/:id` route. OUT: the appointments API, the real detail view and
  the stats and trend sections. The riskiest part is the selection rule, with end time against now and the
  first-booked tie-break. The assumed `/appointments/me` contract is deliberate, and AC wording overrides
  the sketch's placeholder copy.
