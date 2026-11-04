summary: |
  Replace the PLACEHOLDER paytable (PAYTABLE_MILLI) and reel strips (REEL_STRIPS) in services/api/src/spin/spin.constants.ts with tuned values, make both injectable so tests can change them (ACs 2-4), and add a deterministic return-to-player (RTP) simulator that settles 10,000,000 spins on all 10 fixed paylines and prints a report stating that (ACs 1, 5). The tuned values are found offline with an exact-enumeration helper and then locked by a vitest check that the seeded 10M-spin simulation lands within 96% +/- 0.1 percentage points. Placeholder markers and wording are removed from the paytable and strips (AC6).
scope:
  - description: |
      Make the game math configurable without changing behaviour. Add optional parameters that default to the live constants:
      ```ts
      // reel.generator.ts
      export function generateGrid(randomInt: RandomInt = cryptoRandomInt, strips: readonly (readonly Symbol[])[] = REEL_STRIPS): Grid
      // spin.evaluator.ts
      export function evaluateSpin(grid: Grid, bet: number, paytable: Paytable = PAYTABLE_MILLI): SpinResult
      ```
      Export a `Paytable` type (`Record<RegularSymbol, Record<3 | 4 | 5, number>>`) from spin.constants.ts. evaluateLine takes the paytable as an argument instead of reading the module constant. Line, wild and scatter rules stay untouched.
    files:
      - services/api/src/spin/spin.constants.ts
      - services/api/src/spin/reel.generator.ts
      - services/api/src/spin/spin.evaluator.ts
    rationale: |
      ACs 2-4 need a changed paytable or strip to flow through settlement and reel draws. Default arguments keep existing callers (spin.service.ts) and specs unchanged.
  - description: |
      Replace the placeholder values. Rewrite PAYTABLE_MILLI and REEL_STRIPS as explicit, documented, adjustable data: one explicit strip per reel (reels may differ), declared via a small `strip({ S1: 2, ... })` weight helper or literal arrays. Delete the PLACEHOLDER comments and PLACEHOLDER_STRIP for the paytable and strips. The PAYLINES comment keeps the "provisional pending game designer confirmation" note because the item says line patterns are unconfirmed, but it is no longer called a placeholder for the paytable and strips. Values are derived with the tuning helper in the next item, aiming at an exact analytic RTP of 96.000% (+/-0.02pp) and a volatility low enough that the 10M-spin standard error is about 0.03pp or less, so the +/-0.1pp check is not luck-dependent.
    files:
      - services/api/src/spin/spin.constants.ts
    rationale: AC6 and the core of AC1. The paytable shape (thousandths of the per-line stake) is unchanged, so persisted spin records and the controller stay compatible.
  - description: |
      Add an RTP module with a pure, seedable simulator and an exact calculator:
      ```ts
      export interface RtpReport { spins: number; paylinesSettled: 10; totalStake: number; baseGameWin: number; freeGameWin: number; rtp: number; }
      export function simulateRtp(opts: { spins: number; bet: number; seed: number; strips?: ...; paytable?: Paytable }): RtpReport
      export function exactBaseGameRtp(strips, paytable): number   // enumerates every stop combination
      export function formatRtpReport(r: RtpReport): string        // includes "Settled on all 10 fixed paylines"
      ```
      The simulator uses a seeded PRNG (mulberry32 or similar) passed as the `randomInt` argument to generateGrid and settles each grid with evaluateSpin, so it exercises the production evaluation path on all PAYLINES. It accumulates in integer cents or milli-cents to avoid float drift. A CLI entry (`pnpm rtp:report`, a `tsx` or vitest-free node script, no new dependency if possible, otherwise run via vitest) prints formatRtpReport for 10,000,000 spins. exactBaseGameRtp is a tuning aid and cross-check only; it must not be used by production request paths.
    files:
      - services/api/src/spin/rtp.simulator.ts
      - services/api/src/spin/rtp.report.ts
      - services/api/package.json
    rationale: ACs 1 and 5. Deterministic seed makes the 10M check repeatable in CI; the exact figure guards against a lucky seed.
tests:
  - |
    AC1 — rtp.simulator.spec.ts (write first; fails against the placeholder values):
    ```ts
    const r = simulateRtp({ spins: 10_000_000, bet: 10, seed: 1 });
    expect(Math.abs(r.rtp - 0.96)).toBeLessThanOrEqual(0.001);
    expect(r.spins).toBe(10_000_000);
    expect(r.baseGameWin + r.freeGameWin).toBeCloseTo(r.rtp * r.totalStake, 2);
    ```
    plus a cross-check that the exact value is tight, `expect(Math.abs(exactBaseGameRtp(REEL_STRIPS, PAYTABLE_MILLI) - 0.96)).toBeLessThanOrEqual(0.0002)`, and a second seed (`seed: 2`) also within tolerance. Set a long vitest timeout (e.g. `it(..., 120_000)`).
  - |
    AC2 — spin.evaluator.spec.ts: with a custom table `{ ...PAYTABLE_MILLI, S3: { 3: 7000, 4: 11000, 5: 55000 } }`, a line of S3,S3,S3,S5,S6 at bet 10 (stake 1.00 per line) gives
    `expect(evaluateSpin(grid, 10, custom).wins[0].win).toBe(7)`; and the default table still pays 3.
  - |
    AC3 — reel.generator.spec.ts: with strips where reel 1 is `['S2','S2','S2']`, for every stop `randomInt` returns (0..n-1) assert `expect(grid.map(r => r[0]).every(s => s === 'S2')).toBe(true)`; also over 1,000 seeded draws every shown symbol per reel is in `new Set(strips[reel])`.
  - |
    AC4 — spin.evaluator.spec.ts, run with a changed paytable: 2-of-a-kind pays nothing (`['S1','S1','S5','S6','S7']` gives `[]`), 3/4/5 pay left to right from reel 1 (`['S5','S5','S5','S5','S5']` has `count` 5), a line not starting on reel 1 pays nothing (`['S6','S1','S1','S1','S1']`), WILD substitutes (`['S4','WILD','S4','S9','S2']` pays 3 of S4), and SCATTER is never substituted (`['S4','SCATTER','WILD','S4','S4']` gives `[]`); also assert `PAYLINES.length === 10`. Existing AC cases stay green.
  - |
    AC5 — rtp.report.spec.ts: `const text = formatRtpReport(simulateRtp({ spins: 1000, bet: 10, seed: 1 }))`; `expect(text).toMatch(/all 10 fixed paylines/i)` and `expect(simulateRtp({ spins: 1000, bet: 10, seed: 1 }).paylinesSettled).toBe(10)`. A spy on evaluateSpin confirms each settled spin evaluates PAYLINES (length 10).
  - |
    AC6 — spin.constants.spec.ts: read spin.constants.ts source and `expect(src).not.toMatch(/PLACEHOLDER/)` for the paytable and strips sections, `expect(REEL_STRIPS).toHaveLength(5)`, every strip non-empty with only valid symbols, and every paytable entry a positive integer with 3 < 4 < 5 payouts per symbol.
assumptions_or_open_questions:
  - |
    BLOCKER TO CONFIRM: no free-game feature exists in the code (grep for free/bonus found nothing; SCATTER is only a non-paying, non-substitutable symbol, and there is no trigger rule, spin count or multiplier). AC1 says to count free-game wins. This plan reports `freeGameWin` as a separate field that is currently 0 and tunes base-game RTP to 96%. If free games must contribute to the 96%, the free-game rules (scatter trigger count, number of free spins, multiplier, retrigger) must be specified or split into their own story; the retuning then changes the base share.
  - |
    Line patterns (PAYLINES), paytable and wild rules are provisional pending game designer confirmation, per the item. The paytable multiplies the per-line stake in thousandths, kept unchanged in shape. The wild-first rule (leading wild counts as the top-paying symbol, best of candidates) is kept as is.
  - |
    "Tuned" values are produced by the implementer with the exact-enumeration helper, so the final numbers are not pre-specified here; the game designer should review them. Strips may differ per reel.
  - |
    The 10M simulation takes several seconds to tens of seconds in vitest. Assumed acceptable to keep in the normal test run with an extended timeout; if too slow, move it to a separate `test:rtp` script (the CLI report is run anyway). The seed is fixed for repeatability; tolerance is +/-0.1pp as stated.
  - |
    Simulation uses bet 10 (stake 1.00 per line) so cent rounding of stakePerLine and totalWin is negligible; RTP at other allowed bets is the same up to rounding. Assumed fine.
  - |
    The deferred project-wide question on spin record retention is not relevant to this change (no storage changes) and is left for the Spin records story.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  None — constants and an offline simulator only. No schema, stored shape, setting or env var changes. Existing spin records store symbols, counts and win amounts, which stay valid; the paytable unit (thousandths of stake per line) is unchanged. Rollback is reverting the constants.

  Existing context read: spin.constants.ts (PAYLINES, PAYTABLE_MILLI, REEL_STRIPS with PLACEHOLDER comments), reel.generator.ts (crypto randomInt, 3 wrapping rows per stop), spin.evaluator.ts (stake per line = round(bet*100/10) cents, wild rules, scatter never pays), jackpot.handoff.ts (a separate placeholder owned by the Progressive Jackpot epic; out of scope here). Tests use vitest (`pnpm test` in services/api); narrow form is `cd services/api && pnpm vitest run src/spin/rtp.simulator.spec.ts`.

  ```mermaid
  flowchart TD
    C[spin.constants.ts: tuned PAYTABLE and REEL_STRIPS]:::touched
    G[reel.generator.ts: strips parameter]:::touched
    E[spin.evaluator.ts: paytable parameter]:::touched
    S[rtp.simulator.ts: seeded 10M run and exact RTP]:::touched
    R[rtp.report.ts: report text]:::touched
    V[spin.service.ts: existing caller, unchanged]
    G --> C
    E --> C
    S --> G
    S --> E
    R --> S
    V --> G
    V --> E
    classDef touched fill:#f96,color:#000
  ```
review_focus: |
  IN: tuned PAYTABLE_MILLI and REEL_STRIPS, injectable paytable and strips, seeded RTP simulator with report. OUT: new free-game mechanics, jackpot, payline changes, storage. Riskiest: free-game wins are counted in AC1 but no free-game feature exists; the plan reports it as 0 and flags it as an open question, so check how that is resolved. Defaults on the new parameters are deliberate so production callers behave identically; the 10M check is deterministic by seed and backed by an exact enumeration to avoid a lucky pass.
