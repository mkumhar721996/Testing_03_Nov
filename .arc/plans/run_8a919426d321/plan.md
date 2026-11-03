summary: |
  Build the patient "Add reading" flow end to end. In the Web App (React + Vite + Tailwind): a Log entry in the navigation opens an Add reading form (Type, Value with the type's unit, Date defaulting to today and capped at today, Note) with per-type range validation, Save/Cancel, a double-tap-safe in-flight guard, inline failure and offline errors that keep the entered values, and a dismissible "Reading saved" toast that stays until dismissed and is shown on the Health dashboard after a save. In the Application API (NestJS + PostgreSQL): a `readings` module serving the per-type limits (`GET /reading-types`) and saving a reading (`POST /readings`), re-validating the same limits server-side, scoped to the patient and tenant, and idempotent on a client-generated request id so a double tap or a retry never creates a duplicate. Dashboard stats and trend, and edit or delete of saved readings, are out of scope.

scope:
  - description: |
      Step 0, a hard prerequisite. The real min, max and unit for each reading type must come from Product/Domain experts. They are not in the item, and this plan does not invent them. Put them in ONE API-side config file, `READING_TYPES`, that is the single source of truth. The web form reads them from `GET /reading-types`, so the numbers are never duplicated in the web app.

      Shape:

      ```ts
      export type ReadingTypeId = string; // ids supplied by Product, e.g. 'weight', 'blood-pressure'
      export interface ValueFieldLimits { key: 'value' | 'systolic' | 'diastolic'; label: string; unit: string; min: number; max: number }
      export interface ReadingTypeConfig { id: ReadingTypeId; label: string; fields: ValueFieldLimits[] } // 1 field, or 2 for Blood pressure
      export const READING_TYPES: ReadingTypeConfig[]
      ```

      Unit tests use their own injected fixture list, never the production numbers, so the tests do not change when Product revises a limit.
    files:
      - services/api/src/readings/reading-types.config.ts
    rationale: |
      The decision "each of the five types must have a defined minimum, maximum and unit before implementation" is a settled constraint. One server-owned list avoids web/API drift.

  - description: |
      API validation, written test-first as a pure function with no Nest dependency, so the spec instantiates it directly like `health.controller.spec.ts` does.

      ```ts
      export interface ReadingInput { type: string; values: Record<string, unknown>; date: string; note?: string }
      export type ValidationResult = { ok: true } | { ok: false; field: string; message: string }
      export function validateReading(input: ReadingInput, types: ReadingTypeConfig[], todayUtc: Date): ValidationResult
      ```

      Rules:
      - The type must be known.
      - Every field of the type must be present and a finite number. Blood pressure requires both systolic and diastolic.
      - min <= v <= max, inclusive.
      - The message is `Enter a value between {min} and {max} {unit}.` (for Blood pressure it names the field, e.g. `Systolic must be between ...`).
      - Date must match YYYY-MM-DD and be no later than `todayUtc + 1 day`. The 1-day slack tolerates patients ahead of UTC, and the web form enforces the exact local "today".
      - Note is at most 500 characters.
    files:
      - services/api/src/readings/reading-validation.ts
      - services/api/src/readings/reading-validation.spec.ts
    rationale: Server is authoritative (ACs 4-6, 16, 17). Pure function keeps it cheap to test at the boundaries.

  - description: |
      Persistence port, service, Postgres adapter, controller, module wiring.

      ```ts
      export const READINGS_REPOSITORY = Symbol('READINGS_REPOSITORY');
      export interface ReadingsRepository {
        // Inserts, or returns the existing row when (tenantId, patientId, clientRequestId) already exists.
        create(r: NewReading): Promise<{ reading: StoredReading; created: boolean }>;
      }
      // ReadingsService.save(ctx: { tenantId: string; patientId: string }, dto: CreateReadingDto): Promise<{ reading: StoredReading; created: boolean }>
      // Controller: GET /reading-types -> ReadingTypeConfig[]; POST /readings -> 201 on create, 200 on idempotent replay, 400 { field, message } on invalid
      ```

      Constructors use an explicit `@Inject(READINGS_REPOSITORY)` because vitest/esbuild does not emit decorator metadata. Specs build the service and controller with `new` and an in-memory fake repository.

      The patient and tenant come from a `@CurrentPatient()` param decorator that reads `request.auth` (`{ tenantId, patientId }`) set by the App shell / patient access dependency's token guard (ADR-0012). With no `request.auth` it throws 401. Do NOT read a patient id from the body, a header or a query string. If that dependency's guard is not merged when this is implemented, stop and raise it. Do not stub a trusting header.

      Add `pg` and a `PostgresReadingsRepository` that reads `DATABASE_URL`. `READINGS_REPOSITORY` is bound to the Postgres adapter in `ReadingsModule`. `ReadingsModule` is added to `AppModule.imports`.
    files:
      - services/api/src/readings/readings.repository.ts
      - services/api/src/readings/postgres-readings.repository.ts
      - services/api/src/readings/in-memory-readings.repository.ts
      - services/api/src/readings/readings.service.ts
      - services/api/src/readings/readings.service.spec.ts
      - services/api/src/readings/readings.controller.ts
      - services/api/src/readings/readings.controller.spec.ts
      - services/api/src/readings/current-patient.decorator.ts
      - services/api/src/readings/readings.module.ts
      - services/api/src/app.module.ts
      - services/api/package.json
    rationale: |
      Answers the deferred question "how is a double tap on Save prevented from creating duplicates": the server enforces it with a unique idempotency key, and the client guard (below) is only the first line of defence. Tenant and patient scoping follow ADR-0003 (tenant ID column) and ADR-0011/0012.

  - description: |
      Migration for the readings table. There is no migration tool in the repo today (I read `services/api/package.json` and `src/`: only Nest + vitest), so ship a plain SQL file.

      ```sql
      CREATE TABLE readings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        patient_id uuid NOT NULL,
        client_request_id uuid NOT NULL,
        type text NOT NULL,
        value numeric NOT NULL,
        value_secondary numeric NULL,          -- diastolic for Blood pressure
        unit text NOT NULL,
        recorded_on date NOT NULL,
        note text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, patient_id, client_request_id)
      );
      CREATE INDEX readings_patient_date_idx ON readings (tenant_id, patient_id, recorded_on DESC);
      ```

      The index is there for the later dashboard stats/trend epic. No foreign key to patients, because that table belongs to the dependency and is not in this repo.
    files:
      - services/api/migrations/0001_create_readings.sql
    rationale: New table only, so no existing rows are affected. The unique key backs the idempotency guarantee.

  - description: |
      Web: load the design tokens once. `apps/web/src/index.css` is only `@import "tailwindcss";` and `main.tsx:3` imports it, so the app does not load `design-system/tokens.css` today. Add, after the Tailwind import:

      ```css
      @import "../../../design-system/tokens.css";
      @import "../../../design-system/prototype-utils.css";
      ```

      `prototype-utils.css` holds the project's standard components (`.field`, `.input`, `.select`, `.btn-*`, `.toast`, `.alert`, `.stack`, `.is-invalid`, all built only from `var(--token)`), so the form reuses them instead of re-implementing them. If Vite's dev server refuses the path outside `apps/web`, add `server.fs.allow` for the repo root in `apps/web/vite.config.ts`.
    files:
      - apps/web/src/index.css
      - apps/web/vite.config.ts
    rationale: UI guidelines require styling only from tokens, and the app does not load them yet.

  - description: |
      Web: app frame and navigation (ACs 1, 19, 21). `App.tsx` is a placeholder `<h1>Web App</h1>`, so there is no shell, router or nav to extend.

      Add the smallest frame the sketch needs:
      - `AppHeader` with the sketch's `header`, `logo` ("Health") and `main-nav` (`nav-home` "Home", `nav-log` "Log"). The active item gets `aria-current="page"`. Home and Log are the only items needed for this item's flows. The sketch also draws Appointments, which belongs to another item.
      - `App` holds `view: 'dashboard' | 'log'` in `useState`. Log opens the form from any view. No router package is added.
      - A minimal `DashboardScreen` (h1 "Health dashboard") that only exists as the cancel/save landing target. Stats and trend belong to the Daily health overview epic.
      - `App` also owns the toast state (`toast: 'reading-saved' | null`) and renders `<Toast>` outside the screens, so it survives the log to dashboard switch.

      If the App shell / patient access dependency has landed with a real header or router by implementation time, reuse it and drop `AppHeader`, `App` view state and the stub.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/src/components/AppHeader.tsx
      - apps/web/src/components/Toast.tsx
      - apps/web/src/components/Toast.test.tsx
      - apps/web/src/screens/DashboardScreen.tsx
    rationale: |
      Sketch screens `dashboard` (state: landing target only), the `header`/`main-nav` elements, and the `saved-toast`.
      Styling: header uses `--color-bg`, `--color-border`, `--space-3`, `--font-weight-bold`, with the active link in `--color-primary`. The Toast uses `.toast` with `role="status"`, `--toast-width`, `--space-3`, `--color-fg`/`--color-bg`, and a `.btn-ghost.btn-sm` "Dismiss" button. It has no auto-dismiss timer (ACs 22, 23).

  - description: |
      Web: reading types and client validation. The client fetches limits from `GET /reading-types` and validates with the same rules as the server.

      ```ts
      export function validateField(f: ValueFieldLimits, raw: string): { valid: boolean; blank: boolean; message?: string }
      export function isFormValid(type: ReadingTypeConfig | undefined, raw: Record<string, string>, date: string, today: string): boolean
      export function todayLocal(now?: Date): string // YYYY-MM-DD in the device's local time
      ```

      The out-of-range message is `Enter a value between {min} and {max} {unit}.` and is the same text as the server's.

      Also add the API client:

      ```ts
      export async function fetchReadingTypes(): Promise<ReadingTypeConfig[]>
      export async function saveReading(body: SaveReadingBody): Promise<void> // throws SaveError { kind: 'offline' | 'failed' | 'invalid' }
      ```

      A fetch `TypeError` or a non-2xx response throws `failed`. `navigator.onLine === false` is checked before any request and throws `offline` without calling the network.
    files:
      - apps/web/src/features/readings/readingTypes.ts
      - apps/web/src/features/readings/readingTypes.test.ts
      - apps/web/src/features/readings/readingsApi.ts
      - apps/web/src/features/readings/readingsApi.test.ts
    rationale: Isolates the logic of ACs 4-6, 8, 11-17, 25-29 from rendering, so it is testable with no DOM.

  - description: |
      Web: the Add reading screen, which builds sketch screen `log-reading` and its `log-reading-saved` state and the `log-to-saved` flow.

      Layout (UI guidelines: title with the primary action on the right, one primary button per screen):
      - breadcrumbs "Today / Add reading"
      - `h1` "Add reading"
      - `.stack` form of `.field` blocks: `reading-type` as `.select`, label "Type", placeholder option "Choose type"; `reading-value` as `.input` (`inputMode="decimal"`), label "Value"; `reading-date` as `.input type="date"` with `max={todayLocal()}` and `value` defaulting to today; `reading-note` as `.input`, label "Note", placeholder "Optional".
      - The unit is shown next to the Value input in a `.field-hint`-styled suffix (`--font-size-sm`, `--color-fg-muted`), and is associated with the input via `aria-describedby`.
      - Blood pressure swaps Value for two fields, "Systolic" and "Diastolic", each with "mmHg" beside it.
      - `form-actions` row with `justify-content: space-between` (`.cluster`): `cancel-reading` `.btn.btn-ghost` "Cancel" and `save-reading` `.btn.btn-primary` "Save reading".
      - Types skeleton: while `GET /reading-types` is loading, the Type select is replaced by a `.skeleton`. If loading fails, a `.alert.alert-danger` (page-level problem) offers "Try again".

      Behaviour:
      - Save is `disabled` unless `isFormValid` (ACs 11-15, 24).
      - Out-of-range or blank-after-touch values get `.is-invalid`, `aria-invalid="true"`, and a `.field-error` with `role="alert"` stating range and unit, in `--color-danger` (ACs 5, 6).
      - A typed date after today is `.is-invalid` with the message "Choose today or an earlier date." (AC 9, with `max` covering the picker).
      - Double-tap guard. The component keeps `savingRef = useRef(false)`. The submit handler returns immediately if `savingRef.current` is true, sets it synchronously BEFORE the first `await`, and clears it in `finally`. The same state drives `disabled` on Save (AC 24), with the `.spinner` shown in the button. A `clientRequestId = crypto.randomUUID()` is created once when the form mounts and reused on a retry after failure, so the server dedupes even if the guard were bypassed.
      - On success it calls `onSaved()`. `App` sets `toast='reading-saved'`, switches to the dashboard, and the dialog unmounts (ACs 20, 21).
      - On `offline` it shows an inline `.field-error`/`.alert` text on the form: "You're offline. Reconnect, then press Save reading." On `failed` it shows "We couldn't save your reading. Check your connection and try again." Both leave every field value in place and leave Save enabled (ACs 25-29). An `invalid` response from the server shows the server's message on the named field.
      - Cancel calls `onCancel()` with no network call, and `App` returns to the dashboard (ACs 18, 19).

      Styling uses only: `--space-1/2/3/4`, `--color-danger`, `--color-fg-muted`, `--color-border-strong`, `--control-height-md`, `--font-size-sm`, `--radius-md`, `--opacity-disabled`, `--focus-ring-width`, `--color-focus`, all via the `design-system` component classes above. No colour or pixel literals.
    files:
      - apps/web/src/screens/AddReadingScreen.tsx
      - apps/web/src/screens/AddReadingScreen.test.tsx
    rationale: |
      Builds every element id of the sketch's `log-reading` screen (`reading-form`, `reading-type`, `reading-value`, `reading-date`, `reading-note`, `form-actions`, `cancel-reading`, `save-reading`). Sketch gaps filled from the ACs: BP two-field layout, unit hint, error and offline states, loading state of the type list.

  - description: |
      Playwright e2e for the flows the unit tests cannot cover, with the API mocked via `page.route`: Log in the navigation to the form, a valid save landing on the dashboard with the toast, Cancel, and an offline save keeping the values (using `context.setOffline(true)`).
    files:
      - apps/web/e2e/log-reading.spec.ts
    rationale: Covers ACs 1, 19, 21, 22, 28 across real navigation. The existing `app.spec.ts` asserts the old "Web App" heading, so it must be updated to the new landing view.

tests:
  - |
    AC1 (App.test.tsx): Log opens the form from the dashboard.
    ```tsx
    render(<App />); await user.click(screen.getByRole('link', { name: 'Log' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Add reading' })).toBeInTheDocument()
    ```
    Add a case that clicks Log while the form is already on the saved/dashboard view and still lands on the form.
  - |
    AC2 + AC8 + AC9 (AddReadingScreen.test.tsx): fields and date.
    ```tsx
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Value')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue(todayLocal())
    expect(screen.getByLabelText('Date')).toHaveAttribute('max', todayLocal())
    ```
    Use `vi.useFakeTimers().setSystemTime(...)` so "today" is deterministic. Also a typed future date gives `aria-invalid` and a disabled Save.
  - |
    AC3 + AC7: unit shown next to the value; Blood pressure shows two fields (fixture types injected via a mocked `fetchReadingTypes`).
    ```tsx
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    expect(screen.getByText('kg')).toBeInTheDocument()   // fixture unit
    await user.selectOptions(screen.getByLabelText('Type'), 'Blood pressure')
    expect(screen.getByLabelText('Systolic')).toBeInTheDocument()
    expect(screen.getByLabelText('Diastolic')).toBeInTheDocument()
    expect(screen.getAllByText('mmHg')).toHaveLength(2)
    ```
  - |
    AC4 + AC10 + AC16 + AC17 (readingTypes.test.ts and AddReadingScreen.test.tsx): in-range, exact min and exact max values are accepted and saved, with Note empty.
    ```ts
    for (const raw of [String(f.min), String(f.max), mid]) expect(validateField(f, raw).valid).toBe(true)
    // screen: type + value, click Save -> expect(saveReading).toHaveBeenCalledWith(expect.objectContaining({ note: undefined }))
    ```
  - |
    AC5 + AC6: below min and above max are rejected with a message stating range and unit.
    ```ts
    expect(validateField(f, String(f.min - 1))).toEqual({ valid: false, blank: false, message: `Enter a value between ${f.min} and ${f.max} ${f.unit}.` })
    expect(validateField(f, String(f.max + 1)).message).toBe(`Enter a value between ${f.min} and ${f.max} ${f.unit}.`)
    ```
    Screen test: `expect(await screen.findByRole('alert')).toHaveTextContent(/between .* and .* kg/)` and the Value input has `aria-invalid="true"`.
  - |
    AC11-AC15: Save-enabled matrix (AddReadingScreen.test.tsx).
    ```tsx
    const save = screen.getByRole('button', { name: 'Save reading' })
    expect(save).toBeDisabled()                          // AC11 no type
    // choose type, Value blank          -> toBeDisabled()   AC12
    // BP, only systolic typed           -> toBeDisabled()   AC13
    // every field in range              -> toBeEnabled()    AC14
    // value outside range               -> toBeDisabled()   AC15
    ```
  - |
    AC18 + AC19: Cancel saves nothing and shows the dashboard (App.test.tsx).
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(saveReading).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Health dashboard' })).toBeInTheDocument()
    ```
  - |
    AC20 + AC21: after a successful save the dashboard and the toast are shown (App.test.tsx).
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Save reading' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Reading saved')
    expect(screen.getByRole('heading', { name: 'Health dashboard' })).toBeInTheDocument()
    ```
  - |
    AC22 + AC23 (Toast.test.tsx): the toast persists and can be dismissed.
    ```tsx
    vi.useFakeTimers(); render(<Toast message="Reading saved" onDismiss={onDismiss} />)
    vi.advanceTimersByTime(60_000)
    expect(screen.getByRole('status')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' })); expect(onDismiss).toHaveBeenCalledOnce()
    ```
    App-level: after Dismiss, `queryByRole('status')` is null.
  - |
    AC24 + double tap (AddReadingScreen.test.tsx): Save is disabled while saving, and two rapid clicks produce one request with one `clientRequestId`.
    ```tsx
    saveReading.mockReturnValue(new Promise(() => {}))   // never resolves
    await user.dblClick(save)
    expect(saveReading).toHaveBeenCalledTimes(1)
    expect(save).toBeDisabled()
    ```
  - |
    AC25 + AC26 + AC27: after a failed save the values stay, an inline error shows, and Save is enabled.
    ```tsx
    saveReading.mockRejectedValue(new SaveError('failed'))
    await user.click(save)
    expect(await screen.findByText(/couldn't save your reading/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Value')).toHaveValue('70')
    expect(save).toBeEnabled()
    ```
    A retry reuses the same `clientRequestId`: `expect(saveReading.mock.calls[1][0].clientRequestId).toBe(saveReading.mock.calls[0][0].clientRequestId)`.
  - |
    AC28 + AC29 (readingsApi.test.ts and AddReadingScreen.test.tsx): offline.
    ```ts
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(saveReading(body)).rejects.toMatchObject({ kind: 'offline' })
    expect(fetch).not.toHaveBeenCalled()
    ```
    Screen: `expect(await screen.findByText(/reconnect/i)).toBeInTheDocument()` and the entered Value is still shown.
  - |
    API (reading-validation.spec.ts): boundaries and Blood pressure, with the fixture list.
    ```ts
    expect(validateReading(valid(fx.min), FIXTURE, today)).toEqual({ ok: true })
    expect(validateReading(valid(fx.min - 1), FIXTURE, today)).toMatchObject({ ok: false, field: 'value' })
    expect(validateReading(bp({ systolic: 120 }), FIXTURE, today)).toMatchObject({ ok: false, field: 'diastolic' })
    expect(validateReading({ ...valid(fx.min), date: '2999-01-01' }, FIXTURE, today)).toMatchObject({ ok: false, field: 'date' })
    ```
  - |
    API (readings.service.spec.ts + readings.controller.spec.ts): idempotency and scoping.
    ```ts
    const a = await service.save(ctx, dto); const b = await service.save(ctx, dto)
    expect(b.reading.id).toBe(a.reading.id)
    expect(a.created).toBe(true); expect(b.created).toBe(false)
    expect(repo.count()).toBe(1)
    await expect(service.save({ ...ctx, patientId: 'other' }, dto)).resolves.toMatchObject({ created: true })  // same request id, different patient
    expect(() => controller.create(undefined as any, dto)).toThrow(UnauthorizedException)
    ```
    Controller maps invalid input to `BadRequestException({ field, message })` and `GET /reading-types` returns the config.
  - |
    Update `apps/web/e2e/app.spec.ts` (asserts the old "Web App" heading) and add `apps/web/e2e/log-reading.spec.ts`, which covers Log in the navigation to the form, save to the dashboard with the toast, Cancel, and offline keeping the values.

assumptions_or_open_questions:
  - |
    BLOCKER (confirmed by reviewer): the exact min, max and unit for each reading type must be provided by Product/Domain experts before implementation of the config file (the first scope item). The plan does not invent clinical ranges. Tests use fixtures, so test-writing can proceed, but the feature must not ship with guessed numbers.
  - |
    OPEN, owner is the Product/clinical owner (reviewer confirmed): the sketch's Type select lists four types (Weight, Blood pressure, Steps, Sleep). The project-wide decision says five types, with example units bpm, °C, mg/dL, mmHg and kg, which implies other types (e.g. heart rate, temperature, glucose). The plan follows the server config, so the list is whatever Product supplies, but a human must confirm the final set and ids. Steps and Sleep also need a unit and an integer/decimal rule.
  - |
    RESOLVED (reviewer approved): follow AC 21. After a save the user returns to the Health dashboard with the "Reading saved" toast, even though the sketch's `log-reading-saved` screen keeps the form title. The toast is hosted at app level. The sketch's `saved-to-dashboard` exit via `nav-home` is covered since Home is in the nav.
  - |
    RESOLVED (reviewer approved): follow the header navigation in the sketch and ACs (Home, Log), not the sidebar described in the UI guidelines.
  - |
    ACKNOWLEDGED (reviewer): the story depends on authentication, patient context and database infrastructure that are not in this repo. Implementation may assume `request.auth = { tenantId, patientId }` exists (ADR-0012) and returns 401 without it, and adds a minimal header, view state and dashboard stub to make Log reachable. The story cannot be fully integrated until those dependencies are available.
  - |
    CONFIRMED GATE (reviewer): migration tooling, database conventions and `DATABASE_URL` standards are not defined and must be established BEFORE the database changes are implemented. The migration SQL, `PostgresReadingsRepository` and the `pg` dependency are a draft shape pending that. Steps 1-2 of the implementation order (validation, service, controller, in-memory repository) and all web work do not depend on it and can proceed. Whether `patient_id` needs a foreign key once the patients table exists is still open.
  - |
    The sketch's Save carries the open note "Is a reading saved offline if there is no connection?". The ACs (28, 29) answer it: no. There is no offline queue in this release. An offline Save shows an inline reconnect error and keeps the values.
  - |
    Date handling: the web enforces local "today". The server allows up to UTC today plus 1 day to tolerate timezones ahead of UTC. Dates in the past have no lower bound, because no AC sets one. Note is capped at 500 characters, which is my assumption.
  - |
    Decimals: values accept decimals (`inputMode="decimal"`, finite numbers only) unless Product says a type is integer-only (for example Steps).
  - |
    ACKNOWLEDGED (reviewer): `design-system/tokens.css` contains `--duration-fast: [object Object]`, an invalid generated value used by `.btn` transitions in `prototype-utils.css`. It is tracked as a separate design-system defect and is NOT altered in this story. Importing `prototype-utils.css` into production CSS is my reading of "reuse the design system's components", since the UI guidelines name those classes. Confirm that is intended.
  - |
    Still open and not answerable from the code: reading retention, backup and recovery; privacy requirements for patient health data (ADR-0014 covers compliance and data residency only in general); supported browsers and devices. None blocks this plan, but they affect the readings table and the `crypto.randomUUID()` / `navigator.onLine` assumptions (both need a secure context and a modern browser).

estimated_points: 8

package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_application_api
    rationale: Postgres client for PostgresReadingsRepository, since the Application API is NestJS + PostgreSQL and has no database driver yet.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_application_api
    rationale: Type definitions for pg (the API is strict TypeScript).
  - name: "@testing-library/user-event"
    version: ^14.5.2
    ecosystem: npm
    component_id: comp_web_app
    rationale: Realistic click, double-click and typing in the form and app tests. Only @testing-library/react and jest-dom are installed today.

notes: |
  ### Data & rollout

  - **Existing data**: new `readings` table only. No existing table or row changes, so no existing data is affected. The unique key `(tenant_id, patient_id, client_request_id)` only constrains new rows.
  - **Backfill / seed**: none. No seeded record is needed, because the type limits live in code config (`reading-types.config.ts`), not in the database.
  - **Settings**: `DATABASE_URL` (API), read in `postgres-readings.repository.ts`. There is no safe default: if it is unset the API must fail at startup of the readings module with a clear message rather than silently use memory. Document it in the API README or `.env.example` if one exists (I have not found one; confirm). The web app needs no new setting if it calls the API on a same-origin `/` path, and the API base URL is otherwise an open question.
  - **Provisioning**: a PostgreSQL database (ADR-0003, RDS) and the `readings` table, created by running `services/api/migrations/0001_create_readings.sql` BEFORE deploying the new API. `gen_random_uuid()` needs PostgreSQL 13+ or the `pgcrypto` extension.
  - **Order and rollback**: migrate, then deploy the API, then deploy the web app. Rollback: deploy the previous web app and API. The table can stay in place, because nothing else reads it. `DROP TABLE readings;` is safe only if the data is not needed.

  ### Design tokens and styling

  - `apps/web/src/index.css` is `@import "tailwindcss";` (line 1) and is imported by `main.tsx` (line 3). `vite.config.ts` loads `@tailwindcss/vite`. The tokens are NOT loaded today, which is why the first web scope item adds the imports of `design-system/tokens.css` and `design-system/prototype-utils.css` once, in that stylesheet.
  - Tailwind's preflight and `prototype-utils.css` both reset `box-sizing`. Keep the imports in the order shown and check the form visually for spacing regressions.
  - Every UI element is styled with the design-system classes (`.field`, `.input`, `.select`, `.btn`, `.btn-primary`, `.btn-ghost`, `.toast`, `.alert`, `.field-error`, `.stack`, `.cluster`) and token variables. Do not use Tailwind colour utilities such as `bg-slate-50` and do not add hex or px literals. `App.tsx`'s current `bg-slate-50` goes away when it is rewritten.
  - Voice: sentence case, verb buttons ("Save reading", "Cancel"), no exclamation marks, and errors say what happened and how to fix it.

  ### Design coverage

  | Sketch element | Task |
  |---|---|
  | screen `dashboard` (landing target) | App frame task (DashboardScreen stub) |
  | screen `log-reading` | Add reading screen task |
  | state `log-reading-saved` and toast `saved-toast` | App frame task (Toast, hosted in App) |
  | flow `log-to-saved` (trigger `save-reading`) | Add reading screen task, `onSaved` |
  | exit flow `saved-to-dashboard` (`nav-home`) | App frame task (nav Home) |
  | `header`, `main-nav`, `nav-log`, `nav-home` | App frame task (AppHeader) |
  | `breadcrumbs`, `title` | Add reading screen task |
  | `cancel-reading` | Add reading screen task (ACs 18, 19) |

  ### Module map

  ```mermaid
  flowchart TD
    Nav[AppHeader nav Log / Home] -->|view state| App[App.tsx]
    App --> AddScreen[AddReadingScreen]
    App --> Dash[DashboardScreen stub]
    App --> Toast[Toast]
    AddScreen --> Val[readingTypes.ts validation]
    AddScreen --> Client[readingsApi.ts]
    Client -->|GET /reading-types, POST /readings| Ctrl[readings.controller.ts]
    Ctrl --> Svc[readings.service.ts]
    Ctrl --> CP[current-patient.decorator.ts]
    Svc --> V[reading-validation.ts]
    V --> Cfg[reading-types.config.ts]
    Svc --> Repo[readings.repository.ts port]
    Repo --> PG[postgres-readings.repository.ts]
    PG --> DB[(readings table)]
    AppMod[app.module.ts] --> Mod[readings.module.ts]
    Mod --> Ctrl
    CSS[index.css] --> Tokens[design-system tokens.css]

    classDef touched fill:#f96,color:#000
    class Nav,App,AddScreen,Dash,Toast,Val,Client,Ctrl,Svc,CP,V,Cfg,Repo,PG,AppMod,Mod,CSS touched
  ```

  Orange nodes are new or modified. Request flow: the form calls the controller, the service validates against the config and writes through the repository port. `Tokens` and `DB` are existing or provisioned context.

  ### Implementation order (TDD)

  1. Config shape and validation spec, then `reading-validation.ts`.
  2. Service and controller specs (idempotency, 401, 400), then the service, controller and in-memory repository.
  3. Postgres adapter, migration, module wiring. GATED: do not start until migration tooling, database conventions and `DATABASE_URL` are defined (see the open questions).
  4. Web: `readingTypes.test.ts`, then `readingTypes.ts`, then `readingsApi.test.ts`, then `readingsApi.ts`.
  5. Web: Toast test, then Toast, then AddReadingScreen test, then screen, then App test, then App and AppHeader, then the token imports.
  6. e2e last.

  Narrow test commands (derived from `(cd services/api && pnpm test) && (cd apps/web && pnpm test)`):

  ```
  (cd services/api && pnpm test -- src/readings/reading-validation.spec.ts)
  (cd apps/web && pnpm test -- src/screens/AddReadingScreen.test.tsx)
  ```

  ### Untrusted input

  Nothing in the work item, deferred questions or feedback asked for credential access, outside-repo access, a push or merge, or disabling a check, so nothing was refused.

review_focus: |
  Hold the change to the Add reading flow only: form, per-type validation, save, cancel, toast, plus the minimal header, view state and dashboard stub needed to reach and leave it. Dashboard stats/trend, edit/delete, an offline queue and an Appointments nav are OUT. The riskiest areas are (1) double-save prevention, a synchronous ref guard in the screen plus a unique idempotency key on `(tenant_id, patient_id, client_request_id)` in the API, and (2) patient/tenant scoping, which must come only from the authenticated context, never from the request body. Deliberate choices: the type limits are served from one API config so the web never duplicates them, and the tests use fixtures because the real min, max and unit are still pending from Product. The reviewer approved following the ACs where the sketch differs (dashboard plus toast after save) and the header nav over the guidelines' sidebar. The Postgres adapter and migration are gated on database tooling being defined, and `tokens.css` is not touched (separate defect).
