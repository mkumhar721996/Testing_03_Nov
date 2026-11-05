summary: |
  Turn the existing minimal slot page (apps/web/src/slot/SlotGamePage.tsx, currently titled "Wheels Go round Tiger" with a client-held balance of 1000) into the approved Flaming Hot Gold game screen: status bar with inert home/sound icons, six fixed-value jackpot tiers and logo, 3x5 reel grid, spin message, control bar (info, inert menu, Spin, Autoplay with 10/20/50/100 picker, Turbo toggle), notice slot (spin-in-progress, low balance, win, jackpot, error, autoplay ending) and a balance bar (Credits / reused BetControl / Win). The paytable and rules open in a modal from the info icon. Spin logic moves into an extended `useSlotGame` hook (single-flight guard, request timeout, autoplay loop, turbo, jackpot and error handling), starting balance comes from the existing server `GET /balance` via `useBalance`. No new API endpoint is needed: `POST /spin` already returns `grid`, `evaluation.totalWin` and `jackpotTrigger`. Jackpot pooling/payout, lobby, options panel and audio stay out.
scope:
  - description: |
      Game constants and display data, one module so tests and UI share them:
      ```ts
      export const BET_STEPS = [1, 2, 3, 5, 10] as const        // moved/re-exported from useSlotGame
      export const AUTOPLAY_COUNTS = [10, 20, 50, 100] as const
      export const SPIN_MS = 1600; export const TURBO_SPIN_MS = 500   // design game-data
      export const SPIN_TIMEOUT_MS = 10_000
      export const JACKPOT_TIERS = [
        { id: 'major-jackpot', name: 'Major jackpot', value: '$400.00' },
        { id: 'minor-jackpot', name: 'Minor jackpot', value: '$100.00' },
        { id: 'mix-jackpot',   name: 'Mix jackpot',   value: '$25.00'  },
        { id: 'major-bonus',   name: 'Major bonus',   value: '$20.00'  },
        { id: 'minor-bonus',   name: 'Minor bonus',   value: '$10.00'  },
        { id: 'mix-bonus',     name: 'Mix bonus',     value: '$5.00'   },
      ] as const
      export const formatCredits = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
      ```
      Also holds the paytable rows and rules text copied from the prototype's paytable modal.
    files:
      - apps/web/src/slot/gameConfig.ts
      - apps/web/src/slot/gameConfig.test.ts
    rationale: |
      Design plan says jackpot values are fixed display values (AC17); keeping them out of components makes the six-tier test trivial and keeps pooling (out of scope) separable. Paytable multipliers are the prototype's invented sample values and are shown as display copy only.
  - description: |
      Extend `useSlotGame` (apps/web/src/slot/useSlotGame.ts):
      before: `useSlotGame(spin = postSpin, { startBalance = START_BALANCE })` returning balance/bet/grid/spinning/canSpin etc.
      after: `useSlotGame(spin = postSpin, opts: { startBalance: number; spinMs?: number; turboMs?: number; timeoutMs?: number })`. Adds:
      - `turbo`, `toggleTurbo()` (animation length only, never the result).
      - `message: string` (spin message: 'Press spin to play', 'Spinning…', 'No win this time', 'Win 5 credits', 'Jackpot', 'Spin failed'), `notice: {kind:'win'|'jackpot'|'error'|'autoplay'|null, text}`.
      - `win: number | null` (null for a jackpot spin so no amount is shown, AC30).
      - `error` handling: the request is aborted after `timeoutMs` via AbortController (pass `signal` to `postSpin`, which already accepts one); on failure or timeout the reels stop (`spinning=false`), an error notice is set and the balance keeps the bet deducted (AC33, see open question about the design's refund).
      - single-flight guard: `const inFlight = useRef(false)`; `runSpin` returns immediately when `inFlight.current` is true, set synchronously before any await, so a double tap in one tick cannot send two requests (AC10 and deferred question).
      - autoplay: `auto: {on:boolean; left:number}`, `startAutoplay(count)`, `stopAutoplay()`; loop runs spins sequentially, stops after `count` spins, on stopAutoplay, on error, or when `balance < bet` (then low-balance state shows).
      - `jackpot: boolean` flag for the jackpot-spin badge and highlighted Mix jackpot tier.
      - balance is seeded from the server value (no more START_BALANCE=1000 default in the page), and the TODO(rebase) comment is resolved.
      Bet rules stay: steps 1/2/3/5/10, up/down disabled at ends and while spinning (AC1,2,9,21-24).
    files:
      - apps/web/src/slot/useSlotGame.ts
      - apps/web/src/slot/useSlotGame.test.tsx
    rationale: |
      All gameplay state already lives in this hook and its tests; extending it keeps one source of truth and lets the components stay presentational.
  - description: |
      Fix BetControl display so the bet shows as the plain credits the ACs state ("the bet shows 2"): replace `{bet.toFixed(2)}` with `{formatCredits(bet)}`, and update BetControl.test.tsx. Keep its props (bet, canDecrease, canIncrease, onDecrease, onIncrease) and `data-wf-id="bet-control"` unchanged, and place it inside the balance bar's Bet cell (on the dark bar the label and output use `--color-warning-bg` and `--color-bg`, set through the balance bar CSS, not by editing the component).
    files:
      - apps/web/src/components/BetControl.tsx
      - apps/web/src/components/BetControl.test.tsx
    rationale: |
      The catalogue requires reusing BetControl. Its current two-decimal output ("2.00") conflicts with AC1-4 ("shows 2"), so the formatting is the one change it needs.
  - description: |
      Presentational components built from the prototype (one file each, token-only styling; classes `btn`, `btn-secondary`, `btn-ghost`, `btn-icon`, `btn-lg`, `modal`, `backdrop`, `dropdown-menu`, `dropdown-item`, `alert`, `alert-*`, `badge`, `badge-warning`, `table`, `table-wrap`, `spinner` are all defined in design-system/prototype-utils.css which index.css already imports):
      - `StatusBar` (prototype `status-bar`): Home and Sound ghost icon buttons with aria-label "Home"/"Sound", game title "Flaming Hot Gold™", clock. Buttons have no onClick (AC19, AC20). Dark `--color-fg` bar.
      - `JackpotPanel` (prototype `scene`): two rows of three `.tier` tiles from JACKPOT_TIERS (name + mono value), plus `game-logo`; the Mix jackpot tile gets `is-hit` when the last spin was a jackpot spin; background `--color-info-bg`.
      - `ReelGrid` (existing): restyle to the prototype `reel-grid`/`reel-cell` look (warning-coloured frame, `--color-warning-bg` cells, aspect-ratio 9/10, `is-spinning` roll animation shortened with `is-turbo`, reduced-motion respected), keep symbol mapping from symbols.ts and `aria-busy` while spinning.
      - `ControlBar`: info (opens paytable, aria-label "Info: paytable and rules"), inert menu (aria-label "Menu"), round Spin button (label 'Spin'/'Spinning', `disabled` when `!canSpin`, `aria-disabled` while spinning), Autoplay stacked button ('Auto' / '{n} left'; pressing while running stops it; aria-label 'Stop autoplay, n spins left'), Turbo stacked toggle with `aria-pressed` and visible text 'Turbo on'/'Turbo off'.
      - `AutoplayMenu`: `role="menu"` list with exactly 10, 20, 50, 100 ("10 spins" ...), closes on Escape or pick; arrow-key focus like the prototype kit.
      - `SpinNotice` (prototype `notice`, `aria-live="polite"`, reserves height): hint text, spinning (spinner), low balance warning "Your balance is below the lowest bet of 1 credit. Spin is turned off.", win (success), jackpot (info + `badge-warning` "Jackpot spin", "No win amount is added for this spin."), error (danger, `role="alert"`, "The spin did not go through. Press Spin to try again."), autoplay endings.
      - `BalanceBar` (prototype `balance-bar`): three-column grid Credits | BetControl | Win; on narrow widths (max 520px) Bet drops to its own row. Win shows the amount, 0 by default, and '—' for a jackpot spin.
      - `PaytableModal`: `.backdrop` + `.modal` `role="dialog" aria-modal="true" aria-labelledby`, title "Paytable and rules", close icon button plus "Back to game"; table of line wins and the rules list from the prototype; focus moves into the dialog, Escape closes, focus returns to the info button.
    files:
      - apps/web/src/slot/StatusBar.tsx
      - apps/web/src/slot/JackpotPanel.tsx
      - apps/web/src/slot/ReelGrid.tsx
      - apps/web/src/slot/ControlBar.tsx
      - apps/web/src/slot/AutoplayMenu.tsx
      - apps/web/src/slot/SpinNotice.tsx
      - apps/web/src/slot/BalanceBar.tsx
      - apps/web/src/slot/PaytableModal.tsx
      - apps/web/src/slot/ReelGrid.test.tsx
      - apps/web/src/slot/ControlBar.test.tsx
      - apps/web/src/slot/AutoplayMenu.test.tsx
      - apps/web/src/slot/JackpotPanel.test.tsx
      - apps/web/src/slot/BalanceBar.test.tsx
      - apps/web/src/slot/PaytableModal.test.tsx
    rationale: |
      Mirrors the prototype's component breakdown. The stacked icon+caption button is feature-specific (design plan says NEW: none beyond BetControl reuse), so it lives in ControlBar rather than as a shared component.
  - description: |
      Game stylesheet for what the design defines only in its own inline style (game column `max-width: var(--modal-width)`, status-bar, scene/tier, reel area, control-bar, spin-button, notice, balance-bar, paytable layout, keyframes `reel-roll`, `win-pulse`, `win-pop`). Written on tokens only (`--color-fg`, `--color-bg`, `--color-warning`, `--color-warning-bg`, `--color-success`, `--color-success-bg`, `--color-danger`, `--color-info-bg`, `--space-1..6`, `--radius-sm/md/lg/full`, `--font-size-sm/md/lg/xl`, `--control-height-lg`, `--focus-ring-width`, `--modal-width`, `--z-popup`), no hex or raw px except where a token multiple is used with calc. Imported from SlotGamePage. Token loading already exists: apps/web/src/index.css lines 2-3 import design-system/tokens.css and prototype-utils.css after `@import "tailwindcss"`.
    files:
      - apps/web/src/slot/flamingHotGold.css
    rationale: |
      Prototype classes like `.tier`, `.reel-cell`, `.balance-bar` exist only in its inline style, so they are defined in the app on the same tokens. Light theme only, per the UI guidelines. The prototype uses a full-bleed game column instead of the console shell; that is deliberate (design plan: "App nav: none").
  - description: |
      Rewrite `SlotGamePage` to compose the components above, replacing the "Wheels Go round Tiger" title, TopBar and "Free games" badge. Call `useBalance()` and render a loading skeleton (`.skeleton`) until `loaded`; on balance `error` show an `alert-danger` with a "Try again" button wired to `retry`; once loaded, mount an inner `GameScreen` that calls `useSlotGame(spin, { startBalance: balance })`. Keep the optional `spin` prop for tests, and add optional `balanceFetcher`. `TopBar.tsx` and its test are removed if nothing else imports them (confirm with Grep first). App.tsx keeps the `#/slot` route unchanged.
    files:
      - apps/web/src/slot/SlotGamePage.tsx
      - apps/web/src/slot/SlotGamePage.test.tsx
      - apps/web/src/slot/TopBar.tsx
      - apps/web/src/slot/TopBar.test.tsx
    rationale: |
      Wires the real server balance (GET /balance, already built in story 046) into the screen instead of the client-only 1000 default, and covers the loading and error states the screen needs.
  - description: |
      Optional Playwright E2E for the happy path (load at #/slot, bet up, spin, autoplay 10, paytable open) against the running stack, if the repo already has a Playwright setup (confirm with Glob before adding; do not introduce a new E2E harness).
    files: []
    rationale: |
      Stack lists Playwright for E2E; unit coverage by Vitest + Testing Library is the primary proof for each AC.
tests:
  - |
    AC1 bet up (useSlotGame.test.tsx or SlotGamePage.test.tsx). Write first, fails until BetControl prints plain credits:
    ```ts
    render(<SlotGamePage spin={fakeSpin} balanceFetcher={async () => 100} />)
    await screen.findByRole('group', { name: 'Bet' })
    await user.click(screen.getByRole('button', { name: 'Increase bet' }))
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent(/^2$/)
    ```
  - |
    AC2 bet down: bet at 2, click "Decrease bet", `expect(betOutput).toHaveTextContent(/^1$/)`.
  - |
    AC3 and AC4 balance bar on load with balance 100 and bet 2 (bet is raised to 2 first, since the default bet is the lowest step):
    ```ts
    const bar = within(screen.getByTestId('balance-bar'))
    expect(bar.getByText('Credits').nextSibling).toHaveTextContent('100')
    expect(bar.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent('2')
    ```
  - |
    AC5 win shown: fakeSpin resolves `{ grid, bet: 1, evaluation: { totalWin: 5 }, jackpotTrigger: false }`; after the spin `expect(within(bar).getByText('Win').nextSibling).toHaveTextContent('5')`.
  - |
    AC6 spin runs and stops: press Spin, `expect(fakeSpin).toHaveBeenCalledWith(1, expect.any(String), expect.anything())`, then `await waitFor(() => expect(screen.getByRole('group', { name: /Reel grid/ })).toHaveAttribute('aria-busy', 'false'))` and the grid shows the returned symbols.
  - |
    AC7 spin message: after a completed spin `expect(screen.getByTestId('spin-message')).toHaveTextContent(/No win this time|Win/)`.
  - |
    AC8 spinning state: with a never-resolving fakeSpin, `expect(screen.getByRole('button', { name: 'Spinning' })).toHaveAttribute('aria-disabled', 'true')` and `expect(screen.getByText(/Spinning/, { selector: '[aria-live] *' })).toBeInTheDocument()`.
  - |
    AC9 bet locked while spinning: during a pending spin `expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()`, same for "Decrease bet", and the bet output text is unchanged after clicking.
  - |
    AC10 no second spin, including double tap: `await user.dblClick(spinButton)` (and a direct `fireEvent.click` twice in one tick) then `expect(fakeSpin).toHaveBeenCalledTimes(1)`. Hook-level test calls `result.current.spin(); result.current.spin()` inside one `act` and asserts the same.
  - |
    AC11 and AC12 low balance with balanceFetcher returning 0.5: `expect(screen.getByText(/below the lowest bet of 1 credit/)).toBeInTheDocument()` and `expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled()`.
  - |
    AC13 and AC14 autoplay 10 (fake timers for SPIN_MS/turbo delays): open Autoplay, pick "10 spins", advance timers until idle, `expect(fakeSpin).toHaveBeenCalledTimes(10)`, then advance more and still `toHaveBeenCalledTimes(10)`; `expect(screen.getByRole('button', { name: 'Autoplay' })).toBeInTheDocument()` (back to idle).
  - |
    AC15 and AC16 turbo toggle: `const t = screen.getByRole('button', { name: /Turbo/ }); expect(t).toHaveAttribute('aria-pressed', 'false'); await user.click(t); expect(t).toHaveAttribute('aria-pressed', 'true'); expect(t).toHaveTextContent('Turbo on')`; click again returns to 'Turbo off'. Hook test: with turbo on the spin settles after `turboMs` not `spinMs`.
  - |
    AC17 jackpot tiers (JackpotPanel.test.tsx): `expect(screen.getAllByTestId('jackpot-tier')).toHaveLength(6)` and each contains its value from JACKPOT_TIERS (`$400.00`, `$100.00`, `$25.00`, `$20.00`, `$10.00`, `$5.00`).
  - |
    AC18 info icon: click `getByRole('button', { name: /Info/ })`, `expect(await screen.findByRole('dialog', { name: 'Paytable and rules' })).toBeInTheDocument()`; Escape and "Back to game" close it.
  - |
    AC19 and AC20 inert icons: `Home`, `Menu`, `Sound` buttons are present; snapshot `container.innerHTML` before, click each, `expect(container.innerHTML).toBe(before)` and no dialog appears.
  - |
    AC21 and AC22 max bet: set bet to 10 with balance 100; `expect(increase).toBeDisabled()`; `fireEvent.click(increase)` leaves the output at 10.
  - |
    AC23 and AC24 min bet: at bet 1 `expect(decrease).toBeDisabled()` and clicking leaves the output at 1.
  - |
    AC25 autoplay options: click Autoplay, `expect(within(screen.getByRole('menu', { name: 'Autoplay spins' })).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['10 spins', '20 spins', '50 spins', '100 spins'])`.
  - |
    AC26 stop autoplay: start autoplay, press the button now named /Stop autoplay/, advance timers; `expect(fakeSpin.mock.calls.length).toBeLessThan(10)` and the button label returns to 'Autoplay' (the in-flight spin finishes, no further spin starts).
  - |
    AC27 and AC28 credits no longer cover bet: balance 3, bet 2, fakeSpin returns no win, start autoplay; after the first spin balance is 1 and autoplay stops with `expect(screen.getByText(/Autoplay stopped: your credits no longer cover the bet/)).toBeInTheDocument()` and `expect(screen.getByText(/below the lowest bet of 1 credit/))` once balance drops under 1 (balance 2 / bet 2 variant for the exact low-balance message); `expect(fakeSpin).toHaveBeenCalledTimes(1)`.
  - |
    AC29 and AC30 jackpot: fakeSpin returns `jackpotTrigger: true, evaluation: { totalWin: 0 }`; `expect(screen.getByText(/Jackpot spin/)).toBeInTheDocument()`, `expect(screen.getByText(/No win amount is added/))`, and `expect(within(bar).getByText('Win').nextSibling).toHaveTextContent('—')` (no amount).
  - |
    AC31 to AC33 failure and timeout: fakeSpin rejects (second case never resolves and fake timers advance `SPIN_TIMEOUT_MS`, asserting the AbortSignal passed in is aborted). Then `expect(screen.getByRole('alert')).toHaveTextContent(/did not go through/)`, `expect(grid).toHaveAttribute('aria-busy', 'false')`, and with balance 100 and bet 1 `expect(creditsValue).toHaveTextContent('99')`.
  - |
    Balance loading and error states: balanceFetcher pending shows a skeleton; rejecting shows an alert and "Try again" refetches.
  - |
    Narrow runs per file: `(cd apps/web && pnpm test src/slot/useSlotGame.test.tsx)`, then `(cd apps/web && pnpm test src/slot src/components)`; the full command `(cd services/api && pnpm test) && (cd apps/web && pnpm test)` is run by the pipeline, not here. No API test changes, since the API is unchanged.
assumptions_or_open_questions:
  - |
    Conflict between AC33 and the prototype. AC33 says that after a failed or timed-out spin the balance shows the bet deducted. The prototype refunds the bet on failure and its rules text says "your bet goes back to your balance". The plan follows the AC (stake stays deducted) and the paytable rules line and error notice copy are written to match ("your bet was not refunded" is NOT claimed; the notice only says the spin did not go through). A reviewer should confirm the AC is intended, because the current hook refunds on failure.
  - |
    Server balance is not debited by `POST /spin` today (spin.service.ts says balance is out of scope), so spin stakes and wins are applied client-side on top of the balance fetched from `GET /balance`, and a page reload shows the server value again. Moving debit/credit into the spin endpoint (atomic with the saved spin) would be an API change not named in any AC; it is left out and flagged as a likely follow-up story.
  - |
    Double-submit protection (deferred question): handled client-side with a synchronous single-flight ref plus the disabled Spin button. Server-side idempotency (a client spin id) is not added, since no AC asks for it. Open for a human if duplicate spins on retry matter.
  - |
    Devices, screen sizes and browsers (project-wide question): the prototype is a single portrait column capped at --modal-width with a reflow below 520px; the plan builds that and tests layout only through DOM structure, not device matrix. Supported browser list stays unanswered.
  - |
    Concurrent players and retention of round history and guest sessions (project-wide question): not answerable from the code and not touched by this story; unchanged (ADR-0004 says under 100 users).
  - |
    The API returns 12 symbols (S1-S10, WILD, SCATTER) and symbols.ts labels them A/K/Q/J/Picture 1-4/Wild/Scatter, while the prototype shows nine art symbols (silver, cart, mine, king, ace, ten, lantern, gems, miner) as placeholder glyph cells. The plan keeps the existing mapping with the prototype's cell styling; a symbol artwork mapping needs a designer decision.
  - |
    Jackpot tier values use the prototype's dollar strings ($400.00 ...) as fixed display values per the story, while balance, bet and win are plain credits with no currency symbol. The prototype's clock (11:09) is rendered as the live local time.
  - |
    The jackpot-spin flag highlights the Mix jackpot tile as in the prototype; the API does not say which tier a jackpot spin triggers, so this tile choice is a display assumption.
  - |
    The paytable multipliers are the prototype's invented sample values and may not match the server evaluator (services/api/src/spin/spin.evaluator.ts); a reviewer should confirm or supply the real table before release.
  - |
    Wide-state difference: the prototype shows a spin button in success green and control-bar buttons in dark fills, while its design plan says the spin button uses the primary token. The prototype's CSS (green) is followed since it is the visual record; flag if the primary blue is wanted.
  - |
    Possible prompt-injection check: nothing in the work item, deferred questions, current plan or feedback asked for credentials, external contact, or disabling checks, so nothing was refused.
estimated_points: 8
package_dependencies: []
notes: |
  ### Data & rollout
  None — front-end only change on top of the existing `GET /balance` and `POST /spin` endpoints; no migration, stored-data shape change, seed, env var or config file is added (`VITE_API_BASE_URL` is already read by spinApi.ts and playerBalance.ts). Deploy and rollback are the web bundle only.

  ### Design and tokens
  Read the prototype at designs/TESTING-03-NOV-STORY-057/TESTING-03-NOV-STORY-057-design.html in full (markup, inline CSS, game-data JSON, script). Tokens are loaded by apps/web/src/index.css lines 2-3 (`@import "../../../design-system/tokens.css"; @import "../../../design-system/prototype-utils.css";` after tailwindcss). prototype-utils.css defines `.btn*`, `.modal`, `.backdrop`, `.dropdown-menu`, `.dropdown-item`, `.alert*`, `.badge*`, `.table`, `.table-wrap`, `.spinner` (verified by grep); `.tier`, `.reel-cell`, `.balance-bar`, `.control-bar`, `.spin-button`, `.notice`, `.status-bar`, `.scene` exist only in the prototype and are defined in flamingHotGold.css. `.skeleton` is used for the balance loading state; confirm it is defined in prototype-utils.css before use (not part of the grep above) and otherwise fall back to the `.spinner`.

  Prototype states to cover in the real UI: default, bet-min, bet-max, spinning, win, jackpot, error, low-balance, autoplay. The prototype's sample outcome cycle and board arrays are NOT carried into production; results come from `POST /spin`.

  ### Structure
  ```mermaid
  flowchart TD
    App[App.tsx route #/slot] --> Page[SlotGamePage.tsx]
    Page --> UB[balance/useBalance.ts]
    UB --> PB[balance/playerBalance.ts GET /balance]
    Page --> Hook[useSlotGame.ts]
    Hook --> API[slot/spinApi.ts postSpin]
    API --> Ctl[services/api spin.controller.ts POST /spin]
    Page --> Bar[BalanceBar.tsx]
    Bar --> Bet[components/BetControl.tsx]
    Page --> Reels[ReelGrid.tsx]
    Page --> Ctrl[ControlBar.tsx]
    Ctrl --> Menu[AutoplayMenu.tsx]
    Page --> Jp[JackpotPanel.tsx]
    Page --> Notice[SpinNotice.tsx]
    Page --> Pay[PaytableModal.tsx]
    Page --> Cfg[gameConfig.ts]
    classDef touched fill:#f96,color:#000
    class Page,Hook,Bar,Bet,Reels,Ctrl,Menu,Jp,Notice,Pay,Cfg touched
  ```
  Touched nodes: Page (recomposed, loads balance), Hook (autoplay, turbo, timeout, single-flight, error), BetControl (plain credits format), the rest are new presentational pieces. API, spinApi.ts and useBalance are reused unchanged.

  ### Order of work (TDD)
  1. gameConfig + test. 2. BetControl format test then fix. 3. Hook tests per AC group (bet, spin, single-flight, error/timeout, jackpot, turbo, autoplay), each red before its code. 4. Component tests then components and CSS. 5. SlotGamePage integration tests last.
review_focus: |
  IN scope: the web screen only (components, the `useSlotGame` extension, BetControl display format, game CSS) on top of the unchanged `GET /balance` and `POST /spin`; OUT: jackpot pooling/payout, lobby, options panel, audio, and any server-side balance debit or spin idempotency. Riskiest areas are the autoplay loop (exact count, stop on toggle, credits and error) and the single-flight guard, plus AC33, which deliberately keeps the bet deducted on failure even though the prototype refunds it. The inert home/menu/sound buttons and fixed jackpot strings are intentional, per the story.
