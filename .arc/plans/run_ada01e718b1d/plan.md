summary: |
  Landing 3, 4 or 5 scatters on a spin awards 10, 15 or 20 free games. The award is decided on the server inside the spin request, stored in a new `free_game_states` table in the same transaction as the spin record, and returned in the spin response. A new `GET /spin/free-games` endpoint returns the stored counter so a reload shows it again. A spin that lands scatters while free games are already in progress awards nothing (no re-trigger). The web app gets the approved "Slot game" screen: a reel grid, an award message, and a free-games counter. The counter appears only after the server answers and is restored from the server on load. Playing the free games, crediting winnings and decrementing the counter are the next story and are NOT in this plan.
scope:
  - description: |
      Scatter counting and award rule (pure functions, no I/O). In `spin.constants.ts` add the table and in `spin.evaluator.ts` the counter:

      ```ts
      export const FREE_GAMES_AWARD: Readonly<Record<3 | 4 | 5, number>> = { 3: 10, 4: 15, 5: 20 };

      export function countScatters(grid: Grid): number
      export function freeGamesForScatters(scatters: number): number // 0 when fewer than 3
      ```
      `countScatters` counts every cell equal to 'SCATTER' across all 3 rows and 5 reels (scatters pay anywhere, not on paylines).
    files:
      - services/api/src/spin/spin.constants.ts
      - services/api/src/spin/spin.evaluator.ts
    rationale: Keeps the award decision on the server and unit-testable. The existing evaluator already skips SCATTER on paylines, so counting is additive.
  - description: |
      Persist the free-game counter. New migration `002_free_game_states.sql` (tool-neutral, same style as 001):

      ```sql
      CREATE TABLE IF NOT EXISTS free_game_states (
        player_id uuid PRIMARY KEY,
        remaining integer NOT NULL CHECK (remaining >= 0),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ```
      Extend `SpinRepository` and `PgSpinRepository`:

      ```ts
      // before
      saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff): Promise<void>;
      // after
      saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff, freeGamesAward?: number): Promise<FreeGamesState>;
      getFreeGames(playerId: string): Promise<FreeGamesState>;

      export interface FreeGamesState { awarded: number; remaining: number }
      ```
      Inside the existing transaction, when `freeGamesAward > 0`, run one atomic statement so a concurrent spin cannot double-award or re-trigger:
      ```sql
      INSERT INTO free_game_states (player_id, remaining) VALUES ($1, $2)
      ON CONFLICT (player_id) DO UPDATE SET remaining = EXCLUDED.remaining, updated_at = now()
      WHERE free_game_states.remaining = 0
      RETURNING remaining
      ```
      A returned row means `awarded = freeGamesAward`; no row means free games were already in progress, so `awarded = 0`. In both cases `remaining` is read back (`SELECT remaining ... WHERE player_id = $1`, default 0). Put the type in `spin.record.ts`.
    files:
      - services/api/migrations/002_free_game_states.sql
      - services/api/src/spin/spin.repository.ts
      - services/api/src/spin/pg-spin.repository.ts
      - services/api/src/spin/spin.record.ts
    rationale: Server-side record is what makes AC6 (reload) and AC9 (no re-trigger) work. Same transaction as the spin record so a failed spin leaves no award.
  - description: |
      Service and controller. `SpinOutcome` gains `scatterCount: number` and `freeGames: FreeGamesState`. `SpinService.spin` computes `freeGamesForScatters(countScatters(grid))`, passes it to `saveWithJackpot`, and returns the repository's result. Add to `SpinController`:

      ```ts
      @Get('free-games')
      async freeGames(@Headers('x-guest-id') guestId: string | undefined): Promise<{ remaining: number }>
      ```
      It reuses the existing `x-guest-id` UUID check (extract it to a private `requireGuestId` helper). `GET /spin/free-games` is declared as its own route, so `@Controller('spin')` stays unchanged. The in-memory `MemoryRepo` in the existing specs must implement the new interface.
    files:
      - services/api/src/spin/spin.service.ts
      - services/api/src/spin/spin.controller.ts
    rationale: The spin response is the only source the UI shows an award from (AC5). The GET covers reload (AC6).
  - description: |
      Load the design system's component stylesheet once, next to the tokens. `apps/web/src/index.css` currently imports only `../../../design-system/tokens.css` (line 2). Add `@import "../../../design-system/prototype-utils.css";` on the next line. The prototype's classes (`.card`, `.badge`, `.badge-success`, `.alert`, `.alert-danger`, `.skeleton`, `.spinner`, `.btn`, `.btn-primary`, `.text-muted`) are defined there, not in the app.
    files:
      - apps/web/src/index.css
    rationale: Without this the classes the prototype uses have no definition in the app.
  - description: |
      Web data layer in `apps/web/src/game/` (mirrors the `fetchPatientSummary` / `usePatientSummary` pattern, base URL from `VITE_API_BASE_URL`):

      ```ts
      // guestId.ts  - reads/creates a UUID in localStorage ('slot-guest-id'), crypto.randomUUID()
      export function getGuestId(): string
      // spinApi.ts
      export type SpinResponse = { grid: string[][]; scatterCount: number; freeGames: { awarded: number; remaining: number } }
      export async function postSpin(bet: number, signal?: AbortSignal): Promise<SpinResponse>   // POST /spin, header x-guest-id
      export async function fetchFreeGames(signal?: AbortSignal): Promise<{ remaining: number }> // GET /spin/free-games
      // useSlotGame.ts
      export type GameState =
        | { status: 'idle'; remaining: number }
        | { status: 'submitting'; remaining: number }
        | { status: 'result'; spin: SpinResponse }
        | { status: 'error'; remaining: number }
      ```
      `useSlotGame` loads `fetchFreeGames` on mount and sets `remaining`. `spin(bet)` moves to `submitting`, and only on the server response moves to `result`; on rejection it moves to `error` and keeps `remaining` unchanged. Nothing about free games is derived on the client from the grid.
    files:
      - apps/web/src/game/guestId.ts
      - apps/web/src/game/spinApi.ts
      - apps/web/src/game/useSlotGame.ts
    rationale: Gives AC5 (award only after the server returns) and AC6 (counter restored from the server) a single place to be tested.
  - description: |
      Slot game UI, built from the approved prototype's "Slot game" screen (read in full: states default, submitting, awarded-3/4/5, no-award, in-progress, reloaded, error).

      - `ReelGrid` (new, named in the design): `.card` containing a 5-column grid (`grid-template-columns: repeat(5, 1fr)`, gap `--space-1`) of 15 tiles; tile is square, background `--color-bg-muted`, border `--border-width` solid `--color-border`, radius `--radius-md`, text `--font-size-lg` bold. A scatter tile uses `--color-warning-bg` / `--color-warning` and shows the `star` icon plus visually hidden text "Scatter", never colour alone. The grid has `role="img"` and an `aria-label` such as "Reels: 3 scatters". While submitting it shows 15 `.skeleton` tiles, `aria-busy="true"`, and a `role="status"` row with `.spinner` and "Spinning…" plus "Waiting for the server result. No free games are shown until it arrives."
      - Result message under the grid (`role="status"`, `--font-size-lg` heading, muted paragraph): "3 scatters: 10 free games awarded" (15 / 20 likewise) with "Spin result from the server."; "2 scatters: no free games this spin."; when `awarded === 0` but `scatterCount >= 3`, "3 scatters landed: no additional free games awarded." (AC9). Idle text: "Land 3, 4 or 5 scatters to win free games."
      - `FreeGamesCounter` (new, named in the design): `.card` with label "Free games" (muted), the number (`--font-size-xl`, bold, `aria-label="10 free games"`), and a `.badge .badge-success` "Saved on server". Rendered only when `remaining > 0`. Otherwise the side panel shows the muted line "No free games active."
      - Error state: `.alert .alert-danger` with role="alert", "The spin didn't complete." / "We couldn't reach the server, so no result or free games were recorded. Your balance is unchanged." and the spin button reads "Try again".
      - Layout: `.game-body` flex-wrap with `.game-main` (flex 1 1 320px) and a 200px `.side-panel` that goes full width at max-width 600px, implemented with Tailwind arbitrary values on the tokens (`gap-[var(--space-3)]`, etc.), the same way `App.tsx` uses `p-[var(--space-3)]`.
      - Bet row: reuse `BetControl` (existing). Add an optional `disabled?: boolean` prop (disables Spin during `submitting`, with the label from an optional `spinLabel`). Do not create another bet component.
      - `App.tsx` replaces the stub `<BetControl onSpin={() => {}} />` on the home view with `<SlotGamePage />`, which composes the above with `useSlotGame`. The local `balance` state stays as is (wallet is a separate story).
    files:
      - apps/web/src/game/SlotGamePage.tsx
      - apps/web/src/game/ReelGrid.tsx
      - apps/web/src/game/FreeGamesCounter.tsx
      - apps/web/src/components/BetControl.tsx
      - apps/web/src/App.tsx
    rationale: Implements the approved prototype. Reuses BetControl as the catalogue requires; ReelGrid and FreeGamesCounter are the two new components the design itself names, with no equivalent in the catalogue.
tests:
  - |
    AC1/AC2/AC3/AC4 (services/api/src/spin/spin.evaluator.spec.ts, written first, failing until `freeGamesForScatters` and `countScatters` exist):
    ```ts
    it.each([[3, 10], [4, 15], [5, 20], [2, 0], [0, 0]])('%i scatters award %i free games', (n, award) => {
      expect(freeGamesForScatters(n)).toBe(award);
    });
    it('counts scatters anywhere on the grid, not only on paylines', () => {
      const grid = gridWithScatterAt([[0, 0], [2, 1], [1, 4]]);
      expect(countScatters(grid)).toBe(3);
    });
    ```
  - |
    AC1-AC4 end to end on the server (services/api/src/spin/spin.service.spec.ts, using the in-memory repo and a stubbed grid generator with N scatters):
    ```ts
    const out = await service.spin('guest-1', 5);
    expect(out.scatterCount).toBe(3);
    expect(out.freeGames).toEqual({ awarded: 10, remaining: 10 });
    // 2 scatters:
    expect(out.freeGames).toEqual({ awarded: 0, remaining: 0 });
    ```
    One case each for 3, 4 and 5 scatters (10, 15, 20) and one for 2.
  - |
    AC5 server side (spin.service.spec.ts, spin.controller.spec.ts): the award is recorded together with the spin record and returned in the response, and a failing save awards nothing.
    ```ts
    repo.saveWithJackpot = async () => { throw new Error('db down'); };
    await expect(service.spin('guest-1', 5)).rejects.toThrow();
    expect((await repo.getFreeGames('guest-1')).remaining).toBe(0);
    ```
  - |
    AC6 reload (spin.controller.spec.ts for the route; pg-spin.repository.spec.ts, which is skipped unless TEST_DATABASE_URL is set, for storage):
    ```ts
    await service.spin(GUEST_ID, 5); // 3 scatters
    const res = await controller.freeGames(GUEST_ID);
    expect(res).toEqual({ remaining: 10 });
    await expect(controller.freeGames('not-a-uuid')).rejects.toBeInstanceOf(BadRequestException);
    ```
    Repository: `saveWithJackpot(rec, handoff, 10)` then `getFreeGames(playerId)` returns `{ awarded: 0, remaining: 10 }` from a fresh `PgSpinRepository` on the same pool. The migration test also inserts a pre-existing `spin_records` row (no free-game row) and asserts `getFreeGames` returns `remaining: 0` for that player, so existing players stay usable.
  - |
    AC9 no re-trigger (spin.service.spec.ts and pg-spin.repository.spec.ts):
    ```ts
    await service.spin('guest-1', 5);                 // 3 scatters, awards 10
    const second = await service.spin('guest-1', 5);  // 5 scatters while in progress
    expect(second.freeGames).toEqual({ awarded: 0, remaining: 10 });
    ```
    Pg: two concurrent `saveWithJackpot(..., 10)` for the same player via `Promise.all` leave `remaining` at 10 and exactly one call reports `awarded: 10`.
  - |
    AC5 on the web (apps/web/src/game/useSlotGame.test.tsx and SlotGamePage.test.tsx): a deferred `fetch` promise for POST /spin proves nothing is shown until it resolves.
    ```ts
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    expect(screen.getByText('Spinning…')).toBeInTheDocument();
    expect(screen.queryByText(/free games awarded/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/free games$/)).not.toBeInTheDocument();
    resolveSpin(threeScatterResponse);
    expect(await screen.findByText('3 scatters: 10 free games awarded')).toBeInTheDocument();
    ```
    Also asserts the request carries the `x-guest-id` header and the body is only `{ bet }`.
  - |
    AC1/AC2/AC3/AC7 web (SlotGamePage.test.tsx), `it.each` over 3/4/5 scatters:
    ```ts
    expect(await screen.findByText('4 scatters: 15 free games awarded')).toBeInTheDocument();
    expect(screen.getByLabelText('15 free games')).toHaveTextContent('15');
    ```
    ReelGrid.test.tsx: a scatter tile contains the text "Scatter" and the grid's aria-label names the scatter count.
  - |
    AC4/AC8 web (SlotGamePage.test.tsx): a response with 2 scatters shows no counter.
    ```ts
    expect(await screen.findByText('2 scatters: no free games this spin.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/free games$/)).not.toBeInTheDocument();
    expect(screen.getByText('No free games active.')).toBeInTheDocument();
    ```
  - |
    AC6 web (SlotGamePage.test.tsx and useSlotGame.test.tsx): on mount with GET /spin/free-games returning `{ remaining: 10 }` and no spin made, the counter is shown.
    ```ts
    render(<SlotGamePage />);
    expect(await screen.findByLabelText('10 free games')).toBeInTheDocument();
    ```
  - |
    AC9 web (SlotGamePage.test.tsx): with an initial `remaining: 10` and a spin response `{ scatterCount: 3, freeGames: { awarded: 0, remaining: 10 } }`:
    ```ts
    expect(await screen.findByText('3 scatters landed: no additional free games awarded.')).toBeInTheDocument();
    expect(screen.getByLabelText('10 free games')).toBeInTheDocument();
    ```
  - |
    Error state, supports AC5 (SlotGamePage.test.tsx): a rejected POST /spin shows the alert and "Try again", no award message and no counter, and a pre-existing counter value is unchanged.
    ```ts
    expect(await screen.findByRole('alert')).toHaveTextContent("The spin didn't complete.");
    ```
  - |
    Regression (apps/web/src/App.test.tsx): the existing fetch stub returns the patient profile for every URL, so change it to answer by URL (`/spin/free-games` returns `{ remaining: 0 }`, `/patients/me` the profile). The three existing App tests must still pass. Run narrow forms: `(cd services/api && pnpm test -- src/spin)` then `(cd apps/web && pnpm test -- src/game src/App.test.tsx src/components)`.
assumptions_or_open_questions:
  - |
    Deferred question (free-game persistence, from the epic): this plan stores the counter in PostgreSQL per guest id with no expiry, so an interrupted session can resume at any later time. It is what AC6 needs; no timeout or clean-up is built. A product decision on how long an unfinished free-game set stays valid is still needed before the free-game play story.
  - |
    Player identity is the existing `x-guest-id` UUID header, as the spin endpoint already uses. The web app has no guest id today, so the plan creates one in localStorage. Clearing browser storage loses the counter. No login or ownership check exists to prevent someone using another guest id. Real authentication is not part of this story.
  - |
    AC wording says "when the spin result is shown". The award is returned in the spin response and shown only after it arrives. Nothing is shown from a client-side guess.
  - |
    Scatter pays anywhere on the 3x5 grid (not on paylines), counted across all 15 cells. The scatter count and 10/15/20 table come from the AC. The reel strips contain placeholder SCATTER weights from the math epic and are not changed here.
  - |
    No re-trigger rule: while `remaining > 0`, a spin with 3+ scatters awards 0 and leaves `remaining` unchanged. Nothing in this story decrements the counter, so with only this story a player's counter stays at 10/15/20 and every later scatter spin is a no-award until the free-game play story lands. Reviewer should confirm that is acceptable to ship on its own.
  - |
    The prototype shows "Bet £1.00 (locked during free games)", the in-progress/reloaded Spin button turning into a toast, a £250.00 balance and a £ currency. Locking the bet and handling Spin during free games belong to the play story (the item says playing free games is separate), so this plan does not build them. Balance stays the existing local value, shown by BetControl in the same form as today (no currency symbol), and the prototype's sample £250.00 is not carried over.
  - |
    The prototype puts the screen under the Dashboard section of an app shell (sidebar and top bar). No shell exists in the app yet (App.tsx uses hash routes). The plan places the game on the home view where the stub BetControl is today, and does not build the shell or a dashboard entry link. Confirm that is acceptable.
  - |
    `design-system/tokens.css` line 68 has `--duration-fast: [object Object];`, which is an invalid CSS value, so transitions that use it are ignored. This does not affect the screens in this plan (no transitions are planned) but the token file needs fixing separately.
  - |
    The prototype's `.btn` / `.btn-primary` styles exist in `prototype-utils.css`. The plan reuses the existing `BetControl` markup (Tailwind classes today) rather than restyling it. Whether BetControl should be moved onto the `.btn-primary` class is left as is to avoid changing unrelated tests.
  - |
    The migration tool is still undecided (001 says so). 002 follows the same tool-neutral SQL file style, and the Pg repository spec applies it by reading the file, as it does for 001.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: new table only. `spin_records` and `jackpot_pools` are not altered, so every existing row stays readable. A player with no `free_game_states` row is treated as `remaining = 0`.
  - **Backfill / seed**: none. Past spins are not retroactively scanned for scatters. The migration uses `CREATE TABLE IF NOT EXISTS` and is safe to re-run.
  - **Settings**: none new. `DATABASE_URL` (API) and `VITE_API_BASE_URL` (web) are already used.
  - **Provisioning**: run `services/api/migrations/002_free_game_states.sql` against the database before the new API build starts.
  - **Order and rollback**: migrate, deploy API, then deploy web. The old web build ignores the new response fields. To roll back, redeploy the previous API and leave the table in place (unused), or `DROP TABLE free_game_states`.

  ### Design source

  The prototype (read in full) is one screen, "Slot game", with the states default, submitting, awarded-3/4/5, no-award, in-progress, reloaded and error. Tokens are loaded by `apps/web/src/index.css:2` (`@import "../../../design-system/tokens.css"`). The class definitions come from `design-system/prototype-utils.css`, which the app does not load yet, so the scope adds one import line after it. Tokens used: `--color-fg`, `--color-fg-muted`, `--color-bg-muted`, `--color-border`, `--color-warning`, `--color-warning-bg`, `--color-success`, `--color-success-bg`, `--color-danger`, `--color-danger-bg`, `--space-1`, `--space-3`, `--radius-md`, `--font-size-lg`, `--font-size-xl`, `--font-weight-bold`, `--border-width`, `--control-height-sm`. The prototype's reel and tile layout classes (`.reels`, `.tile`, `.game-body`, `.side-panel`) are only in its inline style, so they are expressed in the app with Tailwind arbitrary values on these tokens.

  ### Flow

  ```mermaid
  flowchart TD
    App[App.tsx] --> Page[SlotGamePage]
    Page --> Bet[BetControl]
    Page --> Reels[ReelGrid]
    Page --> Counter[FreeGamesCounter]
    Page --> Hook[useSlotGame]
    Hook --> Api[spinApi.ts]
    Api -->|POST /spin, GET /spin/free-games| Ctl[SpinController]
    Ctl --> Svc[SpinService]
    Svc --> Eval[spin.evaluator]
    Svc --> Repo[PgSpinRepository]
    Repo --> Tbl[(free_game_states)]
    classDef touched fill:#f96,color:#000
    class App,Page,Bet,Reels,Counter,Hook,Api,Ctl,Svc,Eval,Repo,Tbl touched
  ```

  `SpinService` decides the award, the repository stores it in the same transaction as the spin, and the web only displays what comes back. `SpinController` gains the GET used for reload.
review_focus: |
  IN scope: server-decided award (3/4/5 scatters give 10/15/20), its transactional storage, the reload endpoint, the no-re-trigger rule and the approved Slot game screen. OUT: playing free games, decrementing the counter, crediting winnings, bet locking, the app shell and wallet. Riskiest part is the atomic upsert in `PgSpinRepository.saveWithJackpot` (concurrent spins must not double-award) and the rule that the web shows an award only from the server response. Deliberate: the counter is never decremented here, so later scatter spins award nothing until the play story; persistence has no expiry (open question).
