summary: |
  Add an on-demand paytable to the Slot game screen. A "Paytable" secondary button in the title row (beside the "Free games" badge) opens a modal panel over the reels. The panel lists one row per regular symbol with its 3/4/5-of-a-kind payouts, plus the Wild and Scatter rules. It closes with the close button, "Back to the game" or Escape. The control is disabled while a spin is in progress. AC5 requires the figures to match the server's paytable, and the API has no endpoint that exposes it (the figures live only in `PAYTABLE_MILLI` in `services/api/src/spin/spin.constants.ts`). So the work is end to end: a new read-only `GET /paytable` in the NestJS API that serialises the same constants the evaluator pays from, a web fetch client and hook, and the `PaytablePanel` UI built from the approved prototype using the existing design-system classes and tokens.

scope:
  - description: |
      API: add a read-only paytable endpoint. New `PaytableController` with `@Get()` on `paytable`, returning a `PaytableView` built from the same `PAYTABLE_MILLI` that `evaluateSpin` pays from, so the two cannot drift. No guest id, no database, no new setting.

      ```ts
      export interface PaytableView {
        symbols: { symbol: RegularSymbol; payouts: { 3: number; 4: number; 5: number } }[]; // multiples of the per-payline stake (milli / 1000)
        rules: { wild: string; scatter: string };
      }
      @Controller('paytable')
      export class PaytableController { @Get() paytable(): PaytableView }
      ```

      Symbol order follows the `RegularSymbol` order (S1..S10). The rule strings are defined server-side next to the constants and describe only what `spin.evaluator.ts` does today (Wild substitutes for every regular symbol and, leading a line, counts as the top-paying symbol; Scatter never substitutes and does not start or extend a payline). Register the controller in `AppModule.controllers`.
    files:
      - services/api/src/spin/paytable.controller.ts
      - services/api/src/spin/paytable.controller.spec.ts
      - services/api/src/app.module.ts
    rationale: |
      AC5 needs the server's figures. Deriving the view from `PAYTABLE_MILLI` keeps one source of truth. Mirrors `BalanceController` (plain controller, unit-tested by direct construction).
  - description: |
      Web data layer: `fetchPaytable(signal?)` in `paytableApi.ts` (same shape as `fetchBalance`: `VITE_API_BASE_URL`, throws `Error('Paytable failed: <status>')` on non-ok), and `usePaytable()` in `usePaytable.ts` returning `{ status: 'idle' | 'loading' | 'ready' | 'error', paytable, load }`. `load()` fetches on the first open and caches the result in memory for the page's lifetime (the paytable is static server constants). It re-fetches only after an error ("Try again").
    files:
      - apps/web/src/slot/paytableApi.ts
      - apps/web/src/slot/paytableApi.test.ts
      - apps/web/src/slot/usePaytable.ts
      - apps/web/src/slot/usePaytable.test.tsx
    rationale: |
      Answers the deferred question (fetch per open vs cache per session): fetch lazily on first open, cache for the session. The data cannot change without a deploy, so refetching each open adds latency and a failure mode for nothing. Lazy keeps the reel view's load unchanged.
  - description: |
      UI: new `PaytablePanel` component, built from the approved prototype's paytable panel. It is controlled (`open`, `onClose`, plus the `usePaytable` result).
      - Markup: a `.backdrop` (clicking it closes) and a `.modal` with `role="dialog" aria-modal="true" aria-labelledby`. The modal also carries the prototype's panel width, `min(calc(var(--modal-width) + var(--space-5)), 100% - 2 * var(--space-3))`.
      - Header: `h2` "Paytable" with a `.btn .btn-ghost .btn-icon` close button, `aria-label="Close paytable"`, using the x icon.
      - Intro line in `.text-sm .text-muted`.
      - Column header row (`aria-hidden`) "Symbol / 3 of a kind / 4 of a kind / 5 of a kind".
      - `ul[aria-label="Symbol payouts"]`: one `li` per symbol. Each uses the prototype grid (`minmax(0,1.3fr) repeat(3, minmax(0,1fr))`, gap `--space-2`, padding `--space-2`, border `--border-width solid --color-border`, radius `--radius-md`). Each has a swatch tinted like the reel cell, via `symbolView`, and the symbol label. Payouts are shown as "5×", tabular-nums, right aligned, each with an `sr-only` "3 of a kind: " prefix.
      - Two `.pay-rule` blocks (Wild, Scatter) with a bold title and `.text-sm .text-muted` text taken from the API's `rules`. Wild and Scatter have no 3/4/5 rows.
      - Footer button "Back to the game" (`.btn .btn-secondary`, closes).
      - Loading: `.skeleton` rows in the shape of the table. Error: `.alert .alert-danger role="alert"` "The paytable could not be loaded. Check your connection and try again." with a "Try again" `.btn-secondary`.
      - Behaviour: Escape (a keydown listener while open) calls `onClose`. On open, focus moves to the close button; on close, focus returns to the Paytable button. Tab is trapped inside the panel as in the prototype kit.

      Tokens used: `--space-1..6`, `--radius-md/lg`, `--border-width`, `--color-border`, `--color-fg-muted`, `--color-bg`, `--color-backdrop`, `--opacity-backdrop`, `--modal-width`, `--font-size-sm/lg`, `--font-weight-medium`, `--z-overlay`. Symbol tints reuse the colours `ReelGrid` already applies per `SymbolTint`; check `ReelGrid.tsx` and reuse its tint mapping rather than redefining it.
    files:
      - apps/web/src/slot/PaytablePanel.tsx
      - apps/web/src/slot/PaytablePanel.test.tsx
    rationale: |
      The `.modal`, `.backdrop`, `.btn*`, `.alert`, `.skeleton`, `.card` and `.badge` classes all already exist in `design-system/prototype-utils.css`, which `apps/web/src/index.css` line 3 imports. No stylesheet change is needed. The prototype uses `.modal` for the panel although the UI guidelines reserve modals for confirmations and short forms. The panel is short and read-only, so we follow the approved prototype.
  - description: |
      Wire into `SlotGamePage`. Hold `paytableOpen` state in the page. In the title row, wrap the "Free games: 0" badge and a new `<button type="button" className="btn btn-secondary" aria-haspopup="dialog" disabled={game.spinning} onClick={...}>Paytable</button>` in a `title-tools` flex group (gap `--space-2`). Opening calls `paytable.load()` and sets `paytableOpen`. Render `<PaytablePanel>` inside `main`. Also extend the spinning notice to "Spinning. The bet, Spin and Paytable are locked until the reels stop." as in the prototype's spinning state, and update the existing assertion in `SlotGamePage.test.tsx` for the old copy if one exists. Use the existing `game.spinning` from `useSlotGame` and do not change that hook.
    files:
      - apps/web/src/slot/SlotGamePage.tsx
      - apps/web/src/slot/SlotGamePage.test.tsx
    rationale: |
      AC1, AC6-AC9. The prototype's default status text mentions the Paytable ("The Paytable shows what each symbol pays."). Adopt it only if it does not break existing tests of the 051 copy.

tests:
  - |
    API, `paytable.controller.spec.ts` (AC5, AC2). The payouts equal the evaluator's table, so the UI and the payout logic cannot disagree.
    ```ts
    const view = new PaytableController().paytable();
    expect(view.symbols).toHaveLength(10);
    for (const { symbol, payouts } of view.symbols) {
      expect(payouts[3]).toBe(PAYTABLE_MILLI[symbol][3] / 1000);
      expect(payouts[4]).toBe(PAYTABLE_MILLI[symbol][4] / 1000);
      expect(payouts[5]).toBe(PAYTABLE_MILLI[symbol][5] / 1000);
    }
    expect(view.symbols.map((s) => s.symbol)).not.toContain('WILD');
    expect(view.symbols.map((s) => s.symbol)).not.toContain('SCATTER');
    ```
  - |
    API (AC3, AC4): the rules are non-empty strings.
    ```ts
    expect(view.rules.wild).toMatch(/wild/i);
    expect(view.rules.scatter).toMatch(/scatter/i);
    ```
  - |
    Web, `paytableApi.test.ts`: GET `${VITE_API_BASE_URL}/paytable` returns the parsed body. A non-ok response rejects.
    ```ts
    await expect(fetchPaytable()).rejects.toThrow('Paytable failed: 500');
    ```
  - |
    Web, `usePaytable.test.tsx`: `load()` twice calls fetch once, because the result is cached. After a failure, `load()` fetches again.
    ```ts
    act(() => { result.current.load(); result.current.load(); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    ```
  - |
    AC1, `SlotGamePage.test.tsx` (stubbed fetch): the paytable is hidden on load, then pressing the control shows it.
    ```ts
    expect(screen.queryByRole('dialog', { name: 'Paytable' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Paytable' }));
    expect(await screen.findByRole('dialog', { name: 'Paytable' })).toBeInTheDocument();
    ```
  - |
    AC2, `PaytablePanel.test.tsx`: given a fixture of two symbols, one row each, with 3, 4 and 5 payouts. No Wild or Scatter row in the list.
    ```ts
    const rows = within(screen.getByRole('list', { name: 'Symbol payouts' })).getAllByRole('listitem');
    expect(rows).toHaveLength(fixture.symbols.length);
    expect(within(rows[0]).getByText('3 of a kind:', { exact: false })).toBeInTheDocument();
    expect(within(rows[0]).getByText('5×')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Symbol payouts' })).queryByText(/wild|scatter/i)).toBeNull();
    ```
  - |
    AC3 and AC4, `PaytablePanel.test.tsx`: the rule text from the API is shown.
    ```ts
    expect(screen.getByText(fixture.rules.wild)).toBeInTheDocument();
    expect(screen.getByText(fixture.rules.scatter)).toBeInTheDocument();
    ```
  - |
    AC5, `SlotGamePage.test.tsx`: the stubbed `/paytable` body is the single source of the rendered numbers. A row shows exactly `payouts[n]` from the response (use values unlike the prototype's, e.g. 7 and 11 and 13).
    ```ts
    expect(within(row).getByText('11×')).toBeInTheDocument();
    ```
    Together with the API spec above, this ties the UI to the server's table.
  - |
    AC6, close button:
    ```ts
    fireEvent.click(screen.getByRole('button', { name: 'Close paytable' }));
    expect(screen.queryByRole('dialog', { name: 'Paytable' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Reel grid/ })).toBeInTheDocument();
    ```
    Also "Back to the game" closes, and focus returns to the Paytable button.
  - |
    AC7, Escape:
    ```ts
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Paytable' })).not.toBeInTheDocument();
    ```
  - |
    AC8, `SlotGamePage.test.tsx` using the existing `held()` helper: while a spin is pending, the control is disabled. Once the spin resolves, it is enabled again.
    ```ts
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    expect(screen.getByRole('button', { name: 'Paytable' })).toBeDisabled();
    resolve(outcome());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Paytable' })).toBeEnabled());
    ```
  - |
    AC9, idle reel view: `expect(screen.getByRole('button', { name: 'Paytable' })).toBeEnabled();`
  - |
    Panel states (not an AC, but the design lists them): loading shows skeleton rows. A failed fetch shows the `role="alert"` message, and "Try again" refetches and renders rows.
  - |
    Narrow run commands: `(cd services/api && pnpm test -- src/spin/paytable.controller.spec.ts) && (cd apps/web && pnpm test -- src/slot)`.

assumptions_or_open_questions:
  - |
    Deferred question (fetch each open or cache per session): decided as fetch on first open, cache in memory for the page's lifetime, retry only after an error. The values are static server constants, so they only change on a deploy. A reviewer who wants a fresh fetch on every open should say so. It is a one-line change in `usePaytable`.
  - |
    Symbol naming mismatch. The server symbols are S1..S10 and the web maps them to the labels A, K, Q, J, Picture 1-4 in `apps/web/src/slot/symbols.ts`. That file maps only 8 labels onto 10 server symbols: S9 and S10 reuse the labels "Picture 3" and "Picture 4". AC2 asks for one row per symbol, so the paytable would show two rows labelled "Picture 3" and two labelled "Picture 4", with different payouts. The prototype shows only 8 rows. I plan to render all 10 server symbols (honest to AC5) and need a decision: should the designer assign labels to S9 and S10, or should the paytable hide them? Left unresolved, the plan keeps the existing `symbolView` labels.
  - |
    Payout unit. The server's table is a multiple of the per-payline stake, which is the bet divided by 10 paylines (for example S1 at 5 of a kind is 100x the line stake, which is 10x the bet). The prototype shows "multiples of the bet" with invented figures (Picture 2 5 of a kind = 100x). Showing the server figure as "×" with the intro text "Payouts are multiples of the stake on each payline (your bet divided by 10)" is accurate. Showing multiples of the whole bet would need a conversion, and a game-math owner needs to confirm which the product wants. The planned copy follows the server, and the prototype's example sentence is dropped.
  - |
    Scatter rule. The prototype says "3 = 10, 4 = 15, 5 = 20 free games" and the screen shows a "Free games: 0" badge. The server has no free-games mechanic: `spin.evaluator.ts` gives Scatter no payout, and the only scatter-related code is the placeholder `jackpot.handoff.ts` (`jackpotTrigger` on the spin outcome). The plan therefore shows only the rule the server implements (Scatter does not substitute and does not pay on a line). It does not invent free-game awards. If free games are meant to ship, the server rule and its text must come first. Confirm the rule wording.
  - |
    The prototype's panel also contains a rules `card` (card-1) and a bet-steps note (text-1). They sit outside the ACs. Their copy matches server behaviour (bet steps 1, 2, 3, 5, 10 from `ALLOWED_BETS`), but "Wins pay from the left-most reel, on each of the three rows" is wrong for the server's 10 paylines. The plan leaves both out. A reviewer who wants the bet-steps note back can have it derived from `ALLOWED_BETS`.
  - |
    The UI guidelines reserve `.modal` for confirmations and short forms. The approved prototype uses `.modal` for the paytable, so we follow the prototype. Flag it if the reviewer prefers `.drawer`.
  - |
    Web unit tests need `fetch` stubbed (`vi.stubGlobal('fetch', ...)`) for the `/paytable` call, since `SlotGamePage` is rendered with an injected `spin` only. Existing `SlotGamePage` tests do not open the panel, so they are unaffected by the lazy fetch.

estimated_points: 5

package_dependencies: []

notes: |
  ### Data & rollout
  None — read-only endpoint over in-code constants. There is no schema change, stored data change, seed or new setting. The API and web can deploy in either order, but the web should go out after the API: until then the panel shows its error state. Rollback is reverting the commit.

  Design system: `apps/web/src/index.css` line 2 imports `design-system/tokens.css` and line 3 imports `design-system/prototype-utils.css`, so `.modal`, `.backdrop`, `.btn-*`, `.alert`, `.skeleton`, `.badge` and `.card` are already available. The existing page already styles layout with Tailwind arbitrary values on tokens (for example `gap-[var(--space-3)]`). `PaytablePanel` follows that. The prototype's own inline classes (`.pay-item`, `.pay-cols`, `.pay-rule`, `.paytable-panel`, `.sr-only`) are not in the design system, so they are expressed in the component with token-based Tailwind arbitrary values, and `sr-only` is Tailwind's built-in. No raw colour or pixel literals. Existing component reuse: `BetControl` is untouched.

  Prototype read: `TESTING-03-NOV-STORY-055-design.html`, screen "Slot game", elements `paytable-open`, `paytable-panel` (modal, backdrop, `paytable-close`, `pay-table` rows, `pay-wild`, `pay-scatter`). The prototype's sample figures are invented and are not carried into code. Also not carried: the prototype's kit JavaScript.

  ```mermaid
  flowchart TD
    Page[SlotGamePage.tsx]:::touched -->|Paytable button, open state, spinning lock| Panel[PaytablePanel.tsx]:::touched
    Panel -->|status and data| Hook[usePaytable.ts]:::touched
    Hook --> Api[paytableApi.ts]:::touched
    Api -->|GET /paytable| Ctl[paytable.controller.ts]:::touched
    Ctl -->|reads| Const[spin.constants.ts PAYTABLE_MILLI]
    Eval[spin.evaluator.ts] -->|pays from| Const
    Mod[app.module.ts]:::touched -->|registers| Ctl
    Panel -->|labels and tints| Sym[symbols.ts]
    Page --> Game[useSlotGame.ts spinning]
    classDef touched fill:#f96,color:#000
  ```

review_focus: |
  IN: `GET /paytable`, the web fetch and cache hook, `PaytablePanel`, and the Paytable button in `SlotGamePage`. OUT: free-games mechanics, any change to evaluation or payout logic, and the prototype's extra rules card and bet-steps note. Riskiest area: AC5. The UI must show only the server's figures (derived from `PAYTABLE_MILLI`), and the unit shown ("× the per-payline stake") deliberately differs from the prototype's invented "× the bet". The S9 and S10 label duplication and the Scatter rule wording are open questions, not oversights. Also check focus handling, Escape and the disabled-while-spinning behaviour.
