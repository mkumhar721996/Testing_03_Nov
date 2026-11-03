summary: |
  Add a server-side spin pipeline to the Application API (NestJS, `services/api/src/spin`). A `POST /spin` endpoint takes only a bet (any client-sent grid is ignored), draws the 3x5 reel grid from a `node:crypto` CSPRNG over weighted reel strips, runs the existing `evaluateSpin` for context, and stores one spin record (grid, bet, player identifier, time of spin, jackpot trigger flag) in PostgreSQL. In the same database transaction it hands the spin's jackpot contribution (and any trigger) to the shared jackpot pools with an atomic increment, so concurrent guest spins are each counted exactly once. Win rules, RTP tuning and pool growth/award rules stay out of scope (owned by other epics); this story supplies the seams they plug into.
scope:
  - description: |
      Reel-strip data and a seedable-for-tests random source. Add `REEL_STRIPS` (5 weighted strips of `Symbol`) to constants (PLACEHOLDER weights, tunable later toward 96% RTP) and a `ReelGenerator` that picks each reel's stop with an injected `RandomInt` (default `crypto.randomInt`).
      ```ts
      export type RandomInt = (maxExclusive: number) => number;
      export function generateGrid(randomInt: RandomInt = crypto.randomInt): Grid; // Grid[row 0..2][reel 0..4]
      ```
      Each reel takes 3 consecutive (wrapping) positions from its strip starting at the random stop.
    files:
      - services/api/src/spin/spin.constants.ts
      - services/api/src/spin/reel.generator.ts
    rationale: |
      AC2 and the deferred RNG question. Strips (not per-cell draws) let the symbol weights be tuned and the RTP verified by enumeration later without touching code.
  - description: |
      Spin record storage. Add a `SpinRecord` type and a `SpinRepository` port, plus a PostgreSQL implementation and a migration for table `spin_records`.
      ```ts
      export interface SpinRecord { id: string; playerId: string; bet: number; grid: Grid; jackpotTrigger: boolean; spunAt: Date; }
      ```
      Migration SQL `001_spin_records.sql`: `spin_records(id uuid pk, player_id uuid not null, bet numeric(10,2) not null, grid jsonb not null, jackpot_trigger boolean not null, spun_at timestamptz not null default now())` plus `jackpot_pools(pool text pk, amount numeric(18,2) not null default 0)`; no pool rows are seeded until the product owner supplies pool names. Apply it through the migration tool the project standardises on (open blocker); do not start this unit before that is decided.
    files:
      - services/api/src/spin/spin.record.ts
      - services/api/src/spin/spin.repository.ts
      - services/api/src/spin/pg-spin.repository.ts
      - services/api/migrations/001_spin_records.sql
      - services/api/package.json
    rationale: |
      AC3, AC5, AC6. The repository port keeps unit tests free of a database; the pg adapter is covered by an integration spec.
  - description: |
      Jackpot hand-off seam. Define `JackpotHandoff { pool: string; contribution: number; trigger: boolean }` and a `JackpotPolicy` port (`decide(grid, bet): JackpotHandoff`) with a PLACEHOLDER default that the Progressive Jackpot epic replaces (rate, trigger and pool names await the product owner). `PgSpinRepository.saveWithJackpot(record, handoff)` runs one transaction: insert the spin record, then `UPDATE jackpot_pools SET amount = amount + $1 WHERE pool = $2` (atomic increment, no read-modify-write).
      ```ts
      saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff): Promise<void>
      ```
    files:
      - services/api/src/spin/jackpot.handoff.ts
      - services/api/src/spin/pg-spin.repository.ts
    rationale: |
      AC4, AC5, AC6 and the concurrency question. Record plus pool increment in one transaction means a spin is either fully counted once or not at all; row-level locking by the UPDATE serialises concurrent guests.
  - description: |
      `SpinService.spin(playerId, bet)` orchestrates the bet check against `ALLOWED_BETS` (no balance), generateGrid, JackpotPolicy, saveWithJackpot, and returns `{ grid, bet, evaluation: evaluateSpin(grid, bet), jackpotTrigger }`. `SpinController` exposes `POST /spin` with body `{ bet }` and an `x-guest-id` UUID header (400 when missing or not a UUID, with a controller spec `expect(res.status).toBe(400)`); the DTO has no grid field and extra properties (including `grid`) are ignored, never read. Register in `AppModule` with providers for the repository, generator and policy.
      ```ts
      spin(playerId: string, bet: number): Promise<SpinOutcome>
      ```
    files:
      - services/api/src/spin/spin.service.ts
      - services/api/src/spin/spin.controller.ts
      - services/api/src/app.module.ts
    rationale: |
      AC1, AC2. The grid is produced only inside the service, so there is no path for client input to reach it.
package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_application_api
    rationale: PostgreSQL driver (stack decision is postgresql) for the spin record table and the transactional jackpot pool increment; no DB driver exists in the API today.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_application_api
    rationale: Types for pg under strict TypeScript.
tests:
  - |
    AC1 - services/api/src/spin/spin.service.spec.ts (write first, fails until SpinService exists). The client grid is never used:
    ```ts
    const clientGrid = [0,1,2].map(() => Array(5).fill('S1'));
    const out = await service.spin(GUEST_ID, 5, { grid: clientGrid } as never); // extra arg is ignored
    expect(out.grid).not.toEqual(clientGrid);
    expect(repo.saved[0].grid).toEqual(out.grid);
    ```
    Plus a controller spec: POST /spin with body `{ bet: 5, grid }` returns a grid produced by the injected (stubbed) generator, e.g. `expect(res.body.grid).toEqual(stubGrid)`.
  - |
    AC2 - services/api/src/spin/reel.generator.spec.ts. Shape and source:
    ```ts
    const grid = generateGrid(() => 0);
    expect(grid).toHaveLength(3);
    grid.forEach((row) => expect(row).toHaveLength(5));
    ```
    With a stub `randomInt` assert it is called once per reel with the strip length (`expect(spy).toHaveBeenCalledTimes(5)`) and that every cell is a valid `Symbol`; assert a source check that the default is `crypto.randomInt` (no `Math.random` in reel.generator.ts via a grep-style test).
  - |
    AC3 - services/api/src/spin/pg-spin.repository.spec.ts (integration against Postgres, skipped with a clear message when no test DB URL is set) and the service spec with an in-memory repo:
    ```ts
    const [rec] = await repo.findByPlayer('guest-1');
    expect(rec).toMatchObject({ playerId: 'guest-1', bet: 5, grid: out.grid });
    expect(rec.spunAt).toBeInstanceOf(Date);
    ```
  - |
    AC4 - pg-spin.repository.spec.ts. Two spins in parallel by different guests, each contributing 0.05:
    ```ts
    await Promise.all([
      repo.saveWithJackpot(recA, { pool: 'test-pool', contribution: 0.05, trigger: false }),
      repo.saveWithJackpot(recB, { pool: 'test-pool', contribution: 0.05, trigger: false }),
    ]);
    expect(await repo.poolAmount('test-pool')).toBeCloseTo(before + 0.10, 2);
    ```
    Also assert a failed insert leaves the pool unchanged (transaction rolled back, so no double or phantom count).
  - |
    AC5 - spin.service.spec.ts with a policy stub returning trigger true:
    ```ts
    policy.decide = () => ({ pool: 'test-pool', contribution: 0.05, trigger: true });
    await service.spin('guest-1', 5);
    expect(repo.saved[0].jackpotTrigger).toBe(true);
    ```
  - |
    AC6 - same spec with a stub returning trigger false:
    ```ts
    policy.decide = () => ({ pool: 'test-pool', contribution: 0.05, trigger: false });
    await service.spin('guest-1', 5);
    expect(repo.saved[0].jackpotTrigger).toBe(false);
    ```
  - |
    Regression - run the narrow forms of the project command, for example `cd services/api && pnpm vitest run src/spin` and then `pnpm typecheck`, to confirm the existing evaluator and bet validator specs still pass.
assumptions_or_open_questions:
  - |
    RESOLVED (reviewer) - Guest identifier - the client generates a UUID on first launch and stores it locally until account creation or sign-in exists. The API reads it from an `x-guest-id` header and rejects a missing or non-UUID value with 400. Issuing and storing the id in the web app is not part of this plan (server-side story); it needs the Game Client story, or a follow-up, to send the header.
  - |
    BLOCKER (product/game math owner) - Jackpot contribution rate, trigger mechanism and pool names (Grand, Major, Minor, Mini or alternatives) must be supplied before implementation. Until then the plan only builds the seam, with a clearly-marked PLACEHOLDER `JackpotPolicy`, and pool names are data (rows in `jackpot_pools`, passed in `JackpotHandoff`), not hard-coded, so no name is assumed. The migration seeds no pool rows until names are given.
  - |
    CONFIRMED PLACEHOLDER - Reel strip weights do not guarantee 96% RTP. Final strips and weights must be supplied and mathematically validated by the game math owner; this plan does not tune or verify RTP.
  - |
    OPEN BLOCKER (project) - Migration tooling is not yet standardised (for example Flyway, Liquibase or another approved tool). Database work (`migrations/001_spin_records.sql`, `PgSpinRepository` integration) must not start until one is chosen. The SQL is written tool-neutral so it can move into the chosen tool; the service, generator and controller work is independent and uses the in-memory repository.
  - |
    OPEN DEPENDENCY - Balance and wallet ownership is to be clarified with the Game Client/Wallet story. This plan does not debit or store balances and does not call `validateBet` with a balance; it only checks the bet is one of `ALLOWED_BETS`, to avoid duplicating wallet work.
  - |
    OPEN (project) - Spin record retention is undecided pending compliance, audit and operational requirements. The plan assumes no retention period and adds no purge or expiry job or column. Concurrent-player count is also still open; row-level locking on the pool UPDATE is assumed enough for the under 100 users in ADR-0004.
estimated_points: 5
notes: |
  ### Data & rollout
  - **Existing data**: New tables only (`spin_records`, `jackpot_pools`); no existing table or row is altered.
  - **Backfill / seed**: No pool rows are seeded until the product owner supplies pool names; the seed (idempotent, `on conflict do nothing`) is added then. No backfill. The migration tool is an open project decision, so the SQL is tool-neutral.
  - **Settings**: New `DATABASE_URL` env var, no safe default (the API refuses to start spins without it; unit tests use the in-memory repository). Document it in services/api/README or `.env.example` if one exists.
  - **Provisioning**: A PostgreSQL database reachable from the API (comp_relational_database, RDS) and the migration applied.
  - **Order and rollback**: Run the migration before deploying the new API code. Rollback: drop the two new tables (nothing else reads them), or leave them in place, since they are additive and unused by old code.

  Findings: `services/api/src/spin` already holds `evaluateSpin`, `validateBet`, `PAYLINES`, `PAYTABLE_MILLI` and the `Grid` type; this plan reuses them and does not change evaluation rules. `AppModule` currently registers only `HealthController`. The API has no DB driver, so `pg` is the one new dependency. Tests use vitest (specs sit beside sources); the e2e dir `services/api/test/e2e` uses playwright.

  ```mermaid
  flowchart TD
    Client[Web client] -->|POST /spin bet only| SC[spin.controller.ts]
    SC --> SS[spin.service.ts]
    SS --> VB[bet.validator.ts]
    SS --> RG[reel.generator.ts]
    SS --> SE[spin.evaluator.ts]
    SS --> JH[jackpot.handoff.ts]
    SS --> PR[pg-spin.repository.ts]
    RG --> SK[spin.constants.ts]
    AM[app.module.ts] --> SC
    classDef touched fill:#f96,color:#000
    class SC,SS,RG,JH,PR,SK,AM touched
  ```
review_focus: |
  IN scope - server-side grid generation, the stored spin record, and the transactional hand-off of contribution and trigger flag to the shared pools. OUT - win rules, RTP tuning, pool growth/award rules, balance/wallet handling, record retention, and client-side guest id issuing. The database unit is gated on the open migration-tool decision and the jackpot pool names/rate. The riskiest part is the concurrent pool increment: check it is a single atomic SQL UPDATE inside the same transaction as the record insert. Placeholder reel weights, the placeholder jackpot policy and the guest-id header are deliberate seams and open questions, not defects.
