summary: |
  HR can add an employee through an "Add employee" page (approved prototype) backed by a new `employees` slice of the Application API (NestJS + PostgreSQL). Saving creates one employee record per person (unique work email per tenant) with status Pending start, then sends an invitation to sign in to the work email. An undelivered invitation never blocks record creation: HR sees a warning and can resend it. Invitations expire 14 days after they were sent; an expired invitation cannot be accepted and HR can reissue it. Department, job title and manager choices come only from the Organization structure lists. Viewing/editing employees, the employee list, sign-in itself, roles and the Organization structure data are other stories; this plan reaches them only through narrow ports because none of that code exists in the repo yet.
scope:
  - description: |
      Migration for employees and invitations (tenant-scoped per ADR-0011). Tool-neutral SQL like `001_spin_records.sql`.

      ```sql
      CREATE TABLE IF NOT EXISTS employees (
        id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        personal_email text,
        phone text,
        work_email text NOT NULL,
        department_id uuid NOT NULL,
        job_title_id uuid NOT NULL,
        manager_id uuid,
        status text NOT NULL DEFAULT 'pending_start',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS employees_work_email_uq ON employees (tenant_id, lower(work_email));

      CREATE TABLE IF NOT EXISTS employee_invitations (
        id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL,
        employee_id uuid NOT NULL REFERENCES employees (id),
        token_hash text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        sent_at timestamptz,          -- NULL until the email was handed over successfully
        accepted_at timestamptz,
        revoked_at timestamptz        -- set when a newer invitation replaces this one
      );
      CREATE INDEX IF NOT EXISTS employee_invitations_employee_idx ON employee_invitations (tenant_id, employee_id, created_at DESC);
      ```
      No foreign keys to department/job-title/manager: those tables belong to the Organization structure epic and are validated through the `OrgStructureReader` port (see below). `status` is plain text with no CHECK so later stories can add values without a migration.
    files:
      - services/api/migrations/002_employees.sql
    rationale: |
      The unique index on (tenant_id, lower(work_email)) is what makes AC4 race-safe and case-insensitive; the service maps the Postgres unique violation (code 23505) to a 409. `sent_at IS NULL` means "not delivered", so a crash between commit and send fails safe to the warning/resend path.
  - description: |
      Domain types, constants and the pure invitation-status function.

      ```ts
      export const INVITATION_TTL_DAYS = 14;
      export const STATUS_PENDING_START = 'pending_start';
      export type InvitationStatus = 'sent' | 'not_delivered' | 'expired' | 'accepted';

      export function deriveInvitationStatus(
        inv: { sentAt: Date | null; acceptedAt: Date | null },
        now: Date,
      ): InvitationStatus;
      ```
      Rules: acceptedAt set -> accepted; sentAt null -> not_delivered; `now - sentAt >= 14 days` -> expired (exactly 14 days is expired); else sent. Also `employee.record.ts` (EmployeeRecord, InvitationRecord) and `employee.validator.ts` hand-written like `spin/bet.validator.ts` (no new validation library): required first name, last name, work email (basic format, trimmed, lower-cased), department, job title; personal email (format when present), phone and manager optional; any `status` in the body is ignored.
    files:
      - services/api/src/employees/employee.constants.ts
      - services/api/src/employees/employee.record.ts
      - services/api/src/employees/invitation.status.ts
      - services/api/src/employees/employee.validator.ts
    rationale: |
      Keeping status derivation pure and clock-injected lets AC10 (14 days) be tested with no database and no timers.
  - description: |
      Ports (interfaces) for everything owned by other epics or still undecided, injected by string token like `SPIN_REPOSITORY` in `spin/spin.service.ts`.

      ```ts
      export interface Principal { userId: string; tenantId: string; roles: string[] }

      export interface OrgOption { id: string; name: string }
      export interface OrgStructureReader {
        departments(tenantId: string): Promise<OrgOption[]>;
        jobTitles(tenantId: string): Promise<OrgOption[]>;
        managers(tenantId: string): Promise<OrgOption[]>;
      }

      export interface InvitationSender {
        /** Resolves when the provider accepted the message; rejects when it could not be delivered. */
        send(to: string, acceptUrl: string): Promise<void>;
      }

      export class WorkEmailInUseError extends Error {}
      export interface EmployeeRepository {
        insertWithInvitation(e: EmployeeRecord, inv: InvitationRecord): Promise<void>; // throws WorkEmailInUseError
        findById(tenantId: string, id: string): Promise<EmployeeRecord | undefined>;
        latestInvitation(tenantId: string, employeeId: string): Promise<InvitationRecord | undefined>;
        replaceInvitation(tenantId: string, employeeId: string, inv: InvitationRecord): Promise<void>; // revokes the previous one
        markSent(invitationId: string, sentAt: Date): Promise<void>;
        findInvitationByTokenHash(hash: string): Promise<InvitationRecord | undefined>;
        markAccepted(invitationId: string, at: Date): Promise<void>;
      }
      ```
      Adapters: `PgEmployeeRepository` (pg Pool, tenant id in every WHERE per ADR-0011, 23505 on `employees_work_email_uq` -> WorkEmailInUseError), `PgOrgStructureReader` (reads the Organization structure tables, names pending that epic), and `UnconfiguredInvitationSender` which always rejects, because ADR-0008 leaves the email provider open and a fake "delivered" would hide failures.
    files:
      - services/api/src/employees/principal.ts
      - services/api/src/employees/org-structure.reader.ts
      - services/api/src/employees/pg-org-structure.reader.ts
      - services/api/src/employees/invitation.sender.ts
      - services/api/src/employees/unconfigured-invitation.sender.ts
      - services/api/src/employees/employee.repository.ts
      - services/api/src/employees/pg-employee.repository.ts
    rationale: |
      Access & app shell (sign-in, roles, the invitation) and Organization structure are not in the repo (searched services/api and apps/web for department, invitation, tenant, AuthGuard, mailer, employee: no matches). Ports let this story be built and tested now and be wired to those epics' real code without rework.
  - description: |
      `EmployeeService` and `InvitationService`.

      ```ts
      export interface InvitationView { status: InvitationStatus; sentAt: string | null; expiresAt: string | null }
      export interface CreateEmployeeResult { employee: EmployeeRecord; invitation: InvitationView }

      create(principal: Principal, input: unknown): Promise<CreateEmployeeResult>;
      getInvitation(principal: Principal, employeeId: string): Promise<InvitationView>;
      resend(principal: Principal, employeeId: string): Promise<InvitationView>;   // also serves "reissue"
      accept(token: string): Promise<{ employeeId: string }>;
      formOptions(principal: Principal): Promise<{ departments: OrgOption[]; jobTitles: OrgOption[]; managers: OrgOption[] }>;
      ```
      `create`: validate; check departmentId/jobTitleId/managerId are in the `OrgStructureReader` lists (BadRequest otherwise, so the server enforces AC2 as well as the UI); build the record with `status = STATUS_PENDING_START` and a 32-byte random token (store only its SHA-256 hash); `insertWithInvitation` in one transaction (WorkEmailInUseError -> ConflictException `{ code: 'WORK_EMAIL_IN_USE', message: 'This work email is already in use.' }`); only after commit call `sender.send(workEmail, acceptUrl)`; on success `markSent(id, clock())`, on any rejection swallow it, leave `sent_at` NULL and return status `not_delivered` with HTTP 201. `resend` allowed only when derived status is `not_delivered` or `expired` (otherwise 409 `INVITATION_NOT_RESENDABLE`): `replaceInvitation` with a fresh token (the old token stops working), then send as above. `accept`: look up by hash, reject revoked/unknown with 404, expired with 410 Gone (`INVITATION_EXPIRED`), else `markAccepted`. Clock and token generator injected (`CLOCK`, `TOKEN_GENERATOR`) so tests are deterministic. `acceptUrl = ${APP_BASE_URL}/#/invitations/accept?token=...` (hash routing like the web app today; confirm against the Access epic).
    files:
      - services/api/src/employees/employee.service.ts
      - services/api/src/employees/invitation.service.ts
    rationale: |
      Sending after commit keeps a slow or failing email provider from holding a transaction and guarantees AC7 (record exists regardless of delivery). Revoking older invitations on resend makes "only the latest invitation works" explicit.
  - description: |
      HTTP layer, all under an HR-only guard except invitation acceptance.

      ```
      GET  /employees/form-options            -> 200 { departments, jobTitles, managers }          (AC2)
      POST /employees                         -> 201 { employee, invitation }; 409 WORK_EMAIL_IN_USE; 400 validation
      GET  /employees/:id                     -> 200 minimal summary (name, workEmail, department, jobTitle, manager, status)
      GET  /employees/:id/invitation          -> 200 InvitationView
      POST /employees/:id/invitation          -> 200 InvitationView (resend / reissue)             (AC9, AC11)
      POST /invitations/accept  { token }     -> 200 { employeeId }; 404 unknown; 410 expired      (AC10)
      ```
      `HrGuard` (`CanActivate`) reads `request.principal` (set by the Access epic's authentication) and allows only the HR role; 401 without a principal, 403 without the role. Register everything in `app.module.ts`. Introduce a shared `PG_POOL` provider (same `DATABASE_URL` check and error message as today) and make the existing `SPIN_REPOSITORY` factory `inject: [PG_POOL]` so the API does not open two pools; spin behaviour must not change.
    files:
      - services/api/src/employees/hr.guard.ts
      - services/api/src/employees/employees.controller.ts
      - services/api/src/employees/invitations.controller.ts
      - services/api/src/app.module.ts
      - services/api/.env.example
    rationale: |
      `GET /employees/:id` and `GET /employees/:id/invitation` are the minimum the post-save and expired views in the prototype need; they are not the "view employee" story (no list, no full profile, no edit). `.env.example` documents `DATABASE_URL` and the new `APP_BASE_URL`.
  - description: |
      Web API client and small token-styled primitives. `employeesApi.ts` follows `dashboard/patientSummary.ts` (`VITE_API_BASE_URL`, `AbortSignal`, throw on non-OK) but also surfaces the 409 body code.

      ```ts
      export interface OrgOption { id: string; name: string }
      export interface FormOptions { departments: OrgOption[]; jobTitles: OrgOption[]; managers: OrgOption[] }
      export type InvitationStatus = 'sent' | 'not_delivered' | 'expired' | 'accepted'
      export class WorkEmailInUseError extends Error {}

      export function fetchFormOptions(signal?: AbortSignal): Promise<FormOptions>
      export function createEmployee(input: NewEmployee): Promise<{ employee: EmployeeSummary; invitation: InvitationView }>
      export function fetchEmployee(id: string, signal?: AbortSignal): Promise<EmployeeSummary>
      export function fetchInvitation(id: string, signal?: AbortSignal): Promise<InvitationView>
      export function resendInvitation(id: string): Promise<InvitationView>
      ```
      Primitives (the component catalogue only has `BetControl`, which is not a form field or alert, so these are new): `Alert` (variants danger, warning, success: `border-[var(--color-danger)] bg-[var(--color-danger-bg)]` etc., `role="alert"` for danger/warning and `role="status"` for success, same shape as `ErrorBox` in `dashboard/PatientSummaryCard.tsx`), `Field` (visible `<label>`, hint `text-[var(--color-fg-muted)]`, inline error `text-[var(--color-danger)]`, wires `aria-describedby` and `aria-invalid`), `Badge` (warning variant `bg-[var(--color-warning-bg)] text-[var(--color-warning)]`, `rounded-[var(--radius-full)]`).
    files:
      - apps/web/src/employees/employeesApi.ts
      - apps/web/src/components/Alert.tsx
      - apps/web/src/components/Field.tsx
      - apps/web/src/components/Badge.tsx
    rationale: |
      The app loads tokens in `apps/web/src/index.css` line 2 (`@import "../../../design-system/tokens.css";`) and styles with Tailwind arbitrary values on tokens (see `PatientSummaryCard.tsx`). It does NOT load `design-system/prototype-utils.css`, so class names from the prototype (`.card`, `.btn-primary`, `.alert`, `.field`, `.badge`) have no definition in the app. This plan therefore expresses each prototype class as Tailwind utilities over the same tokens and does not import prototype-utils.css; no change to `index.css` is needed.
  - description: |
      Add employee page (prototype screen "Add employee", states default and duplicate) and the created page (states saved, invite-sent, expired).

      Add page, from the prototype: breadcrumb text "Employees / New employee" (`--font-size-sm`, `--color-info`), `h1` "Add employee" (`--font-size-xl`, `--font-weight-bold`), intro line "Create one record per person. The employee is invited to sign in at their work email." (`--color-fg-muted`). Two cards (`--card-default-*` tokens): "Personal details" (First name, Last name, Personal email, Phone) and "Work details" (Work email with hint "An invitation to sign in is sent here.", Department, Job title, Manager as `<select>` with placeholders "Select a department / job title / manager", options from `fetchFormOptions` only), then a read-only "Status" line with a warning badge "Pending start" (display only; the client never sends status). Two-column grid at >= 768px (`grid-cols-1 md:grid-cols-2`, gap `--space-3`), single column on phone. Actions right-aligned: secondary "Cancel", primary "Save employee" (one primary button, `--button-primary-*` tokens, `min-h-[var(--control-height-md)]`, focus ring `--focus-ring-width` / `--color-focus`). Inputs use `--color-border-strong`, `--radius-md`, `--control-height-md`; invalid uses `--color-danger`.

      States: loading options = skeleton rows (`--color-bg-muted`, `--radius-sm`, `motion-reduce:animate-none`); options failed = danger Alert with Retry (copy: "We couldn't load the department, job title and manager lists. Check your connection and try again."); saving = in-button spinner (`--spinner-size`) and button disabled; client validation errors inline under the field; duplicate (409 WORK_EMAIL_IN_USE) = danger Alert "Employee not saved. The work email is already in use by another employee record. Enter a different work email, then save again." plus the inline error "This work email is already in use." on the Work email field with `aria-invalid`, all other entered values kept; any other failure = danger Alert "We couldn't save the employee. Try again." with values kept.

      Created page (`#/employees/:id`): success Alert "Employee saved. {name} was added. Status: Pending start."; summary card (name, Pending start badge, "{job title}, {department}. Manager: {manager}", work email). Invitation panel driven by `fetchInvitation`: `not_delivered` = warning Alert "Invitation not delivered" + "The invitation to sign in could not be sent to {email}. The employee record is saved." + primary "Resend invitation"; `expired` = warning Alert "Invitation expired" + "The invitation was sent on {d MMM yyyy}, 14 days ago, and was not accepted, so it can no longer be used. Reissue it to send a new invitation to {email}." + primary "Reissue invitation"; after a successful resend/reissue = success Alert "Invitation sent. An invitation to sign in was sent to {email}." and summary line "Invitation: sent just now, valid for 14 days"; if the resend itself fails the warning stays. `sent`/`accepted` = no alert. Loading = skeleton; fetch error = danger Alert with Retry.

      Routing in `App.tsx` extends the existing hash router: `#/employees/new` -> AddEmployeePage, `#/employees/:id` -> EmployeeCreatedPage; on save, navigate to `#/employees/{id}`. Cancel returns to `#/`.
    files:
      - apps/web/src/employees/AddEmployeePage.tsx
      - apps/web/src/employees/EmployeeCreatedPage.tsx
      - apps/web/src/employees/InvitationPanel.tsx
      - apps/web/src/employees/useFormOptions.ts
      - apps/web/src/App.tsx
    rationale: |
      Mirrors the prototype (`data-name="Add employee"`, states default, duplicate, saved, invite-sent, expired) using the repo's token-based Tailwind style. The prototype's top bar, sidebar and "Employee list is not part of this story" toast are not built here: the app shell belongs to the Access & app shell epic and the list to a later story.
tests:
  - |
    AC1 create stores the details (API, `employee.service.spec.ts`, in-memory fake repository). Write first, expect it to fail:
    ```ts
    const { employee } = await service.create(hr, valid({ firstName: 'Maria', lastName: 'Okafor', workEmail: 'maria.okafor@acme.com' }));
    expect(repo.employees).toHaveLength(1);
    expect(repo.employees[0]).toMatchObject({ tenantId: hr.tenantId, firstName: 'Maria', lastName: 'Okafor', workEmail: 'maria.okafor@acme.com', departmentId: DEPT.id, jobTitleId: TITLE.id });
    expect(employee.id).toBe(repo.employees[0].id);
    ```
    Also `employee.validator.spec.ts`: missing first name, last name, work email, department or job title each returns a field error, and `expect(validate({ ...ok, workEmail: 'not-an-email' }).errors.workEmail).toBeDefined()`. Web `AddEmployeePage.test.tsx`: fill every field, click "Save employee", `expect(createEmployee).toHaveBeenCalledWith({ firstName: 'Maria', lastName: 'Okafor', personalEmail: 'maria.okafor@example.com', phone: '+44 20 7946 0000', workEmail: 'maria.okafor@acme.com', departmentId: 'd1', jobTitleId: 't1', managerId: 'm1' })`; the call has no `status` key.
  - |
    AC2 selects offer only Organization structure values. API (`employee.service.spec.ts`): `await expect(service.create(hr, valid({ departmentId: 'not-in-org-list' }))).rejects.toBeInstanceOf(BadRequestException)` (same for jobTitleId and managerId) and `expect(repo.employees).toHaveLength(0)`; `expect(await service.formOptions(hr)).toEqual({ departments: [DEPT], jobTitles: [TITLE], managers: [MGR] })` where the fake reader returns exactly those. Web: with `fetchFormOptions` resolved to two departments, `const opts = within(screen.getByLabelText('Department')).getAllByRole('option').map((o) => o.textContent); expect(opts).toEqual(['Select a department', 'Engineering', 'Finance']);` and the same for Job title and Manager; while the promise is pending the form shows the skeleton (`getByRole('status')`), and on rejection a danger alert with a Retry button that calls `fetchFormOptions` again.
  - |
    AC3 invitation sent on create (`employee.service.spec.ts`, fake `InvitationSender` recording calls, fixed clock):
    ```ts
    const res = await service.create(hr, valid({ workEmail: 'maria.okafor@acme.com' }));
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].to).toBe('maria.okafor@acme.com');
    expect(sender.sent[0].acceptUrl).toMatch(/token=[A-Za-z0-9_-]{43}/);
    expect(res.invitation.status).toBe('sent');
    expect(repo.invitations[0].tokenHash).not.toContain(tokenFromUrl(sender.sent[0].acceptUrl)); // only the hash is stored
    ```
  - |
    AC4 duplicate work email rejected (`employee.service.spec.ts` plus `pg-employee.repository.spec.ts`, which is skipped unless `TEST_DATABASE_URL` is set, like `pg-spin.repository.spec.ts`, so the service-level test is what runs in the default `pnpm test`):
    ```ts
    await service.create(hr, valid({ workEmail: 'x@acme.com' }));
    await expect(service.create(hr, valid({ workEmail: 'X@Acme.com ' }))).rejects.toBeInstanceOf(ConflictException);
    expect(repo.employees).toHaveLength(1);
    expect(sender.sent).toHaveLength(1); // no invitation for the rejected save
    ```
    Pg spec: inserting the same work email twice (different case) in one tenant rejects with `WorkEmailInUseError`; the same email in another tenant succeeds. Controller spec: POST /employees with a fake service throwing the conflict returns status 409.
  - |
    AC5 message for a duplicate. API: `await expect(service.create(hr, dup)).rejects.toMatchObject({ response: { code: 'WORK_EMAIL_IN_USE', message: 'This work email is already in use.' } });`. Web (`AddEmployeePage.test.tsx`), `createEmployee` rejects with `WorkEmailInUseError`:
    ```ts
    expect(await screen.findByText('This work email is already in use.')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Employee not saved.');
    expect(screen.getByLabelText('First name')).toHaveValue('Maria'); // entered values kept
    ```
  - |
    AC6 status is Pending start. API: `expect(employee.status).toBe('pending_start');` and a body that sends `status: 'active'` still yields `'pending_start'` (`expect(repo.employees[0].status).toBe('pending_start')`). Web: the created page shows `getByText('Pending start')` in the summary card, and the Add form shows the read-only "Pending start" badge before saving.
  - |
    AC7 record still created when delivery fails (`employee.service.spec.ts`, `sender.send` rejects with `new Error('smtp down')`):
    ```ts
    const res = await service.create(hr, valid());
    expect(repo.employees).toHaveLength(1);
    expect(res.invitation.status).toBe('not_delivered');
    expect(repo.invitations[0].sentAt).toBeNull();
    ```
    Controller spec: the same call returns 201 (not 5xx). A test with `UnconfiguredInvitationSender` wired confirms the default deployment path creates the record and reports `not_delivered`.
  - |
    AC8 HR sees a warning when not delivered. Web (`AddEmployeePage.test.tsx` and `EmployeeCreatedPage.test.tsx`): `createEmployee` resolves with `invitation.status = 'not_delivered'`, the app navigates to `#/employees/{id}`, and
    ```ts
    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('Invitation not delivered');
    expect(warning).toHaveTextContent('could not be sent to maria.okafor@acme.com');
    expect(screen.getByRole('button', { name: 'Resend invitation' })).toBeInTheDocument();
    ```
  - |
    AC9 resend after non-delivery. API (`invitation.service.spec.ts`): first send rejects, then the sender is fixed; `const view = await service.resend(hr, employee.id); expect(view.status).toBe('sent'); expect(sender.sent.at(-1)?.to).toBe(employee.workEmail);` and the first invitation has `revokedAt` set. Resend while status is `sent` or `accepted` rejects with `ConflictException`. Web: clicking "Resend invitation" calls `resendInvitation('e1')`; on resolve `expect(await screen.findByText('Invitation sent.')).toBeInTheDocument()` and the warning is gone; when it rejects the warning stays.
  - |
    AC10 expired invitation cannot be accepted (`invitation.status.spec.ts` and `invitation.service.spec.ts`, injected clock):
    ```ts
    const sentAt = new Date('2026-10-21T09:00:00Z');
    expect(deriveInvitationStatus({ sentAt, acceptedAt: null }, new Date('2026-11-04T08:59:59Z'))).toBe('sent');
    expect(deriveInvitationStatus({ sentAt, acceptedAt: null }, new Date('2026-11-04T09:00:00Z'))).toBe('expired');
    clock.set(new Date('2026-11-04T09:00:00Z'));
    await expect(service.accept(token)).rejects.toBeInstanceOf(GoneException);
    expect(repo.invitations[0].acceptedAt).toBeNull();
    ```
    Also: accepting a valid token sets `acceptedAt` and returns the employee id; an unknown or revoked token rejects with `NotFoundException`. Controller spec: POST /invitations/accept for an expired token returns 410.
  - |
    AC11 reissue after expiry (`invitation.service.spec.ts`): record created at T, clock moved to T + 14 days, `getInvitation` reports `expired`, then
    ```ts
    const view = await service.resend(hr, employee.id);
    expect(view.status).toBe('sent');
    expect(sender.sent).toHaveLength(2);
    expect(sender.sent[1].to).toBe(employee.workEmail);
    await expect(service.accept(oldToken)).rejects.toBeInstanceOf(NotFoundException); // old token revoked
    await expect(service.accept(newToken)).resolves.toEqual({ employeeId: employee.id });
    ```
    Web (`EmployeeCreatedPage.test.tsx`): `fetchInvitation` resolves `expired` with `sentAt` 2026-10-21; `expect(screen.getByRole('alert')).toHaveTextContent('Invitation expired')`, the text contains "21 Oct 2026", clicking "Reissue invitation" calls `resendInvitation` and then shows "Invitation sent."
  - |
    Access and tenant scoping (`hr.guard.spec.ts`, `employees.controller.spec.ts`): no principal -> `UnauthorizedException`; principal without the HR role -> `ForbiddenException`; HR -> allowed. A principal from tenant B calling `getInvitation` or `resend` for tenant A's employee id gets `NotFoundException` (the fake repository filters by tenant like the Pg adapter).
  - |
    Existing data and regressions: `pg-employee.repository.spec.ts` (gated by `TEST_DATABASE_URL`) runs `001_spin_records.sql` and then `002_employees.sql`, re-runs `002_employees.sql` a second time to prove it is idempotent, and checks an existing `spin_records` row is still readable through `PgSpinRepository.findByPlayer`. Existing specs `spin.controller.spec.ts` and `spin.service.spec.ts` must pass unchanged after the `PG_POOL` rewiring. Narrow commands while developing: `(cd services/api && pnpm vitest run src/employees)` and `(cd apps/web && pnpm vitest run src/employees src/components)`; the full command `(cd services/api && pnpm test) && (cd apps/web && pnpm test)` runs at the end.
assumptions_or_open_questions:
  - |
    DECIDED (reviewer chose the plan defaults). The Organization structure and Access & app shell epics are NOT merged first (neither exists in this repo: searched `services/api/src`, `services/api/migrations`, `apps/web/src` for department, job title, invitation, tenant, guards, mailer and employee, no matches). This story is built against ports (`OrgStructureReader`, `Principal` + `HrGuard`, `InvitationSender`) with in-memory fakes in tests. FOLLOW-UP STORY NEEDED, not part of this plan: create the Organization structure tables and data, implement the real `PgOrgStructureReader` against them, populate `request.principal` from authentication, and add the web client's auth header/session. Until then `PgOrgStructureReader` is written against assumed table names and has no real data behind it, so the form's lists are empty in a real deployment.
  - |
    DECIDED (plan default). ADR-0010 lists roles Administrator, Business User, Manager, Operations Team and External Customer; there is no HR role. A dedicated `HR` role (string `'HR'`) is assumed, to be added by the Access epic follow-up. Only the constant in `hr.guard.ts` changes if that is revised.
  - |
    STILL OPEN, deferred to the follow-up story (no provider was chosen). Email provider is undecided (ADR-0008, "provider product still open"). Until one is chosen the only adapter is `UnconfiguredInvitationSender`, which rejects, so every new employee shows the "Invitation not delivered" warning in a real deployment. A provider adapter (and any new package such as an SMTP or API client) is not planned here and `package_dependencies` is empty for that reason. Does the Access epic already own invitation delivery (the item says the invitation belongs to it)? If so, `InvitationSender` should be its service.
  - |
    Invitation acceptance: I plan the token check, the 14-day expiry and `POST /invitations/accept` (which marks the invitation accepted), but not the sign-in/identity linking that follows (ADR-0012 says sign-in is corporate SSO, no passwords). The accept URL shape (`${APP_BASE_URL}/#/invitations/accept?token=...`) needs confirming with the Access epic.
  - |
    DECIDED (plan defaults confirmed): required fields are first name, last name, work email, department and job title; personal email, phone and manager are optional; Cancel goes to `#/` and no app shell is built until the Access epic. The 14 days are counted from the time the email was successfully handed to the provider (`sent_at`), and exactly 14 days counts as expired. A never-delivered invitation does not expire. The TTL is a constant, not a setting.
  - |
    Required fields: first name, last name, work email, department and job title. Personal email and phone are optional, and manager is optional (someone at the top has none). The story says "personal details" without listing them; the field set is taken from the prototype.
  - |
    Resend/reissue is allowed only when the invitation is not delivered or expired (409 otherwise); a still-valid or accepted invitation cannot be re-sent. The story does not say what happens in those cases.
  - |
    Employee status is stored as free text (default `pending_start`) with no CHECK constraint so later stories can add statuses; the other values are not defined here.
  - |
    Tenant isolation (ADR-0011): rows carry `tenant_id` taken from the authenticated principal, and the work email is unique per tenant, not globally. If "one authoritative record per person" means unique across all tenants, the unique index changes.
  - |
    Audit trail (ADR-0013) currently covers defect records only, so no audit entry is written for employee creation. The deferred project-wide questions on retention, backup and privacy/access audit of sensitive employee data are not answerable from this story and nothing here depends on them; they need an owner before documents and personal data are added in later stories. The HR-only-field decision from EPIC-015 concerns self-service edits, which are out of scope here, but `HrGuard` on every write endpoint is consistent with it.
  - |
    UI deviations from the prototype: no top bar/sidebar (app shell is another epic; the app has no shell today), and Cancel navigates to `#/` instead of showing the prototype's "Employee list is not part of this story" toast. The breadcrumb "Employees / New employee" is plain text because there is no employee list route. The prototype puts the screen under the Items section; confirm that is where Employees belongs in the nav when the shell lands.
  - |
    The prototype's inlined tokens show `--duration-fast: [object Object]`, a broken value. I did not open `design-system/tokens.css` to see whether the repo copy has the same problem; this plan uses no transitions so it is not affected, but the token file should be checked.
  - |
    Migrations have no runner in the repo (`001_spin_records.sql` is described as tool-neutral and the migration tool is an open decision), so `002_employees.sql` is applied the same manual way as `001`. Who applies it per environment should be confirmed.
estimated_points: 8
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: `002_employees.sql` only adds two new tables and indexes with `CREATE ... IF NOT EXISTS`; it does not alter `spin_records` or `jackpot_pools`, so existing rows are untouched. There are no existing employee rows, so the new unique index and NOT NULL columns cannot fail on legacy data.
  - **Backfill / seed**: none. No seed is required; the department, job title and manager lists come from the Organization structure epic's data, not from this migration. The migration is idempotent and safe to re-run (tested).
  - **Settings**: `APP_BASE_URL` (used to build the invitation link; default `http://localhost:5173` for local development, must be set in staging and prod) and the existing `DATABASE_URL` (still required, same error message). Both are documented in `services/api/.env.example`. The email provider's settings are not defined until ADR-0008's provider is chosen. The web app needs no new variable (`VITE_API_BASE_URL` already exists, see `apps/web/.env.example`).
  - **Provisioning**: before the feature works in an environment, the Organization structure tables/data, the Access epic's authentication and an HR-role user must exist, and an email provider adapter must be wired (see open questions). Without a provider the feature still creates records and shows the "not delivered" warning.
  - **Order and rollback**: apply `002_employees.sql`, then deploy the API, then the web app. Rollback: deploy the previous web and API builds; the two new tables can stay in place unused (they are only referenced by the new code), or be dropped with `DROP TABLE employee_invitations; DROP TABLE employees;` if no real records were created.

  ### Structure

  ```mermaid
  flowchart TD
    Web[apps/web App.tsx hash router] --> Add[AddEmployeePage]
    Web --> Created[EmployeeCreatedPage]
    Add --> Api[employeesApi.ts]
    Created --> Api
    Api -->|HTTP| EmpCtl[employees.controller.ts]
    Api -->|HTTP| InvCtl[invitations.controller.ts]
    EmpCtl --> Guard[hr.guard.ts]
    EmpCtl --> EmpSvc[employee.service.ts]
    EmpCtl --> InvSvc[invitation.service.ts]
    InvCtl --> InvSvc
    EmpSvc --> Repo[PgEmployeeRepository]
    EmpSvc --> Org[OrgStructureReader port]
    EmpSvc --> Sender[InvitationSender port]
    InvSvc --> Repo
    InvSvc --> Sender
    Repo --> Pool[PG_POOL in app.module.ts]
    Spin[SPIN_REPOSITORY factory in app.module.ts] --> Pool
    Index[index.css imports tokens.css] -.styles.-> Add
    classDef touched fill:#f96,color:#000
    class Web,Add,Created,Api,EmpCtl,InvCtl,Guard,EmpSvc,InvSvc,Repo,Org,Sender,Pool,Spin touched
  ```
  Everything orange is new or edited. `app.module.ts` is edited to register the new controllers/providers and to share one Pool with the existing spin repository; `App.tsx` gains two hash routes. `Org`, `Guard` and `Sender` are the seams to the Organization structure and Access epics. The old `SpinController` and `index.css` are not changed.

  ### Conventions followed

  Test files sit next to the code as `*.spec.ts` (API, vitest `include: src/**/*.spec.ts`) and `*.test.tsx` (web, `src/**/*.test.{ts,tsx}`). Injection uses string tokens (`SPIN_REPOSITORY` pattern). Validation is hand-written (`bet.validator.ts` pattern). Web fetch helpers follow `dashboard/patientSummary.ts`; web styling follows `PatientSummaryCard.tsx` (Tailwind arbitrary values over `var(--token)`, never colour or pixel literals).

  Tokens used by the web steps: `--color-fg`, `--color-fg-muted`, `--color-bg`, `--color-bg-muted`, `--color-primary`, `--color-primary-hover`, `--color-on-primary`, `--color-border`, `--color-border-strong`, `--color-focus`, `--color-danger`, `--color-danger-bg`, `--color-warning`, `--color-warning-bg`, `--color-success`, `--color-success-bg`, `--color-info`, `--color-info-bg`, `--space-1`..`--space-4`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-weight-medium`, `--font-weight-bold`, `--control-height-md`, `--border-width`, `--focus-ring-width`, `--spinner-size`, `--icon-size`, `--content-max-width`, `--button-primary-*`, `--button-secondary-*`, `--button-default-radius`, `--card-default-*`.

  Not planned: Playwright e2e (needs a seeded database, a signed-in HR user and an email provider, none of which exist yet); add one once the Access epic provides a test sign-in.
review_focus: |
  IN: create-employee API (validation, Organization-list checks, unique work email, Pending start, invitation send/resend/reissue/expiry/accept check), its migration, and the Add employee / created pages from the prototype. OUT: employee list, view/edit, app shell, sign-in itself, Organization structure tables and data, email provider selection (these two plus real auth wiring go to a follow-up story; the dependent epics are not merged first). Riskiest parts: the dependency seams (ports for roles, tenant, org lists and email are guesses until those epics land) and the order "commit record, then send email, then mark sent", which must never roll back the record when delivery fails; also the small `PG_POOL` rewiring of the existing spin provider in `app.module.ts`, which must not change spin behaviour. Deliberate: `UnconfiguredInvitationSender` rejects on purpose so no fake delivery is reported, prototype CSS classes are rebuilt as Tailwind-over-token utilities because the app does not load `prototype-utils.css`, and exactly 14 days counts as expired.
