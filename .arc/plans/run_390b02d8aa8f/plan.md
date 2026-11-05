summary: |
  Most of the client bet stepping already exists (`useSlotGame` steps 1, 2, 3, 5, 10, disables plus at the top step or when the next step exceeds the balance, locks while spinning; `BetControl` renders the buttons). This story closes the remaining gaps: (1) the server must reject a bet above the player's server-held balance, not only a non-step bet (`SpinService` currently validates against `Number.POSITIVE_INFINITY`); (2) the bet is shown as a whole number (1, not 1.00); (3) plus and minus lock while free games are active; (4) a server rejection is surfaced as a visible `alert alert-danger` next to the bet controls and cleared as soon as the player changes the bet. The debit itself stays out of scope.
scope:
  - description: |
      Server: check the bet against the player's balance. Inject `PLAYER_REPOSITORY` into `SpinService` as a 4th constructor argument and replace the infinity check:

      ```ts
      constructor(
        @Inject(SPIN_REPOSITORY) private readonly repo: SpinRepository,
        @Inject(JACKPOT_POLICY) private readonly policy: JackpotPolicy,
        @Inject(GRID_GENERATOR) private readonly generate: (randomInt?: RandomInt) => Grid,
        @Inject(PLAYER_REPOSITORY) private readonly players: PlayerRepository,
      ) {}

      const balance = await this.players.getBalance(playerId);
      const check = validateBet(bet, balance);
      if (!check.ok) throw new BadRequestException(check.message);
      ```
      `validateBet` already rejects a non-step bet and a bet above the balance with a 400-ready message; it needs no change. `PLAYER_REPOSITORY` is already provided in `AppModule`, so no module change. No debit or balance write.
    files:
      - services/api/src/spin/spin.service.ts
    rationale: |
      AC9, AC10 and AC11 are enforced on the server. `getBalance` never writes (see `player.repository.ts`), so this stays inside the "does not cover the debit" boundary.
  - description: |
      Server tests: update the existing `SpinService` and `SpinController` specs to build the service with a stub `PlayerRepository` (`{ getBalance: async () => 100 }` by default), and add the three balance cases from the item.
    files:
      - services/api/src/spin/spin.service.spec.ts
      - services/api/src/spin/spin.controller.spec.ts
    rationale: |
      The constructor signature changes, so the existing specs would no longer compile or would validate against an undefined repository.
  - description: |
      Web: show the bet as a whole number. In `BetControl` change `{bet.toFixed(2)}` to `{bet}` (the design's `<output>1</output>`, `.bet-mid` with a `Bet` label above). Layout, classes (`btn btn-secondary btn-icon btn-lg`) and the `Decrease bet` / `Increase bet` aria-labels stay as they are. Update the `BetControl` test that currently expects `1.00`.
    files:
      - apps/web/src/components/BetControl.tsx
      - apps/web/src/components/BetControl.test.tsx
    rationale: |
      AC1 and AC2 say the bet shown is 1, 2, 3, 5, 10. The design's assumptions note says the bet is a whole number. Balance in `TopBar` keeps two decimals; it is not part of this story.
  - description: |
      Web: lock the bet during free games. Add an option to the hook and expose it through `canBetDown` and `canBetUp`:

      ```ts
      export function useSlotGame(
        spin: SpinFn = postSpin,
        { startBalance = START_BALANCE, freeGamesActive = false } = {},
      )
      // canBetDown: !spinning && !freeGamesActive && bet > BET_STEPS[0]
      // canBetUp:   !spinning && !freeGamesActive && next !== undefined && toCents(next) <= cents
      ```
      `SlotGamePage` takes a `freeGamesActive?: boolean` prop (default false), passes it to the hook and shows the design's note `<span class="badge badge-warning">Free games</span> The bet is locked while they play.` in place of the static `Free games: 0` badge only while active. Free-game state itself is not produced anywhere yet (see open questions).
    files:
      - apps/web/src/slot/useSlotGame.ts
      - apps/web/src/slot/SlotGamePage.tsx
    rationale: |
      AC7. Design state `free-games`: both buttons disabled, bet unchanged, Spin left as it is.
  - description: |
      Web: surface a server rejection and clear it on a bet change.
      - `spinApi.ts`: on a 400, read the JSON body's `message` and throw `new BetRejectedError(message)` (a small exported `Error` subclass); other failures keep throwing the generic error.
      - `useSlotGame.ts`: add `betError: string | null`. In `runSpin`'s catch, set it when the error is a `BetRejectedError`; keep giving the stake back as today. `betUp` and `betDown` call `setBetError(null)`.
      - `SlotGamePage.tsx`: between `BetControl` and the Spin button render, when `betError` is set, the design's block:

      ```tsx
      <div className="alert alert-danger" role="alert" id="bet-error">
        <p><strong>Bet not accepted.</strong> {game.betError}</p>
      </div>
      ```
      and give the `BetControl` group `aria-describedby="bet-error"` while shown (add an optional `errorId` prop to `BetControl`). Spin stays enabled so the player can retry after changing the bet (the design's stated story gap).
      Styling uses only classes the app already loads from `design-system/prototype-utils.css` (`.alert`, `.alert-danger`, `.btn*`), imported at `apps/web/src/index.css:3`, which use tokens `--color-danger`, `--color-danger-bg`, `--space-2`, `--space-3`, `--border-width`, `--radius-md`. No new colour or pixel literal.
    files:
      - apps/web/src/slot/spinApi.ts
      - apps/web/src/slot/useSlotGame.ts
      - apps/web/src/slot/SlotGamePage.tsx
      - apps/web/src/components/BetControl.tsx
    rationale: |
      AC12 and AC13. The error is shown next to its cause (UI guidelines: errors inline, `.alert` only for the message block the design shows).
  - description: |
      Web tests for the above (see `tests`): extend `useSlotGame.test.tsx`, `SlotGamePage.test.tsx`, `spinApi.test.ts` and `BetControl.test.tsx`.
    files:
      - apps/web/src/slot/useSlotGame.test.tsx
      - apps/web/src/slot/SlotGamePage.test.tsx
      - apps/web/src/slot/spinApi.test.ts
    rationale: |
      Test-first for every acceptance criterion; several (AC2 to AC6, AC8) are already covered or near-covered and only need assertions aligned to the item's numbers (balance 100, 7, 10).
tests:
  - |
    AC1 (web, `SlotGamePage.test.tsx` / `BetControl.test.tsx`), write first and watch it fail on `1.00`:
    ```ts
    render(<SlotGamePage spin={vi.fn()} />)
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent(/^1$/)
    ```
  - |
    AC2 (`useSlotGame.test.tsx`, balance 100):
    ```ts
    const { result } = renderHook(() => useSlotGame(vi.fn(), { startBalance: 100 }))
    const seen: number[] = []
    for (let i = 0; i < 4; i++) { act(() => result.current.betUp()); seen.push(result.current.bet) }
    expect(seen).toEqual([2, 3, 5, 10])
    ```
  - |
    AC3 (`useSlotGame.test.tsx`): bet 10, balance 100 gives `expect(result.current.canBetUp).toBe(false)`; and the page renders `expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()`.
  - |
    AC4 (`useSlotGame.test.tsx`): balance 7, press plus three times to bet 5, then `expect(result.current.bet).toBe(5); expect(result.current.canBetUp).toBe(false)`.
  - |
    AC5 (`useSlotGame.test.tsx`): initial state `expect(result.current.canBetDown).toBe(false)`; page: `expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()`.
  - |
    AC6 (`useSlotGame.test.tsx`): with a never-resolving `spin`, after `act(() => { void result.current.spin() })` assert `expect(result.current.canBetUp).toBe(false); expect(result.current.canBetDown).toBe(false)` (bet raised first so minus would otherwise be enabled).
  - |
    AC7 (`useSlotGame.test.tsx`, new, fails first):
    ```ts
    const { result } = renderHook(() => useSlotGame(vi.fn(), { startBalance: 100, freeGamesActive: true }))
    expect(result.current.canBetUp).toBe(false)
    expect(result.current.canBetDown).toBe(false)
    ```
    plus a page test that `<SlotGamePage freeGamesActive />` has both bet buttons disabled.
  - |
    AC8 (`useSlotGame.test.tsx`): balance 10, step to bet 5, `expect(result.current.canBetUp).toBe(true)`.
  - |
    AC9 (`spin.service.spec.ts`, new, fails first because the balance is not read yet):
    ```ts
    const { service } = setup({ balance: 100 })
    await expect(service.spin('guest-1', 4)).rejects.toBeInstanceOf(BadRequestException)
    ```
  - |
    AC10 (`spin.service.spec.ts` and `spin.controller.spec.ts`, new, fails first):
    ```ts
    const { service, repo } = setup({ balance: 7 })
    await expect(service.spin('guest-1', 10)).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.saved).toHaveLength(0)
    ```
    Controller: the same case returns status 400.
  - |
    AC11 (`spin.service.spec.ts`): balance 10, bet 10 is accepted and recorded:
    ```ts
    const { service, repo } = setup({ balance: 10 })
    await expect(service.spin('guest-1', 10)).resolves.toMatchObject({ bet: 10 })
    expect(repo.saved).toHaveLength(1)
    ```
  - |
    AC12 (`spinApi.test.ts` and `SlotGamePage.test.tsx`): a mocked 400 with body `{ message: 'Bet of 10 is more than your balance of 7.' }` makes `postSpin` reject with `BetRejectedError`; on the page, a `spin` prop that rejects with `new BetRejectedError('...')` then a Spin click gives:
    ```ts
    expect(await screen.findByRole('alert')).toHaveTextContent('Bet not accepted.')
    ```
    and the alert sits in the same card as the bet group (`within(card).getByRole('alert')`).
  - |
    AC13 (`SlotGamePage.test.tsx` and `useSlotGame.test.tsx`): after the rejection, press `Decrease bet` or `Increase bet`:
    ```ts
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    ```
    and at hook level `expect(result.current.betError).toBeNull()`.
assumptions_or_open_questions:
  - |
    Free-game state does not exist anywhere in the code yet (the page shows a static `Free games: 0` badge). This plan adds only the lock input (`freeGamesActive`, default false) so AC7 is testable; where the real value comes from belongs to the free-games story. Please confirm that is acceptable.
  - |
    The web page still holds the balance on the client (`START_BALANCE = 1000`, see the TODO in `useSlotGame.ts`) while the server now checks the server-held balance (`GET /balance`, `useBalance`). The two can differ until the page is wired to the server balance, so a bet the client allows may be rejected by the server. Wiring `useBalance` into the slot page is not in this story's ACs; I treat it as a separate item. Say if you want it included here (it would raise the estimate).
  - |
    The existing server error text is one generic line (`Bet must be one of 1, 2, 3, 5, 10 and not above your balance.`). The design's rejected state shows a specific line (`Bet of 10 is more than your balance of 7. Choose a smaller bet.`) and says the server's wording is shown as-is. I keep the server wording and the `Bet not accepted.` heading. Say if the server should return the specific wording per case (small change in `bet.validator.ts`).
  - |
    The design does not say what Spin does after a rejection; it stays enabled (the design's own assumption), and the stake is not debited because the debit is out of scope.
  - |
    The deferred project question (how long an inactive player's balance and uncollected win are kept on the server) is not answerable from this story and does not affect it. It stays open for the balance-storage owner.
  - |
    Server bet check uses the balance as a plain number from `getBalance`; the UI's cents arithmetic is client-side only. If balances can have fractions, `validateBet(bet, balance)` compares them as numbers, which is correct for whole-step bets.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — no schema, migration, stored data, seed or setting changes. `SpinService` only reads the balance through the existing `PlayerRepository.getBalance` (which returns `STARTING_BALANCE` for a player with no row and never writes). Deploy order is free; rolling back is a plain revert.

  ### Design and token loading

  Read the approved prototype (`TESTING-03-NOV-STORY-047-design.html`): states default, bet-2, bet-3, bet-5, bet-10, balance-7, balance-10, rejected, spinning, free-games and the server-rules reference table (not a player screen, so not built). The game card holds balance, `BetControl`, the optional `alert alert-danger` (`role="alert"`, `id="bet-error"`, between the bet control and Spin) and the Spin button. `BetControl` is the existing component and is extended, not replaced. The app loads tokens and component classes in `apps/web/src/index.css:2-3` (`design-system/tokens.css`, `design-system/prototype-utils.css`), which define `.alert`, `.alert-danger`, `.badge`, `.badge-warning`, `.btn*`. No new stylesheet import is needed.

  Conflict to note: the design shows balance and bet card as a standalone "Choose your bet" screen; the real page (`SlotGamePage.tsx`) already has the reel grid, top bar and bet/Spin row, so the alert is placed inside that existing card, not a new screen.

  ```mermaid
  flowchart TD
    Page[SlotGamePage.tsx]:::touched --> Hook[useSlotGame.ts]:::touched
    Page --> Bet[BetControl.tsx]:::touched
    Hook --> Api[spinApi.ts]:::touched
    Api -->|POST /spin| Ctrl[spin.controller.ts]
    Ctrl --> Svc[spin.service.ts]:::touched
    Svc --> Val[bet.validator.ts]
    Svc --> Repo[player.repository.ts getBalance]
    classDef touched fill:#f96,color:#000
  ```
  Touched: `SlotGamePage` (error block and free-games prop), `useSlotGame` (lock, `betError`), `BetControl` (whole-number bet, `aria-describedby`), `spinApi` (typed rejection), `SpinService` (balance check). `validateBet`, the controller and `PlayerRepository` are unchanged.

  Test command, narrow forms: `(cd services/api && pnpm test -- src/spin/spin.service.spec.ts src/spin/spin.controller.spec.ts)` and `(cd apps/web && pnpm test -- src/slot src/components/BetControl.test.tsx)`.
review_focus: |
  IN: server balance check in `SpinService`, whole-number bet display, free-games lock input, rejection alert shown and cleared. OUT: the debit, wiring the page to the server balance, and where free-game state comes from. Riskiest part is the `SpinService` constructor change (every spec that builds it must pass a `PlayerRepository` stub) and the client/server balance mismatch noted in the open questions. Spin staying enabled after a rejection is deliberate (the design's stated gap), and the server wording is shown as-is.
