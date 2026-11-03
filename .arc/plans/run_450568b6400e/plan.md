summary: |
  Add a "Today's stats" section to the existing Health dashboard (`DashboardPage`): five read-only tiles (weight, blood pressure, blood sugar, heart rate, steps). Each tile shows the most recent reading logged on the patient's local calendar date, an out-of-range flag when that reading falls outside a plausible range, "—" plus a "Log a reading" prompt when nothing is logged (steps shows 0), and updates without a reload when a reading is saved. The work is web-app only (React + Vite + Tailwind with design-system tokens, vitest). Pure logic (local-day bounds, latest-per-type selection, plausible-range check, display formatting) is isolated in a tested module; a thin hook fetches readings and subscribes to a "reading saved" event.
scope:
  - description: |
      Domain module: types and pure functions. Signatures:
      ```ts
      export type ReadingType = 'weight' | 'bloodPressure' | 'bloodSugar' | 'heartRate' | 'steps'
      export interface Reading { id: string; type: ReadingType; loggedAt: string /* ISO instant */; value?: number; systolic?: number; diastolic?: number }
      export const READING_TYPES: ReadingType[]
      export const PLAUSIBLE_RANGE: Record<Exclude<ReadingType, 'bloodPressure'>, { min: number; max: number }> & { systolic: {min:number;max:number}; diastolic: {min:number;max:number} }
      export function localDayBounds(now: Date): { from: string; to: string }   // local 00:00 inclusive to next local 00:00 exclusive, as ISO instants
      export function isOnLocalDay(loggedAt: string, now: Date): boolean
      export function latestPerType(readings: Reading[], now: Date): Record<ReadingType, Reading | undefined>
      export function isOutOfRange(r: Reading): boolean
      export function tileModel(type: ReadingType, latest: Reading | undefined): { label: string; display: string; unit: string; empty: boolean; flagged: boolean }
      ```
      Steps with no reading gives display "0", empty false; other types with no reading give display "—", empty true.
    files:
      - apps/web/src/dashboard/stats/todayStats.ts
      - apps/web/src/dashboard/stats/todayStats.test.ts
    rationale: |
      Covers AC 5-10 as pure, easily tested logic. Local-date filtering is done with the browser's local day so AC10 holds regardless of server timezone.
  - description: |
      Data access and live update. `fetchTodayReadings(now: Date, signal?: AbortSignal): Promise<Reading[]>` calls `GET {VITE_API_BASE_URL}/readings?from=<iso>&to=<iso>` (same base-URL pattern as `fetchPatientSummary` in `apps/web/src/dashboard/patientSummary.ts`) and re-applies `isOnLocalDay` client side as a guard. A tiny pub/sub `readingEvents.ts` exposes `publishReadingSaved(reading: Reading)` and `subscribeReadingSaved(fn): () => void`. Hook `useTodayStats(fetcher = fetchTodayReadings, now = () => new Date())` returns `{ state: {status:'loading'} | {status:'error'} | {status:'loaded', readings: Reading[]}, retry }`, mirrors the abort/retry shape of `usePatientSummary.ts`, and merges a saved reading into state when the event fires (only if it is on the local day; keep the existing list otherwise), with no refetch and no reload.
    files:
      - apps/web/src/dashboard/stats/todayReadings.ts
      - apps/web/src/dashboard/stats/readingEvents.ts
      - apps/web/src/dashboard/stats/useTodayStats.ts
      - apps/web/src/dashboard/stats/useTodayStats.test.tsx
    rationale: |
      AC 2 and AC 11. The reading-logging story is not merged (no readings code in the repo, see notes), so a minimal event seam is defined here for it to call after a successful save.
  - description: |
      UI components `TodayStatsTiles` (section with h2 "Today's stats", responsive grid, loading and error states) and `StatTile` (one `.card`-style tile). Sketch mapping: dashboard `summary` grid (columns 3, phone_columns 1) holding `stat-*` tiles; the sketch only draws `stat-steps` as a sample, and the five tiles repeat that shape. States built: loading (skeleton tiles, role status, aria-busy), error (role alert, "We couldn't load today's stats. Check your connection and try again." with a Retry secondary button), success. Each tile renders label, value, unit, and either an out-of-range flag (a badge with text "Out of range" plus an icon, never colour alone) or, for empty non-steps types, "—" with a "Log a reading" link-style button calling `onAddReading`. Tiles are non-interactive: a plain `section`/`div`, no onClick, no tabIndex, no edit/delete controls (the only button is the empty-state prompt, which navigates to log and does not alter the figure).
      Tokens: tile `--card-default-background`, `--card-default-foreground`, `--card-default-border`, `--card-default-radius`, `--card-default-padding`, `--border-width`; label `--font-size-sm` and `--color-fg-muted`; value `--font-size-xl` and `--font-weight-bold`; flag `--color-danger`, `--color-danger-bg`, `--radius-full`, `--space-1`, `--space-2`, `--font-size-sm`, `--font-weight-medium`; skeleton `--color-bg-muted`, `--radius-sm`; error box `--color-danger`, `--color-danger-bg`, `--radius-md`; prompt button `--button-secondary-border`, `--button-secondary-background`, `--button-secondary-background-hover`, `--button-secondary-foreground`, `--button-default-radius`, `--control-height-md`, `--focus-ring-width`, `--color-focus`; gaps `--space-3` between tiles, `--space-4` between sections; grid `--grid-min-column` via `repeat(auto-fit, minmax(var(--grid-min-column), 1fr))` giving 3 columns on desktop and 1 on phone. Reuse the arbitrary-value Tailwind style and the skeleton/error patterns from `PatientSummaryCard.tsx`. No hex or px literals.
    files:
      - apps/web/src/dashboard/stats/TodayStatsTiles.tsx
      - apps/web/src/dashboard/stats/StatTile.tsx
      - apps/web/src/dashboard/stats/TodayStatsTiles.test.tsx
    rationale: |
      AC 1, 3, 4, 5, 6, 7, 8, 9 rendering plus the sketch's loading, error and success states.
  - description: |
      Wire into `DashboardPage`: add optional props `statsFetcher?: (signal?: AbortSignal) => Promise<Reading[]>` (default `fetchTodayReadings`-based) and render `<TodayStatsTiles onAddReading={onAddReading} .../>` between `PatientSummaryCard` and the Add reading row, matching the sketch order (title, patient-summary, summary grid, trend, log-cta). The weight trend chart, next-appointment and Book appointment are out of scope (other stories); existing tests keep passing, so default `statsFetcher` in existing tests is stubbed in `DashboardPage.test.tsx`.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
    rationale: |
      Entry point for AC 1 and the "Add reading" flow `dashboard-to-log`, which already exists and is reused unchanged.
tests:
  - |
    AC1 (TodayStatsTiles.test.tsx) — five tiles:
    ```ts
    render(<TodayStatsTiles state={{ status: 'loaded', readings: [] }} onRetry={noop} onAddReading={noop} />)
    for (const name of ['Weight', 'Blood pressure', 'Blood sugar', 'Heart rate', 'Steps'])
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(5)
    ```
  - |
    AC2 — each tile shows today's figure:
    ```ts
    expect(within(tile('Weight')).getByText('72.4')).toBeInTheDocument()
    expect(within(tile('Blood pressure')).getByText('120/80')).toBeInTheDocument()
    expect(within(tile('Blood sugar')).getByText('5.6')).toBeInTheDocument()
    expect(within(tile('Heart rate')).getByText('68')).toBeInTheDocument()
    expect(within(tile('Steps')).getByText('8,200')).toBeInTheDocument()
    ```
  - |
    AC3 — tapping does not change the figure:
    ```ts
    const before = tile('Weight').textContent
    await user.click(tile('Weight'))
    expect(tile('Weight').textContent).toBe(before)
    ```
  - |
    AC4 — no edit or delete control on any tile (with all five populated):
    ```ts
    for (const el of screen.getAllByRole('region'))
      expect(within(el).queryByRole('button', { name: /edit|delete|remove/i })).toBeNull()
    ```
  - |
    AC5 — out-of-range latest reading is flagged (pure and render):
    ```ts
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: now, value: 250 })).toBe(true)
    expect(within(tile('Heart rate')).getByText('250')).toBeInTheDocument()
    expect(within(tile('Heart rate')).getByText('Out of range')).toBeInTheDocument()
    ```
    Also blood pressure flagged when either systolic or diastolic is outside its range.
  - |
    AC6 — in-range latest reading has no flag; boundaries inclusive:
    ```ts
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: now, value: 68 })).toBe(false)
    expect(within(tile('Heart rate')).queryByText('Out of range')).toBeNull()
    ```
    Also an older out-of-range reading followed by a newer in-range one shows no flag.
  - |
    AC7 — missing weight, blood pressure, blood sugar or heart rate (each tested via `it.each`):
    ```ts
    expect(within(tile(label)).getByText('—')).toBeInTheDocument()
    expect(within(tile(label)).getByRole('button', { name: 'Log a reading' })).toBeInTheDocument()
    ```
    Clicking the prompt calls `onAddReading` once.
  - |
    AC8 — no steps today shows 0 and no prompt:
    ```ts
    expect(within(tile('Steps')).getByText('0')).toBeInTheDocument()
    expect(within(tile('Steps')).queryByText('—')).toBeNull()
    ```
  - |
    AC9 (todayStats.test.ts) — latest of several wins by loggedAt, not array order:
    ```ts
    const r = latestPerType([w(70, '08:00'), w(72, '19:00'), w(71, '12:00')], now)
    expect(r.weight?.value).toBe(72)
    ```
  - |
    AC10 (todayStats.test.ts) — local-date filtering around midnight, run under a fixed TZ via `vi.stubEnv('TZ', ...)` or constructing local-time Dates:
    ```ts
    const now = new Date(2026, 10, 3, 12, 0)
    expect(isOnLocalDay(new Date(2026, 10, 3, 0, 0, 0).toISOString(), now)).toBe(true)
    expect(isOnLocalDay(new Date(2026, 10, 2, 23, 59, 59).toISOString(), now)).toBe(false)
    expect(isOnLocalDay(new Date(2026, 10, 4, 0, 0, 0).toISOString(), now)).toBe(false)
    ```
    Plus a useTodayStats test that the fetcher is called with `localDayBounds(now)`-derived from and to, and that a reading outside the day returned by the fetcher is ignored.
  - |
    AC11 (useTodayStats.test.tsx and DashboardPage.test.tsx) — saving updates the tile with no reload and no refetch:
    ```ts
    const fetcher = vi.fn().mockResolvedValue([])
    render(<DashboardPage statsFetcher={fetcher} fetcher={async () => profile} onAddReading={noop} onBookAppointment={noop} />)
    expect(await within(await tileAsync('Weight')).findByText('—')).toBeInTheDocument()
    act(() => publishReadingSaved({ id: 'n', type: 'weight', loggedAt: new Date().toISOString(), value: 73.1 }))
    expect(within(tile('Weight')).getByText('73.1')).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(1)
    ```
    Also an event for a reading from a different local day leaves the tile unchanged, and unsubscribe runs on unmount.
  - |
    Loading and error states (sketch `state_of`) — skeleton with role status while loading; on rejection role alert with a Retry button that refetches and recovers (mirrors the existing "recovers via Retry" test in DashboardPage.test.tsx).
  - |
    Narrow runner command for each task: `(cd apps/web && pnpm test src/dashboard/stats/todayStats.test.ts)`, likewise for the other test files; run the full `(cd services/api && pnpm test) && (cd apps/web && pnpm test)` at the end.
assumptions_or_open_questions:
  - |
    The reading-logging story is not merged: a Grep for "reading" in the repo (excluding node_modules) matches only the existing Add reading button wiring in `DashboardPage.tsx` and `App.tsx` and their tests. There is no readings API, entity or form. This plan assumes a contract `GET /readings?from=<iso>&to=<iso>` returning `Reading[]` (shape in scope item 1) and a `publishReadingSaved(reading)` call from the future save handler. A human should confirm the real endpoint and payload with the reading-logging story, or tell me to build that endpoint here (which would be a larger scope in `services/api`).
  - |
    Plausible ranges are not stated anywhere in the item. Proposed defaults, held in one `PLAUSIBLE_RANGE` constant for easy change: weight 20-300 kg, blood pressure systolic 70-250 and diastolic 40-150 mmHg, blood sugar 2-30 mmol/L, heart rate 30-220 bpm, steps 0-100000. Bounds inclusive. Please confirm values and units (kg and mmol/L versus lb and mg/dL).
  - |
    AC5 and AC6 speak of "the most recent reading", so the flag is judged on the latest reading only. Steps is included in the range check (a reading, not a sum). Open point: is the steps figure the latest reading or a daily total? AC9 says latest reading for every type, so the plan follows AC9 and shows the latest steps reading, not a sum.
  - |
    The sketch draws one sample tile (`stat-steps`, value 8,200) in a grid with `columns: 3` and `repeat: 3`, while AC1 requires five tiles. Treated as five tiles in the same grid (3 columns desktop, 1 on phone, so rows of 3 and 2). The sketch also shows the profile patient-summary as name, consultancy and disease, which the existing card already covers and is not touched.
  - |
    Display formatting assumed: weight with one decimal and "kg", blood pressure "sys/dia" with "mmHg", blood sugar one decimal and "mmol/L", heart rate "bpm", steps with thousands separator. Unit strings are display-only constants in `todayStats.ts`.
  - |
    Deferred project-wide questions (screen sizes and accessibility standard, data retention and privacy, supported browsers) are not answered by the item. The plan follows the UI guidelines (phone at 375px and desktop at 768px, single column on phone) and basic accessibility (text label on the flag, role status and alert, visible focus ring), and does not assume a specific WCAG level or browser matrix. No data is stored or logged by this change.
  - |
    The signed-in patient identity comes from the app shell story; the tiles call the readings endpoint for the current patient the same way `fetchPatientSummary` calls `/patients/me`, with no patient id in the client.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — read-only UI over an assumed existing readings endpoint; no schema, stored data, seed, setting or env var is added (it reuses the existing `VITE_API_BASE_URL`).

  ### Design-system wiring

  Tokens load through `apps/web/src/index.css` line 2: `@import "../../../design-system/tokens.css";` after `@import "tailwindcss";` (line 1). Existing components style with Tailwind arbitrary values referencing the tokens, e.g. `bg-[var(--color-bg-muted)]` in `PatientSummaryCard.tsx`; the new components do the same, so no new loading step is needed. Note: `tokens.css` line 68 has `--duration-fast: [object Object];`, a generator defect. This plan uses no duration token (use `motion-reduce:animate-none` with `animate-pulse` as the existing skeleton does).

  ### Flow

  Sketch flows: `dashboard-to-log` (Add reading) exists and is reused. Empty-tile prompt "Log a reading" reuses the same `onAddReading` handler. `dashboard-to-appointments` is outside this item.

  ```mermaid
  flowchart TD
    App[App.tsx hash routing] --> Dash[DashboardPage.tsx]
    Dash --> PSC[PatientSummaryCard.tsx]
    Dash --> Tiles[TodayStatsTiles.tsx]
    Tiles --> Tile[StatTile.tsx]
    Tiles --> Hook[useTodayStats.ts]
    Hook --> Fetch[todayReadings.ts]
    Hook --> Events[readingEvents.ts]
    Hook --> Logic[todayStats.ts]
    Tile --> Logic
    Save[Future reading save handler, other story] -.publishReadingSaved.-> Events
    classDef touched fill:#f96,color:#000
    class Dash,Tiles,Tile,Hook,Fetch,Events,Logic touched
  ```

  Dash is edited to render the section; the stats files are new. The dashed edge is the seam the reading-logging story must call.
review_focus: |
  IN: five read-only tiles with latest-today logic, out-of-range flag, empty states, and live update through an event seam; web app only. OUT: weight trend chart, appointments, building a readings API or the log form. Riskiest: the local-calendar-day boundary (use local midnight bounds, test around midnight) and the assumed readings endpoint and range values, which are open questions, not settled facts. Deliberate: the flag has a text label, not colour only, and steps shows 0 rather than a prompt.
