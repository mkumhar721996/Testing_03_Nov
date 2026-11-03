summary: |
  Add a read-only "Weight trend" card to the existing dashboard (apps/web/src/dashboard). It plots the
  patient's weight readings for a fixed last 30 days as a line chart (one point per day, at the latest
  reading that day), shows a friendly empty state with an "Add reading" button when there are none,
  offers no range selector and no add/edit/delete controls on the chart itself, and refreshes without a
  page reload when a new reading is saved. Built web-only with an inline SVG chart (no new packages),
  styled with design-system tokens already loaded in apps/web/src/index.css.
scope:
  - description: |
      Pure data helper. Filters readings to the last 30 days, collapses each local calendar day to its
      latest reading, sorts by time ascending.
      ```ts
      export interface WeightReading { id?: string; recordedAt: string /* ISO 8601 */; weightKg: number }
      export interface WeightPoint { day: string /* YYYY-MM-DD, local */; weightKg: number }
      export const TREND_DAYS = 30
      export function toTrendPoints(readings: WeightReading[], now: Date = new Date()): WeightPoint[]
      export async function fetchWeightReadings(signal?: AbortSignal): Promise<WeightReading[]>
      ```
      fetchWeightReadings mirrors fetchPatientSummary (VITE_API_BASE_URL base, throws on non-ok) and calls
      GET /patients/me/readings?type=weight&days=30. The client still filters to 30 days itself, so the
      window does not depend on the server.
    files:
      - apps/web/src/dashboard/weightTrend.ts
      - apps/web/src/dashboard/weightTrend.test.ts
    rationale: |
      Keeps AC1, AC2, AC5 and AC6 in testable pure logic, following the patientSummary.ts / patientSummary.test.ts split.
  - description: |
      Hook `useWeightTrend(fetcher = fetchWeightReadings)` returning `{ state, retry }` with state
      `loading | error | loaded(points)`, same shape and abort handling as usePatientSummary. It also
      subscribes to a window event, `readings:saved`, and refetches (without going back to `loading`,
      so the chart does not flash) when it fires. That is AC9.
    files:
      - apps/web/src/dashboard/useWeightTrend.ts
      - apps/web/src/dashboard/useWeightTrend.test.tsx
    rationale: |
      Mirrors usePatientSummary. The event is the decoupling point with the Reading logging story, which owns the save form.
  - description: |
      Component `WeightTrendCard({ state, onRetry, onAddReading })`. It renders, as a `section` with
      heading "Weight trend" (sketch node `trend` / `trend-heading`):
      - loading: skeleton block with role="status" (like PatientSummaryCard Loading)
      - error: role="alert" box with Retry (like PatientSummaryCard ErrorBox)
      - empty (zero points): `.empty-state` text such as "No weight readings in the last 30 days. Add your first reading to see your trend." plus ONE "Add reading" button (AC7, AC8)
      - loaded: inline SVG polyline/circles chart (`trend-chart`, type line, x label "Date", y label "kg"),
        role="img" with an aria-label summarising the number of points and latest value, plus a visually hidden
        table or list of date and kg values for screen readers. One point (AC6) renders a single circle, with no line.
      There is NO range selector and NO add/edit/delete control on the chart; the only button is the empty-state Add reading (AC3, AC4).
      Tokens used: card: --card-default-background, --card-default-border, --card-default-radius, --card-default-padding,
      --card-default-foreground; text: --font-size-md, --font-size-sm, --font-weight-bold, --color-fg, --color-fg-muted;
      chart line and points: --color-primary, axes/gridlines: --color-border, --color-border-strong; skeleton: --color-bg-muted, --radius-sm;
      error: --color-danger, --color-danger-bg, --radius-md; button: --button-primary-* (empty-state Add reading),
      --button-secondary-* (Retry), --button-default-radius, --control-height-md, --focus-ring-width, --color-focus; spacing: --space-1..--space-4.
      Chart geometry uses viewBox units with width 100% (no raw px colours or sizes); on phone it is single column and fills the card.
      Copy follows the guidelines: sentence case, calm, no exclamation marks.
    files:
      - apps/web/src/dashboard/WeightTrendCard.tsx
      - apps/web/src/dashboard/WeightTrendCard.test.tsx
    rationale: |
      Builds the sketch's `trend` card and its loading, error, empty and success states. Reuses the card, button and state patterns from PatientSummaryCard.tsx.
  - description: |
      Wire into DashboardPage: add optional prop `weightFetcher?: (signal?: AbortSignal) => Promise<WeightReading[]>`,
      call useWeightTrend, and render `<WeightTrendCard>` below PatientSummaryCard and above the existing page-level
      Add reading row. The empty-state button calls the existing `onAddReading` prop, so it uses the existing
      `#/readings/new` flow (sketch flow dashboard-to-log). The sketch's stats grid (`summary`), `upcoming` and header/nav belong to other stories and are not touched.
      Update the App tests' fetch stub so it answers `/patients/me/readings` as well as `/patients/me`.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/App.test.tsx
    rationale: |
      Existing DashboardPage tests pass a `fetcher` that only knows the profile, so weightFetcher must default safely and tests must stub it.
tests:
  - |
    weightTrend.test.ts, AC1 (in-window readings plotted):
    ```ts
    const now = new Date('2026-11-03T12:00:00')
    const pts = toTrendPoints([r('2026-10-20T08:00:00', 80), r('2026-11-01T08:00:00', 79)], now)
    expect(pts.map((p) => p.weightKg)).toEqual([80, 79])
    ```
  - |
    weightTrend.test.ts, AC2 (31 days ago not plotted):
    ```ts
    expect(toTrendPoints([r('2026-10-03T08:00:00', 82)], now)).toEqual([])
    ```
  - |
    WeightTrendCard.test.tsx, AC3 and AC4 (no range selector and no add/edit/delete in loaded state):
    ```ts
    render(<WeightTrendCard state={loaded} onRetry={() => {}} onAddReading={() => {}} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add|edit|delete/i })).not.toBeInTheDocument()
    ```
  - |
    weightTrend.test.ts, AC5 (two readings same day, latest wins):
    ```ts
    const pts = toTrendPoints([r('2026-11-02T07:00:00', 81), r('2026-11-02T19:00:00', 80.4)], now)
    expect(pts).toEqual([{ day: '2026-11-02', weightKg: 80.4 }])
    ```
    plus a WeightTrendCard test asserting exactly one `circle` for that data.
  - |
    weightTrend.test.ts and WeightTrendCard.test.tsx, AC6 (exactly one reading):
    ```ts
    expect(toTrendPoints([r('2026-11-02T07:00:00', 81)], now)).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    ```
  - |
    WeightTrendCard.test.tsx, AC7 (empty state message):
    ```ts
    render(<WeightTrendCard state={{ status: 'loaded', points: [] }} onRetry={() => {}} onAddReading={() => {}} />)
    expect(screen.getByText(/add your first reading/i)).toBeInTheDocument()
    ```
  - |
    WeightTrendCard.test.tsx, AC8 (Add reading button in empty state, calls handler):
    ```ts
    fireEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(onAddReading).toHaveBeenCalledTimes(1)
    ```
    plus a DashboardPage test that the empty state's button reaches `onAddReading`.
  - |
    useWeightTrend.test.tsx, AC9 (chart updates with no reload):
    ```ts
    const fetcher = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([r(todayIso, 80)])
    const { result } = renderHook(() => useWeightTrend(fetcher))
    await waitFor(() => expect(result.current.state).toMatchObject({ status: 'loaded' }))
    act(() => { window.dispatchEvent(new Event('readings:saved')) })
    await waitFor(() => expect(result.current.state).toMatchObject({ status: 'loaded', points: [expect.anything()] }))
    expect(fetcher).toHaveBeenCalledTimes(2)
    ```
    plus a DashboardPage test showing the empty state replaced by the chart after the event.
  - |
    Error and loading states (sketch states, not an AC): hook and card tests for `status: 'error'` showing role="alert" with Retry that calls onRetry, and `status: 'loading'` showing role="status".
  - |
    Narrow run command for each task: `cd apps/web && pnpm vitest run src/dashboard/weightTrend.test.ts` (likewise for the other test files). Finish with the full `(cd services/api && pnpm test) && (cd apps/web && pnpm test)`.
assumptions_or_open_questions:
  - |
    No readings API or reading-logging code exists in this repo yet (I grepped for "reading"/"weight" across the worktree outside node_modules; the API has only health.controller.ts, and the web app has only the dashboard). The plan assumes the Reading logging dependency provides `GET /patients/me/readings?type=weight&days=30` returning `[{ recordedAt, weightKg }]`, and fires `window.dispatchEvent(new Event('readings:saved'))` after a successful save. If its contract differs, only fetchWeightReadings and the event name change. Please confirm the contract, or whether this story should also add the API endpoint.
  - |
    "Last 30 days" is implemented as recordedAt >= now minus 30 x 24h (so a reading 31 days ago is out), and "same day" is the patient's browser-local calendar day. Please confirm; a timezone stored on the patient would change this.
  - |
    The current Add reading destination is a hash-route stub (App.tsx, `#/readings/new`), so AC9 (saving while viewing the chart) cannot be exercised end to end until the real form exists. It is covered here by the event-driven hook test. A true save-flow test belongs to the Reading logging story.
  - |
    Deferred project-wide questions (screen sizes and accessibility standard, data retention and privacy, supported browsers) are not answered by the item. I assumed phone (single column) and desktop layouts per UI-GUIDELINES, a text alternative for the chart, and no data stored client-side. Please confirm.
  - |
    The sketch's chart has axis labels "Date" and "kg" and no explicit y-range; I assume an auto-scaled y-axis with padding around min and max. No design token covers chart height, so the chart scales by viewBox aspect ratio rather than a raw pixel height. Please confirm that is acceptable.
  - |
    tokens.css contains the line `--duration-fast: [object Object];` (a token build bug). The plan does not use that token, so it is out of scope, but it is worth fixing separately.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout
  None — web UI only; no schema, stored data, seed or setting changes. The new request depends on the readings endpoint from the Reading logging story being deployed first. If the fetch fails, the card shows its error state with Retry and the rest of the dashboard is unaffected. Rollback is reverting the commit.

  ### Research
  - Tokens are loaded by `apps/web/src/index.css` line 2 (`@import "../../../design-system/tokens.css";`) with Tailwind v4 (`@tailwindcss/vite` in apps/web/vite.config.ts); components use arbitrary values such as `p-[var(--space-3)]`. No loading work is needed.
  - Stack is react + vite + tailwind + vitest (comp_web_app). No chart library is added: with up to 30 points an inline SVG is enough and avoids a dependency and its jsdom quirks.
  - Sketch coverage: screen `dashboard`, node `trend` card (heading, line chart with x "Date" and y "kg") and flow `dashboard-to-log` (Add reading) are built by the WeightTrendCard and DashboardPage tasks. The other sketch nodes (header/nav, patient summary, stats grid, upcoming) belong to other stories.
  - Sketch vs AC: the sketch shows a page-level primary Add reading button (`log-cta`) that already exists. AC8 adds a second Add reading button inside the empty state. UI-GUIDELINES say one primary button per screen, so the empty-state button uses the same label, but if the reviewer wants strictly one, the empty state could omit it, which AC8 forbids. I follow AC8 and flag this conflict here.

  ```mermaid
  flowchart TD
    App[App.tsx] --> DP[DashboardPage.tsx]
    DP --> PSC[PatientSummaryCard.tsx]
    DP --> WTC[WeightTrendCard.tsx]
    DP --> UWT[useWeightTrend.ts]
    UWT --> WT[weightTrend.ts]
    WTC -. renders points from .-> WT
    classDef touched fill:#f96,color:#000
    class DP,WTC,UWT,WT touched
  ```
  DashboardPage is touched to mount the card and pass the fetcher; WeightTrendCard, useWeightTrend and weightTrend are new.
review_focus: |
  IN: a read-only 30-day weight trend card on the dashboard, with loading, error, empty and success states, and refresh via a `readings:saved` event. OUT: the readings API, the add-reading form, range selection, other dashboard widgets and any chart library. Riskiest areas are the 30-day window and same-day collapsing in toTrendPoints (timezone and boundary), and the assumed API and event contract, which is unverified because nothing exists in the repo. The second Add reading button in the empty state is deliberate (AC8) even though the page already has a primary one.
