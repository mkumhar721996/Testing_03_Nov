summary: |
  Most of this story already exists in `services/api/src/spin/`: a CSPRNG reel generator (`reel.generator.ts`), a 10-payline evaluator with wild substitution and bet/10 per line (`spin.evaluator.ts`), a `SpinService` that generates the grid on the server and persists it, and a `spin_records` table. The real gap is AC11: the stored record holds bet and grid but NOT the total win. This plan adds `totalWin` to the spin record end to end (evaluate before save, new nullable `total_win` column via migration 002, repository read/write, legacy rows recomputed from grid and bet), and closes the remaining test gaps for ACs 2, 8, 9 and 11 so every AC has a named, passing test. No new packages, no UI.
scope:
  - description: |
      Add `totalWin: number` to the spin record.

      ```ts
      export interface SpinRecord {
        id: string; playerId: string; bet: number; grid: Grid;
        totalWin: number;            // new (AC11)
        jackpotTrigger: boolean; spunAt: Date;
      }
      ```
    files:
      - services/api/src/spin/spin.record.ts
    rationale: AC11 requires the stored record to hold the bet, the 3x5 grid and the total win.
  - description: |
      In `SpinService.spin`, call `evaluateSpin(grid, bet)` BEFORE `repo.saveWithJackpot`, pass `totalWin: evaluation.totalWin` in the record, and return that same `evaluation` (one evaluation, so stored and returned win cannot differ).
    files:
      - services/api/src/spin/spin.service.ts
    rationale: Today the evaluation runs only after the save, so the win never reaches storage.
  - description: |
      Migration 002, idempotent and tool-neutral like 001:

      ```sql
      ALTER TABLE spin_records ADD COLUMN IF NOT EXISTS total_win numeric(10,2);
      ```

      Nullable on purpose so rows written before this story stay valid. `PgSpinRepository.saveWithJackpot` inserts `total_win` (new `$n` parameter). `findByPlayer` maps `total_win` to `totalWin`; when it is NULL (legacy row) it returns `evaluateSpin(r.grid, Number(r.bet)).totalWin`, so old rows read back with the correct win. Add `total_win: string | null` to `SpinRow`.
    files:
      - services/api/migrations/002_spin_total_win.sql
      - services/api/src/spin/pg-spin.repository.ts
    rationale: Persist the win without locking out or misreporting existing rows.
  - description: |
      Test-only additions (written first, see `tests`): evaluator cases for AC2 (explicit 1 unit per line at bet 10), AC8 (WILD, WILD, SCATTER) and AC9 (3 matching symbols on a non-payline row). Service and repository specs updated for `totalWin`; existing `record()` helper in the pg spec gains `totalWin`, and its `beforeAll` also runs migration 002.
    files:
      - services/api/src/spin/spin.evaluator.spec.ts
      - services/api/src/spin/spin.service.spec.ts
      - services/api/src/spin/pg-spin.repository.spec.ts
      - services/api/src/spin/spin.controller.spec.ts
    rationale: Several ACs (2, 8, 9, 11) have no dedicated test today.
tests:
  - |
    AC1 (existing, keep green) in reel.generator.spec.ts: one randomInt draw per reel over that reel's strip length, 3x5 grid, valid symbols, crypto.randomInt and no Math.random.
    `REEL_STRIPS.forEach((strip, i) => expect(spy).toHaveBeenNthCalledWith(i + 1, strip.length));`
  - |
    AC2 NEW in spin.evaluator.spec.ts: at bet 10 each line pays paytable multiple x 1 unit.
    `const r = evaluateSpin(gridWithLine(3, ['S2','S2','S2','S5','S6']), 10);`
    `expect(r.stakePerLine).toBe(1);`
    `expect(r.wins[0].win).toBe(PAYTABLE_MILLI.S2[3] / 1000);`
  - |
    AC3 (existing, 'pays five of a kind') keep: `expect(r.wins).toHaveLength(1); expect(r.wins[0].count).toBe(5);`
  - |
    AC4 (existing) keep: three, four and five of a kind pay PAYTABLE_MILLI[symbol][count] / 1000 on a line starting at reel 1.
  - |
    AC5 (existing) keep: `expect(evaluateSpin(gridWithLine(0, ['S3','S3','S4','S5','S6']), 10).wins).toEqual([]);`
  - |
    AC6 (existing, 'run on reels 2-4 only') keep: `expect(evaluateSpin(gridWithLine(0, ['S5','S3','S3','S3','S6']), 10).wins).toEqual([]);`
  - |
    AC7 (existing) keep: `expect(evaluateSpin(gridWithLine(0, ['S3','S3','WILD','S5','S6']), 10).wins[0]).toMatchObject({ symbol: 'S3', count: 3 });`
  - |
    AC8 NEW in spin.evaluator.spec.ts (the existing test covers SCATTER, SCATTER, WILD, not this order):
    `expect(evaluateSpin(gridWithLine(0, ['WILD','WILD','SCATTER','S5','S6']), 10).wins).toEqual([]);`
  - |
    AC9 NEW in spin.evaluator.spec.ts: three S3 on reels 1-3 in a zig-zag (rows 0,1,0) that is not a payline prefix, with scatter filler that cannot win.
    `const grid = gridWithLines({}); grid[0][0] = 'S3'; grid[1][1] = 'S3'; grid[0][2] = 'S3';`
    `expect(PAYLINES.some((p) => p[0] === 0 && p[1] === 1 && p[2] === 0)).toBe(false);`
    `expect(evaluateSpin(grid, 10).totalWin).toBe(0);`
    The first assertion makes the test fail loudly if the confirmed paylines ever include that shape.
  - |
    AC10 (existing, 'pays two winning paylines and sums them') keep: `expect(r.totalWin).toBeCloseTo(r.wins[0].win + r.wins[1].win, 2);`
  - |
    AC11 NEW in spin.service.spec.ts (fails first because SpinRecord has no totalWin and the service saves before evaluating):
    `const out = await service.spin('guest-1', 5);`
    `expect(repo.saved[0]).toMatchObject({ bet: 5, grid: out.grid, totalWin: out.evaluation.totalWin });`
    plus a winning-grid case using a fixed grid with a known line, `expect(repo.saved[0].totalWin).toBeGreaterThan(0)`.
  - |
    AC11 NEW in pg-spin.repository.spec.ts (runs only when TEST_DATABASE_URL is set): save a record with `totalWin: 12.5`, then `expect(found).toMatchObject({ bet: 5, grid: rec.grid, totalWin: 12.5 });`
  - |
    Existing rows stay readable (migration test, same file): after running 001 only, insert a legacy row with raw SQL without total_win, run 002, then
    `const [found] = await repo.findByPlayer(playerId); expect(found.totalWin).toBe(evaluateSpin(found.grid, found.bet).totalWin);`
    and running 002 twice does not error (idempotent).
assumptions_or_open_questions:
  - |
    RNG (deferred question): the existing generator uses node:crypto randomInt, a CSPRNG that returns uniform values without modulo bias. It is called once per reel with that reel's strip length, so the five stops are independent. The plan keeps this and adds no package. A reviewer should confirm that satisfies the project's security requirement.
  - |
    Spin record retention (project-wide, deferred): not answerable from the code or the architecture docs (I found no retention rule in the ADR index). This plan adds no purge or TTL job. A human must supply the standard period; it should be a separate story.
  - |
    PAYLINES, PAYTABLE_MILLI and REEL_STRIPS in spin.constants.ts are marked PLACEHOLDER (layout, multipliers and strips awaiting the game designer). AC2 says payout is paytable multiple x 1 unit; the existing table stores multiples in thousandths. This plan does not change them; the RTP and final values are the separate RTP story.
  - |
    AC1 says the response shows one reel stop per reel. The response currently returns the 3x5 grid (each reel's visible window is 3 consecutive strip positions from the server-drawn stop) but not the stop indices. I treated the grid as satisfying the AC and did not change the GRID_GENERATOR contract (that would churn the service and controller specs). If the stop indices must be in the response, say so and I will add them.
  - |
    Legacy rows get total_win by recomputation from the stored grid and bet, using the current paytable. If the placeholder paytable changes later, un-backfilled legacy rows would read differently. Alternative is a one-off backfill script that writes the value; not planned because the table is pre-release.
  - |
    The scatter free-game trigger is out of scope (Free games epic); jackpotTrigger on the record is from an earlier story and is left untouched.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: migration `services/api/migrations/002_spin_total_win.sql` adds a NULLABLE `total_win numeric(10,2)` to `spin_records`, so no existing row is rejected or rewritten. `PgSpinRepository.findByPlayer` recomputes the win from grid and bet when the column is NULL, so old rows read back correctly.
  - **Backfill / seed**: none. `ADD COLUMN IF NOT EXISTS` is safe to re-run. Adding a nullable column without a default is a metadata-only change in PostgreSQL, so it takes no long table lock.
  - **Settings**: none new. `DATABASE_URL` (already required by `app.module.ts`) and `TEST_DATABASE_URL` (tests) are unchanged.
  - **Provisioning**: nothing new. The project's migration tool is still undecided (001 says so), so 002 is plain SQL applied the same way 001 is.
  - **Order and rollback**: apply 002 BEFORE deploying the new code, since the new INSERT names `total_win`. Rollback: old code ignores the extra column, so it can stay; to remove it, `ALTER TABLE spin_records DROP COLUMN total_win;`.

  ### Findings

  The evaluator, generator, constants, controller and `bet.validator` already implement ACs 1-10 (verified by reading `services/api/src/spin/*` and their specs). Work here is the AC11 gap plus the missing AC2/8/9 tests.

  ```mermaid
  flowchart TD
    C[spin.controller.ts] --> S[spin.service.ts]
    S --> G[reel.generator.ts]
    S --> E[spin.evaluator.ts]
    S --> R[spin.repository.ts interface]
    R --> P[pg-spin.repository.ts]
    P --> M[(002_spin_total_win.sql)]
    S --> REC[spin.record.ts]
    classDef touched fill:#f96,color:#000
    class S,P,M,REC touched
  ```

  Touched: `spin.service.ts` (evaluate before save), `spin.record.ts` (totalWin field), `pg-spin.repository.ts` (persist and read total_win), the migration (new column).
review_focus: |
  IN: persisting `totalWin` on the spin record (service, record type, repository, migration 002) and the missing evaluator/service/repository tests for ACs 2, 8, 9, 11. OUT: RTP tuning, final paytable/strips/paylines (placeholders by design), free-game trigger, retention policy, exposing reel stop indices. Riskiest part is the migration and legacy-row handling (nullable column, recompute on read); also check the service evaluates once, before saving, so the stored and returned win are identical.
