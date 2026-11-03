summary: |
  Add a pure, server-side spin evaluator to the Application API (NestJS, vitest): given a 3x5 grid and a bet it applies 10 fixed paylines, wild substitution, 3/4/5-of-a-kind left-to-right evaluation, scatter/wild exclusions, per-payline stake (bet / 10) and half-up rounding to cents. Bet validation (allowed 1, 2, 3, 5, 10 and not above balance) is a pure function in the API and mirrored by a small BetControl in the web app that shows an inline error and blocks the spin. Grid generation, RTP tuning and scatter free games are out of scope. The item says "the proposed paytable" but supplies no values, so the paytable is a single typed config file with placeholder values flagged as an open question.
scope:
  - description: |
      Symbol set, paytable and paylines as data. Symbols are ten regular symbols (ids S1..S10, S1 the top payer), WILD and SCATTER. The paytable is stored as multipliers of the per-payline stake in thousandths (integers, to avoid float error).
      ```ts
      export type RegularSymbol = 'S1'|'S2'|'S3'|'S4'|'S5'|'S6'|'S7'|'S8'|'S9'|'S10';
      export type Symbol = RegularSymbol | 'WILD' | 'SCATTER';
      export type Grid = Symbol[][]; // [row 0..2][reel 0..4]
      export const PAYLINES: readonly (readonly [number,number,number,number,number])[]; // row index per reel, length 10
      export const PAYTABLE_MILLI: Record<RegularSymbol, Record<3|4|5, number>>;
      export const TOP_PAYING_SYMBOL: RegularSymbol; // 'S1'
      export const ALLOWED_BETS = [1, 2, 3, 5, 10] as const;
      ```
    files:
      - services/api/src/spin/spin.constants.ts
    rationale: |
      Keeps the rules in one reviewable place so the real paytable can be swapped in without touching evaluation logic.
  - description: |
      Evaluator. Pure function, no randomness, no I/O.
      ```ts
      export interface PaylineWin { payline: number; symbol: RegularSymbol; count: 3|4|5; win: number; }
      export interface SpinResult { stakePerLine: number; wins: PaylineWin[]; totalWin: number; }
      export function evaluateSpin(grid: Grid, bet: number): SpinResult;
      ```
      Per payline: read the 5 symbols. If the first symbol is SCATTER, the line does not pay (wilds never stand in for scatter, and scatter is never a line symbol). Otherwise the base symbol is the first non-wild symbol; if it is SCATTER the line only counts the leading wilds. Count consecutive reels from reel 1 that are the base symbol or WILD. If the whole line is WILD, count = 5 and base = TOP_PAYING_SYMBOL. A count of 3, 4 or 5 pays the paytable amount for that count only (the longest run, never summed with shorter ones). Fewer than 3 or a run not starting at reel 1 pays nothing. A line that starts with wilds also gets the better of (leading wilds as TOP_PAYING_SYMBOL) and (wilds as the first regular symbol). Scatter anywhere pays nothing. Stake per line is bet / 10. Per-line wins are NOT rounded: each is kept exact as an integer in thousandths of a cent (stake cents * milli multiplier), and the per-line `win` reported is that exact amount in currency units. Rounding happens once, on the total: sum the exact integers, then round half-up to cents with integer arithmetic (1.125 becomes 1.13). `totalWin` is the rounded total.
      ```ts
      export function roundHalfUpCents(exactMilliCents: number): number; // integer in, currency units out
      ```
    files:
      - services/api/src/spin/spin.evaluator.ts
    rationale: |
      Covers ACs 1-6, 11-17. Pure function makes it trivially unit-testable and reusable by the later outcome-generation work.
  - description: |
      Bet validation, pure and shared by the API surface.
      ```ts
      export type BetCheck = { ok: true } | { ok: false; message: string };
      export function validateBet(bet: unknown, balance: number): BetCheck;
      ```
      Invalid when the bet is not one of ALLOWED_BETS or is above the balance; both produce the same single error message and the same rule. No balance mutation happens in this function.
    files:
      - services/api/src/spin/bet.validator.ts
    rationale: |
      Covers ACs 7-10 on the server side, where the real balance lives.
  - description: |
      Web BetControl: bet input, Spin button, inline error (role alert) rendered next to the input. It mirrors the validator rules locally (the web app has no shared package with the API, so the constant list is duplicated and noted in a comment). Props are balance and onSpin(bet). On invalid bet it shows the error, does not call onSpin, and does not change the displayed balance. On valid bet it calls onSpin(bet). Wire it into App with a local balance state, with no network call (no spin endpoint exists in this item).
      ```tsx
      export function BetControl(props: { balance: number; onSpin: (bet: number) => void }): JSX.Element
      ```
    files:
      - apps/web/src/components/BetControl.tsx
      - apps/web/src/components/BetControl.test.tsx
      - apps/web/src/App.tsx
    rationale: |
      ACs 7-10 describe the player pressing Spin with an inline error next to the bet control; that is a UI behaviour. Styling uses tailwind, following App.tsx.
  - description: |
      Unit tests written first (vitest, files match the existing src/**/*.spec.ts include in services/api/vitest.config.ts).
    files:
      - services/api/src/spin/spin.evaluator.spec.ts
      - services/api/src/spin/bet.validator.spec.ts
    rationale: |
      TDD order: each spec is written and seen failing before the matching module.
tests:
  - |
    AC1, evaluator, payline 0 (middle row) shows S3 on reels 1-3 and no wild, other symbols not matching any line.
    ```ts
    const r = evaluateSpin(gridWithLine(0, ['S3','S3','S3','S5','S6']), 10);
    expect(r.wins).toEqual([{ payline: 0, symbol: 'S3', count: 3, win: PAYTABLE_MILLI.S3[3] / 1000, }]);
    ```
  - |
    AC2, four of a kind pays the 4 amount.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['S3','S3','S3','S3','S6']), 10).wins[0].win).toBe(PAYTABLE_MILLI.S3[4] / 1000);
    ```
  - |
    AC3, five of a kind pays the 5 amount.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['S3','S3','S3','S3','S3']), 10).wins[0].win).toBe(PAYTABLE_MILLI.S3[5] / 1000);
    ```
  - |
    AC4, two matching then a different regular symbol pays nothing.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['S3','S3','S4','S5','S6']), 10).wins).toEqual([]);
    ```
  - |
    AC5, wild on reel 3 completes three of a kind.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['S3','S3','WILD','S5','S6']), 10).wins[0]).toMatchObject({ symbol: 'S3', count: 3 });
    ```
  - |
    AC6, two winning paylines are both paid and the total is their sum (grid built so only paylines 0 and 1 win).
    ```ts
    const r = evaluateSpin(twoLineGrid, 10);
    expect(r.wins.map(w => w.payline)).toEqual([0, 1]);
    expect(r.totalWin).toBeCloseTo(r.wins[0].win + r.wins[1].win, 2);
    ```
    Plus a rounding-on-total case: two lines each worth exactly 0.005 (total 0.01) must give 0.01, where per-line rounding would give 0.02.
  - |
    AC7, validator rejects bets outside 1,2,3,5,10 and bets above balance with the same message, and the BetControl shows it inline.
    ```ts
    expect(validateBet(4, 100)).toEqual({ ok: false, message: expect.any(String) });
    expect(validateBet(10, 5)).toEqual(validateBet(4, 100));
    // web
    await user.clear(input); await user.type(input, '4'); await user.click(screen.getByRole('button', { name: 'Spin' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    ```
  - |
    AC8, no spin starts on an invalid bet.
    ```ts
    expect(onSpin).not.toHaveBeenCalled();
    ```
  - |
    AC9, balance is unchanged after a rejected spin.
    ```ts
    expect(screen.getByTestId('balance')).toHaveTextContent('100.00');
    ```
  - |
    AC10, a bet of 5 with a covering balance is played.
    ```ts
    expect(validateBet(5, 100)).toEqual({ ok: true });
    expect(onSpin).toHaveBeenCalledWith(5);
    ```
  - |
    AC11, five wilds on a payline pay five of the top-paying symbol.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['WILD','WILD','WILD','WILD','WILD']), 10).wins[0])
      .toMatchObject({ symbol: TOP_PAYING_SYMBOL, count: 5, win: PAYTABLE_MILLI[TOP_PAYING_SYMBOL][5] / 1000 });
    ```
  - |
    AC12, two scatters then a wild on a payline pay nothing.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['SCATTER','SCATTER','WILD','S5','S6']), 10).wins).toEqual([]);
    ```
  - |
    AC13, three scatters anywhere with no wild pay nothing for scatter.
    ```ts
    expect(evaluateSpin(gridWithScatters3NoLineWin, 10).totalWin).toBe(0);
    ```
  - |
    AC14, bet 10 gives a stake of 1.00 per payline.
    ```ts
    expect(evaluateSpin(anyGrid, 10).stakePerLine).toBe(1);
    ```
  - |
    AC15, a total win of exactly 1.125 is rounded to 1.13 (half up), applied to the total only.
    ```ts
    expect(roundHalfUpCents(112500)).toBe(1.13); // 1.125 in thousandths of a cent
    ```
  - |
    AC16, five of a kind pays only the five amount, not 3 plus 4 plus 5.
    ```ts
    const r = evaluateSpin(gridWithLine(0, ['S3','S3','S3','S3','S3']), 10);
    expect(r.wins).toHaveLength(1);
    expect(r.wins[0].count).toBe(5);
    ```
  - |
    AC17, a run on reels 2-4 only pays nothing.
    ```ts
    expect(evaluateSpin(gridWithLine(0, ['S5','S3','S3','S3','S6']), 10).wins).toEqual([]);
    ```
  - |
    Narrow run commands for the implementer, derived from the configured test command.
    ```sh
    (cd services/api && pnpm test -- src/spin) && (cd apps/web && pnpm test -- src/components/BetControl.test.tsx)
    ```
assumptions_or_open_questions:
  - |
    OPEN (blocks production math): paytable values and units (bet multiplier vs currency amount). Reviewer direction: placeholders for design/review only; the game math owner must supply the final values and unit before implementation. Placeholders live only in spin.constants.ts.
  - |
    OPEN (blocks production math): the 10 payline shapes. Reviewer direction: use a standard 10-payline layout for the prototype; the game designer/math team must confirm the final definitions.
  - |
    Settled for the prototype: symbols are placeholders S1..S10 with S1 the highest payer, until artwork and names are approved.
  - |
    Settled: the selected bet is the total stake split equally over the 10 paylines (bet 10 gives 1.00 per line). Paytable amounts are treated as multipliers of the per-line stake until the unit is confirmed.
  - |
    Settled: wilds substitute for regular symbols (never scatter) and a wild-led line pays the highest-value resulting combination. AC11 (five wilds pay five of the top symbol) is kept as the only wild-specific payout; any other dedicated wild payouts need separate confirmation and are not planned.
  - |
    Settled: rounding is half-up to cents on the final total win only, never per payline. Per-line wins are kept exact.
  - |
    Confirmed: no spin API or persistent wallet/balance store exists, so ACs 7-10 use the pure validator plus a web BetControl with local balance state. Backend spin processing, balance updates, RTP validation, jackpot accounting and transaction persistence are deferred to a future game-engine/API story. All open items above must be finalized before production game math is implemented.
  - |
    Deferred questions on spin record retention, concurrent player count and round history retention do not affect this item, since nothing is stored. They remain open for the owning epics.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  None — pure calculation code and a UI component, with no stored data, schema, migration, seed or setting.

  Reuse and conventions: the API is NestJS with vitest specs next to the code (src/**/*.spec.ts, see health.controller.spec.ts); the web app is React, Vite and tailwind with vitest and testing-library. The evaluator is a plain module rather than a Nest provider because it has no dependencies, so a later controller or service can import it directly.

  ```mermaid
  flowchart TD
    A[spin.constants.ts<br/>symbols, paylines, paytable] --> B[spin.evaluator.ts<br/>evaluateSpin]
    A --> C[bet.validator.ts<br/>validateBet]
    D[App.tsx<br/>existing, wires control] --> E[BetControl.tsx<br/>inline bet error]
    F[app.module.ts<br/>existing, untouched] -.-> B
    classDef touched fill:#f96,color:#000
    class A,B,C,D,E touched
  ```
  The dotted edge is only context: app.module.ts is not changed.
review_focus: |
  IN: pure evaluator, paytable and payline data, bet validation, and a minimal web BetControl. OUT: grid generation, RTP tuning, free games, persistence and any spin endpoint. Riskiest area is the wild and scatter edge handling and half-up rounding, which is applied once to the total (per-line wins stay exact, integer arithmetic, no floats). The paytable, payline layout and symbol names are deliberate placeholders pending the game math owner and designer.
