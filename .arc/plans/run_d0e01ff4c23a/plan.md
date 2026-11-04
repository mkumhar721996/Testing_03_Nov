summary: |
  Build the idle state of the single Slot game screen in the web app (`apps/web`): a top bar (game name "Wheels Go round Tiger", Balance, Last win, no lobby/back control), a 3x5 reel grid, and a bet stepper (minus / amount / plus) with a Spin button, exactly as in the approved prototype. `BetControl` is reworked from a free-text input into the minus/amount/plus stepper over the allowed bet steps 1, 2, 3, 5, 10. Pressing Spin calls the existing `POST /spin` endpoint (server generates the grid, so the client never invents a result), deducts the bet from the displayed balance immediately, locks all controls while the request is in flight, then paints the returned grid and adds the win to balance and Last win. The API already exists (`SpinController`, `SpinService`), so the work is front-end, plus one small API addition for browser access if needed (see notes). Win banner, Collect, spin error/retry, free-games and paytable are separate stories and stay out.
scope:
  - description: |
      Load the design-system component stylesheet once, next to the tokens, so the classes the prototype uses (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, `.btn-lg`, `.card`, `.stack`, `.badge`, `.alert`, `.spinner`, `.field-label`) have a definition in the app. `apps/web/src/index.css` today only has `@import "tailwindcss";` and `@import "../../../design-system/tokens.css";`. Add `@import "../../../design-system/prototype-utils.css";` on the next line.
    files:
      - apps/web/src/index.css
    rationale: |
      The prototype's classes are defined in `design-system/prototype-utils.css`, which the app does not load yet. Per the design-system rule, import it once beside the tokens rather than redefining the classes.
  - description: |
      Spin client and symbol mapping. New module `apps/web/src/slot/spinApi.ts` following the `fetchPatientSummary` pattern (`import.meta.env.VITE_API_BASE_URL`, `fetch`, `res.ok` check, AbortSignal):

      ```ts
      export type ApiSymbol = 'S1'|'S2'|'S3'|'S4'|'S5'|'S6'|'S7'|'S8'|'S9'|'S10'|'WILD'|'SCATTER'
      export interface SpinOutcome { grid: ApiSymbol[][]; bet: number; evaluation: { totalWin: number } ; jackpotTrigger: boolean }
      export async function postSpin(bet: number, guestId: string, signal?: AbortSignal): Promise<SpinOutcome>
      ```
      It POSTs `{ bet }` as JSON to `/spin` with header `x-guest-id` (the controller rejects a missing or non-UUID header with 400). `guestId` comes from a small `getGuestId()` helper in the same folder that creates one with `crypto.randomUUID()` and keeps it in `localStorage`.
      New `apps/web/src/slot/symbols.ts` maps each API symbol to its on-screen label and a tint class key, using the prototype's labels (A, K, Q, J, Picture 1-4, Wild, Scatter). See the open question on 10 versus 12 symbols.
    files:
      - apps/web/src/slot/spinApi.ts
      - apps/web/src/slot/spinApi.test.ts
      - apps/web/src/slot/symbols.ts
      - apps/web/src/slot/symbols.test.ts
    rationale: |
      AC 3, 4, 23 and 24 need the server's grid and win. The API is the source of truth; nothing is faked on the client.
  - description: |
      State hook `apps/web/src/slot/useSlotGame.ts`:

      ```ts
      export const BET_STEPS = [1, 2, 3, 5, 10] as const   // mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS
      export const START_BALANCE = 1000
      export function useSlotGame(spin = postSpin): {
        balance: number; lastWin: number; bet: number; grid: ApiSymbol[][] | null
        spinning: boolean; canBetDown: boolean; canBetUp: boolean; canSpin: boolean
        betDown(): void; betUp(): void; spin(): Promise<void>
      }
      ```
      Rules: initial bet is `BET_STEPS[0]`, lastWin 0 (AC 10, 12). `canBetDown = !spinning && bet > BET_STEPS[0]` (AC 5, 13, 17). `canBetUp = !spinning && next step exists && next <= balance` (AC 6, 14, 15, 16, 18). `canSpin = !spinning && balance >= bet` (AC 19, 20, 21). `spin()` sets `spinning`, balance -= bet at once (AC 23), awaits `spin(bet, guestId)`, then sets grid, `lastWin = evaluation.totalWin`, balance += totalWin (AC 24), clears `spinning`. After any balance change, if `balance < bet`, bet snaps to the largest step the balance covers, falling back to the lowest step (AC 22), the same as the prototype's `coveredBet`. Floating point: keep money in whole cents internally or round to 2 decimals after each add and subtract.
    files:
      - apps/web/src/slot/useSlotGame.ts
      - apps/web/src/slot/useSlotGame.test.tsx
    rationale: |
      All bet and balance rules (AC 5-7, 10, 12-24) live in one testable hook, so the components stay presentational.
  - description: |
      Rework `BetControl` from the free-text input plus Spin into the stepper in the prototype (`data-wf-id="bet-control"`): a `role="group"` `aria-label="Bet"` with a minus button (`aria-label="Decrease bet"`), the amount in an `<output>` with a visible "Bet" label between the two buttons (AC 7), and a plus button (`aria-label="Increase bet"`). New props:

      ```tsx
      export function BetControl(props: { bet: number; canDecrease: boolean; canIncrease: boolean; onDecrease(): void; onIncrease(): void })
      ```
      Buttons use `.btn .btn-secondary .btn-icon .btn-lg`, `disabled` driven by the props. Amount formatted with two decimals (for example `1.00`), as in the prototype. Layout tokens: `gap var(--space-2)`, amount `min-width 96px` (prototype value, see open questions), `font-size var(--font-size-xl)`, `font-weight var(--font-weight-bold)`, label `var(--font-size-sm)` and `var(--color-fg-muted)`.
      The Spin button moves out of `BetControl` into the screen's controls row (the prototype puts Spin on the right of the stepper). Balance display and the in-component error also leave `BetControl`; the top bar owns balance. Existing `BetControl.test.tsx` cases cover the old input behaviour and are replaced.
    files:
      - apps/web/src/components/BetControl.tsx
      - apps/web/src/components/BetControl.test.tsx
    rationale: |
      The component catalogue lists `BetControl`, and the design plan says it is "existing, reworked into a stepper". Reusing it avoids a duplicate component.
  - description: |
      New presentational components in `apps/web/src/slot/`:
      - `TopBar.tsx`: `<header>` with `<strong>` game name, then "Balance" and "Last win" figures (`.figure` pattern: label `var(--font-size-sm)` / `var(--color-fg-muted)`, value `var(--font-size-lg)` bold, tabular numbers). Background `var(--color-bg)`, bottom border `var(--border-width) solid var(--color-border)`, padding `var(--space-2) var(--space-3)`. No link, no back button (AC 11). Values shown with two decimals.
      - `ReelGrid.tsx`: `role="group"` `aria-label="Reel grid, 3 rows by 5 reels"`, CSS grid of 5 columns, `gap var(--space-2)`, 15 cells. Each cell is a local `ReelCell` (NEW, feature-local, no catalogue equivalent; the prototype's `.cell`): `min-height 72px`, background `var(--color-bg-muted)`, border `var(--border-width) solid var(--color-border)`, radius `var(--radius-md)`, text `var(--font-size-sm)`. Letter symbols render large (`var(--font-size-xl)` bold); Picture, Wild and Scatter show an icon plus text label. Tints follow the prototype: A uses `--color-danger-bg/--color-danger`, K `--color-info-bg/--color-info`, Q `--color-success-bg/--color-success`, J `--color-warning-bg/--color-warning`, Picture 1-4 solid `--color-danger/--color-success/--color-primary/--color-warning` with `--color-on-primary` text, Wild `--color-fg` on `--color-bg`, Scatter `--color-border-strong` with `--color-on-primary`. Every cell has `role="img"` and `aria-label="Row r, reel c: <label>"`. While `spinning`, cells use the dashed muted style (`border-style: dashed`, `var(--color-fg-muted)`). Before the first spin, shows the initial idle grid (see open questions).
      - `SlotGamePage.tsx`: composes `TopBar`, a `<main>` (max-width 640px, padding `var(--space-3)`, gap `var(--space-3)`), title row with `<h1>` ("Wheels Go round Tiger", `var(--font-size-xl)`) and a static `Free games: 0` `.badge`, a `.card` containing `ReelGrid`, a controls row (`BetControl` left, Spin right as `.btn .btn-primary .btn-lg`, disabled when `!canSpin`, label "Spinning" while in flight), and a `<p aria-live="polite">` status line. Status copy from the prototype: idle "Choose a bet, then press Spin."; spinning shows an `.alert` with `.spinner` "Spinning. The bet and Spin are locked until the reels stop."; low balance shows `.alert .alert-warning` "Your balance of X is below the lowest bet of 1.00. Spin is off until your balance covers a bet." Page background `var(--color-bg-muted)`. Light theme only.
      Reduced motion: do not add the prototype's land/pulse/rolling animations (they are polish, not in any AC); if a spinner is shown it already respects `prefers-reduced-motion` in `prototype-utils.css`.
    files:
      - apps/web/src/slot/TopBar.tsx
      - apps/web/src/slot/TopBar.test.tsx
      - apps/web/src/slot/ReelGrid.tsx
      - apps/web/src/slot/ReelGrid.test.tsx
      - apps/web/src/slot/SlotGamePage.tsx
      - apps/web/src/slot/SlotGamePage.test.tsx
    rationale: |
      Builds the approved idle screen (AC 1-4, 7-11, 17-22). Win banner, Collect, error and retry, free-games progress and paytable in the prototype belong to sibling stories and are not built here. The free-games badge shows only its static 0, as the prototype says.
  - description: |
      Wire the screen into the app. `App.tsx` currently renders `DashboardPage` plus a `BetControl balance={balance} onSpin={() => {}}` on the home route, with a placeholder `useState(100)` balance. Remove that `BetControl` and the placeholder balance, and add a hash route `#/slot` that renders `SlotGamePage` full-screen (no app shell, no back link, per the design plan). Add the route constant beside `ADD_READING` and `BOOK_APPOINTMENT`. Update `App.test.tsx` to assert the dashboard no longer shows a bet control and that `#/slot` shows the game name.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
    rationale: |
      The slot screen needs a reachable entry. Hash routing is the project's current stand-in until a router lands. The old `BetControl` usage must go because the component's API changes.
  - description: |
      Browser access to the API in dev. `services/api/src/main.ts` has no CORS setup and `apps/web/vite.config.ts` has no proxy, and the web app's base URL defaults to same-origin (`VITE_API_BASE_URL ?? ''`). Add a Vite dev proxy for `/spin` to the API (`server.proxy` in `apps/web/vite.config.ts`, target from `process.env.VITE_API_PROXY_TARGET`, default `http://localhost:3000`, the API's default port in `main.ts`). No API code change is planned. If the reviewer prefers a separate origin, switch to `app.enableCors()` in `main.ts` instead.
    files:
      - apps/web/vite.config.ts
    rationale: |
      Without it, `fetch('/spin')` in the running app hits the Vite server, not the API, and Spin fails in a real browser even though unit tests pass.
tests:
  - |
    AC1, AC11 — `apps/web/src/slot/TopBar.test.tsx` (write first, fails because `TopBar` does not exist):
    ```tsx
    render(<TopBar gameName="Wheels Go round Tiger" balance={1000} lastWin={0} />)
    expect(screen.getByText('Wheels Go round Tiger')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back|lobby/i })).not.toBeInTheDocument()
    ```
  - |
    AC8, AC9, AC10 — same file, plus the page test: balance and last win are in the top bar and last win starts at 0:
    ```tsx
    expect(screen.getByText('Balance').nextSibling).toHaveTextContent('1000.00')
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('0.00')
    ```
  - |
    AC2, AC3 — `ReelGrid.test.tsx`: 15 cells in 3 rows by 5 reels, and every cell shows one of the symbol labels after a grid is supplied:
    ```tsx
    const cells = screen.getAllByRole('img', { name: /^Row \d, reel \d:/ })
    expect(cells).toHaveLength(15)
    const labels = new Set(['A','K','Q','J','Picture 1','Picture 2','Picture 3','Picture 4','Wild','Scatter'])
    cells.forEach((c) => expect(labels.has(c.getAttribute('aria-label')!.split(': ')[1])).toBe(true))
    ```
    `symbols.test.ts` asserts every `ApiSymbol` maps to a label, so no cell can be blank.
  - |
    AC4 — `SlotGamePage.test.tsx` with a stubbed spin returning a fixed grid; after clicking Spin the grid shows that grid:
    ```tsx
    render(<SlotGamePage spin={vi.fn().mockResolvedValue(outcome)} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(await screen.findByRole('img', { name: 'Row 1, reel 1: A' })).toBeInTheDocument()
    ```
    `spinApi.test.ts` asserts the request shape:
    ```ts
    expect(fetch).toHaveBeenCalledWith('/spin', expect.objectContaining({ method: 'POST', body: JSON.stringify({ bet: 1 }), headers: expect.objectContaining({ 'x-guest-id': guestId }) }))
    ```
  - |
    AC5, AC6 — `BetControl.test.tsx` and `useSlotGame.test.tsx`: plus raises and minus lowers the shown bet:
    ```tsx
    await userEvent.click(screen.getByRole('button', { name: 'Increase bet' }))
    expect(screen.getByLabelText('Bet')).toHaveTextContent('2.00')
    await userEvent.click(screen.getByRole('button', { name: 'Decrease bet' }))
    expect(screen.getByLabelText('Bet')).toHaveTextContent('1.00')
    ```
  - |
    AC7 — `BetControl.test.tsx`: the amount sits between the two buttons in DOM order:
    ```tsx
    const group = screen.getByRole('group', { name: 'Bet' })
    const order = within(group).getAllByRole('button', { hidden: true }).map((b) => b.getAttribute('aria-label'))
    expect(group.children[1]).toContainElement(screen.getByLabelText('Bet'))
    expect(order).toEqual(['Decrease bet', 'Increase bet'])
    ```
  - |
    AC12, AC13 — first render: bet is the lowest step and minus is disabled:
    ```tsx
    expect(screen.getByLabelText('Bet')).toHaveTextContent('1.00')
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    ```
  - |
    AC14, AC15, AC16 — `useSlotGame.test.tsx`: plus is disabled at the top step (10) and when the next step exceeds the balance (balance 4, bet 3, next 5); enabled otherwise:
    ```ts
    expect(result.current.canBetUp).toBe(false) // bet 10
    expect(result.current.canBetUp).toBe(false) // balance 4, bet 3
    expect(result.current.canBetUp).toBe(true)  // balance 1000, bet 1
    ```
  - |
    AC17, AC18, AC19 — page test with a spin promise held open: during the spin all three controls are disabled:
    ```tsx
    await userEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Spinning/ })).toBeDisabled()
    ```
  - |
    AC20 — after the held promise resolves, Spin is enabled again:
    ```tsx
    resolveSpin(outcome)
    expect(await screen.findByRole('button', { name: 'Spin' })).toBeEnabled()
    ```
  - |
    AC21, AC22 — `useSlotGame.test.tsx` with a starting balance below the selected bet (balance 2.5, bet was 5 so it snaps to 2): Spin disabled only when balance is below the bet, and the bet shown is the largest covered step:
    ```ts
    expect(result.current.bet).toBe(2)
    // balance 0.5, below the lowest step
    expect(result.current.canSpin).toBe(false)
    expect(result.current.bet).toBe(1)
    ```
    Needs the hook to accept an optional initial balance for tests (`useSlotGame(spin, { startBalance })`); production uses `START_BALANCE`.
  - |
    AC23 — balance drops by the bet as soon as Spin is pressed, before the server answers (spin promise held open, bet 1, balance 1000):
    ```tsx
    await userEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByText('Balance').nextSibling).toHaveTextContent('999.00')
    ```
  - |
    AC24 — spin resolves with `evaluation.totalWin` 25: balance becomes 999 + 25 and Last win shows 25:
    ```tsx
    resolveSpin({ ...outcome, evaluation: { totalWin: 25 } })
    await waitFor(() => expect(screen.getByText('Balance').nextSibling).toHaveTextContent('1024.00'))
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('25.00')
    ```
  - |
    Wiring — `App.test.tsx`: `#/slot` renders the game name and the home dashboard no longer renders a bet control:
    ```tsx
    window.location.hash = '#/slot'
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Wheels Go round Tiger' })).toBeInTheDocument()
    ```
    Narrow run form of the project command: `(cd apps/web && pnpm test -- src/slot src/components/BetControl.test.tsx src/App.test.tsx)`.
assumptions_or_open_questions:
  - |
    Symbol count conflict. The story and prototype say 10 game symbols (A, K, Q, J, Picture 1-4, Wild, Scatter), but the API grid uses 12 values (S1-S10 plus WILD and SCATTER in `services/api/src/spin/spin.constants.ts`). The plan maps all 12 to labels so no cell is ever blank, but which API symbol is which label (for example S1 to A) is a guess: S1-S4 to A, K, Q, J, S5-S8 to Picture 1-4, and S9 and S10 have no prototype label. Needs a decision from the game designer or reviewer.
  - |
    The grid shown before the first spin. The prototype uses an invented idle grid; there is no server endpoint for it. The plan shows a fixed, locally defined starting grid made of valid symbols. Confirm that is acceptable, or say if cells should be empty until the first spin (AC 2 only requires the 3x5 grid, AC 3 applies after a spin).
  - |
    Balance is client-side only. The API says balance is out of scope (wallet story) and does not return one, so the screen starts at 1,000.00 (the prototype's opening balance) and updates locally by bet and `evaluation.totalWin`. A reload resets it. Confirm, or name the wallet endpoint to use.
  - |
    Route and entry point. There is no router and no link to the game; the plan adds hash route `#/slot` and removes the old `BetControl` from the home screen. Confirm the route, or say where the game should be opened from. The existing dashboard shows an old `BetControl` today, which this plan deletes.
  - |
    Guest identity. `POST /spin` requires an `x-guest-id` UUID header, and no login exists. The plan generates one with `crypto.randomUUID()` and stores it in `localStorage`.
  - |
    Failed spin requests are a separate story (spin error and retry). Here, a rejected `postSpin` will at minimum restore the balance deduction and clear `spinning` so the controls are not stuck locked, with no new error UI. Confirm this minimal handling is fine.
  - |
    Bet steps are duplicated in the web app, mirroring `ALLOWED_BETS` on the API (the existing `BetControl` already does this; there is no shared package). Prototype raw values with no token: `min-height 72px` for cells, `min-width 96px` for the bet amount and `max-width 640px` for the page. No token covers them, so the implementer should flag them rather than invent tokens. Money is shown as plain two-decimal numbers with no currency symbol, as in the prototype.
  - |
    Prototype conflict: the prototype adds win and error states and a paytable on the same screen, but the story scope says those are separate stories. Not built here. Prototype AC 20 is also tagged on the error state, while the story's AC 20 only concerns Spin being enabled after a completed spin.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — front-end screen over the existing `POST /spin` endpoint. No schema, migration, stored-data shape, seed or required setting changes. One optional dev-only env var, `VITE_API_PROXY_TARGET` (default `http://localhost:3000`, safe when unset), is read in `apps/web/vite.config.ts`. Rollback is reverting the commit.

  ### Design and token loading

  The approved prototype is `TESTING-03-NOV-STORY-051-design.html`. I read all of it. The app loads tokens at `apps/web/src/index.css:2` (`@import "../../../design-system/tokens.css";`), after `@import "tailwindcss";` on line 1. `App.tsx` already styles with Tailwind arbitrary values over tokens (for example `p-[var(--space-3)]`), so new components may use the same style or the design-system classes. The classes used by the prototype are defined in `design-system/prototype-utils.css`, which the app does not import yet, hence the first scope item. That file also sets global `body` and `h1` to `h4` styles, so check the dashboard still looks right after importing it. The prototype's `.cell`, `.reel-grid`, `.top-bar`, `.figure` and `.bet-control` rules are inline in the prototype only, so they are defined in the app on the same tokens (Tailwind arbitrary values or a small CSS block), never with colour literals.

  ```mermaid
  flowchart TD
    Index[apps/web/src/index.css]:::touched
    Vite[apps/web/vite.config.ts]:::touched
    App[apps/web/src/App.tsx]:::touched
    Page[slot/SlotGamePage.tsx]:::touched
    Hook[slot/useSlotGame.ts]:::touched
    Api[slot/spinApi.ts]:::touched
    Bet[components/BetControl.tsx]:::touched
    Top[slot/TopBar.tsx]:::touched
    Grid[slot/ReelGrid.tsx]:::touched
    Dash[dashboard/DashboardPage.tsx]
    Ctl[services/api spin.controller.ts]
    Svc[services/api spin.service.ts]
    App -->|new route #/slot, drop old BetControl| Page
    App --> Dash
    Page --> Hook
    Page --> Bet
    Page --> Top
    Page --> Grid
    Hook -->|bet and balance rules| Api
    Api -->|POST /spin with x-guest-id| Ctl
    Ctl --> Svc
    Vite -->|dev proxy /spin| Ctl
    Index -->|import prototype-utils.css| Page
    classDef touched fill:#f96,color:#000
  ```

  ### Backend facts verified

  `SpinController.spin` takes `x-guest-id` (UUID) and `{ bet }`, returns `{ grid, bet, evaluation: { stakePerLine, wins, totalWin }, jackpotTrigger }`. `SpinService` validates the bet against `ALLOWED_BETS` only; it does not check or return a balance. So AC 15, 21, 22, 23 and 24 are client-side rules over a client-held balance.
review_focus: |
  IN: the idle Slot game screen (top bar, reel grid, bet stepper, Spin), `BetControl` reworked into a stepper, the spin client over the existing `POST /spin`, a hash route, and a dev proxy. OUT: win banner, Collect, spin error and retry UI, free-games progress, paytable, animations, and any API or wallet change. Riskiest areas are the bet and balance rules in `useSlotGame` (snapping the bet when balance drops, floating-point money, restoring state if the request fails) and the symbol mapping, because the API has 12 symbols against the story's 10. The client-held starting balance of 1,000.00 and the invented starting grid are deliberate stopgaps pending the wallet story, not bugs.
