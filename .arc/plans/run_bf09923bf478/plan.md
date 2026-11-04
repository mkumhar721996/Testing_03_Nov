summary: |
  Add built-in email/password authentication to the Application API (NestJS + PostgreSQL) and the three pre-sign-in screens from the approved prototype (Sign in, Forgot password, Reset password) to the Web App. The API stores users with scrypt password hashes, issues opaque server-side sessions in an HttpOnly cookie, enforces a 5-failure / 15-minute lockout, and issues single-use, expiring password-reset tokens (stored hashed) through an outbound email port. A global session guard makes every non-public API route return 401 when signed out or expired, and the web app turns any 401 into a redirect to the sign-in page. Self-registration and SSO are out of scope. NOTE: this story contradicts accepted ADR-0012 (SSO only, no built-in passwords) — see open questions; the plan follows the story text.

scope:
  - description: |
      Migration `002_auth.sql` (tool-neutral SQL like 001): tables `users`, `sessions`, `password_reset_tokens`.
      ```sql
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        name text NOT NULL,
        password_hash text NOT NULL,
        failed_attempts integer NOT NULL DEFAULT 0,
        locked_until timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz
      );
      ```
    files:
      - services/api/migrations/002_auth.sql
    rationale: |
      No users, sessions or reset storage exists (only 001_spin_records.sql). All three tables are new, so no existing rows are affected.

  - description: |
      Password hashing and token helpers using `node:crypto` only (no new dependency).
      ```ts
      export function hashPassword(plain: string): Promise<string>;            // scrypt, random salt, "scrypt$N$salt$hash"
      export function verifyPassword(plain: string, stored: string): Promise<boolean>; // timingSafeEqual
      export function newToken(): { token: string; tokenHash: string };        // 32 random bytes base64url, SHA-256 hash stored
      export function hashToken(token: string): string;
      export function validatePassword(plain: string): string | null;          // null when OK, else message; min length 8
      ```
    files:
      - services/api/src/auth/password.ts
      - services/api/src/auth/password.spec.ts
      - services/api/src/auth/tokens.ts
      - services/api/src/auth/tokens.spec.ts
    rationale: Passwords and tokens are never stored in plain text. Min length 8 is the only strength rule the design states.

  - description: |
      Auth repository port plus Postgres adapter, following `spin.repository.ts` / `pg-spin.repository.ts` (interface + Pg class taking a `Pool`, injected through a token).
      ```ts
      export interface AuthRepository {
        findUserByEmail(email: string): Promise<UserRecord | null>;
        createUser(u: { id: string; email: string; name: string; passwordHash: string }): Promise<void>;
        recordFailedAttempt(userId: string, now: Date, maxAttempts: number, lockMs: number): Promise<{ failedAttempts: number; lockedUntil: Date | null }>; // atomic UPDATE ... RETURNING
        clearFailures(userId: string): Promise<void>;
        createSession(s: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void>;
        findSession(tokenHash: string, now: Date): Promise<{ user: UserRecord; expiresAt: Date } | null>;
        touchSession(tokenHash: string, expiresAt: Date): Promise<void>;
        deleteSession(tokenHash: string): Promise<void>;
        deleteSessionsForUser(userId: string): Promise<void>;
        createResetToken(t: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void>;
        consumeResetToken(tokenHash: string, now: Date): Promise<string | null>; // single UPDATE ... SET used_at WHERE used_at IS NULL AND expires_at > now RETURNING user_id
        resetTokenState(tokenHash: string, now: Date): Promise<'valid' | 'invalid'>;
        updatePassword(userId: string, passwordHash: string): Promise<void>; // also clears failed_attempts and locked_until
      }
      ```
    files:
      - services/api/src/auth/auth.repository.ts
      - services/api/src/auth/pg-auth.repository.ts
      - services/api/src/auth/pg-auth.repository.spec.ts
      - services/api/src/auth/in-memory-auth.repository.ts
    rationale: |
      The atomic `recordFailedAttempt` and `consumeResetToken` statements keep the lockout counter and single-use guarantee race-free. The in-memory adapter (test support, injectable clock) lets service tests run without a database; the Pg spec is skipped unless TEST_DATABASE_URL is set, as for the spin repository.

  - description: |
      `AuthService` implementing the behaviour, with an injected clock and `EmailSender` port.
      ```ts
      signIn(email: string, password: string): Promise<
        | { kind: 'ok'; sessionToken: string; expiresAt: Date; user: SessionUser }
        | { kind: 'invalid' }   // same for unknown email and wrong password
        | { kind: 'locked' }>;
      signOut(sessionToken: string | undefined): Promise<void>;
      resolveSession(sessionToken: string | undefined): Promise<SessionUser | null>;  // slides idle expiry
      requestReset(email: string): Promise<void>;              // always resolves; sends mail only if the account exists
      checkResetToken(token: string): Promise<boolean>;
      confirmReset(token: string, newPassword: string): Promise<'ok' | 'invalid-link' | 'weak-password'>;
      ```
      Rules: lock on the 5th consecutive failure (`MAX_FAILED_ATTEMPTS = 5`, `LOCK_MINUTES = 15`); while `locked_until > now` return `locked` BEFORE checking the password (so the right password is also refused, AC 11); once `locked_until <= now` the correct password signs in and clears the counter (AC 12); unknown email runs a dummy `verifyPassword` against a fixed hash so timing and the `invalid` result match a wrong password. Reset confirm consumes the token atomically, sets the new hash, clears the lock and deletes all of the user's sessions. `requestReset` invalidates nothing and answers identically for known and unknown emails.
    files:
      - services/api/src/auth/auth.service.ts
      - services/api/src/auth/auth.service.spec.ts
      - services/api/src/auth/auth.config.ts
      - services/api/src/auth/email.sender.ts
      - services/api/src/auth/logging-email.sender.ts
    rationale: |
      All business rules live in one unit-testable class. The email provider is an open decision (ADR-0008 "provider product still open"), so only an `EmailSender` port and a development adapter that logs the reset link to the server log are built; a real provider is a follow-up.

  - description: |
      HTTP layer: `AuthController`, `SessionGuard` (global via `APP_GUARD`), `@Public()` decorator, cookie helpers (the `Cookie` header is parsed by hand and `Set-Cookie` written with `res.cookie`-equivalent options, so no `cookie-parser` dependency).
      Routes: `POST /auth/sign-in` (200 sets cookie `sid` HttpOnly, SameSite=Lax, Secure when `NODE_ENV=production`; 401 `{code:'invalid_credentials'}`; 423 `{code:'account_locked'}`), `POST /auth/sign-out` (204, clears cookie), `GET /auth/session` (200 user / 401), `POST /auth/password-reset/request` (always 202), `GET /auth/password-reset/:token` (204 valid / 410 invalid), `POST /auth/password-reset/confirm` (204 / 410 invalid link / 422 weak password).
      `@Public()` on health and every `/auth/*` route except sign-out and session; every other route (spin, and the patient routes the web app calls) returns 401 without a valid session. `main.ts` enables CORS with `credentials: true` for `WEB_ORIGIN` when set.
    files:
      - services/api/src/auth/auth.controller.ts
      - services/api/src/auth/auth.controller.spec.ts
      - services/api/src/auth/session.guard.ts
      - services/api/src/auth/session.guard.spec.ts
      - services/api/src/auth/public.decorator.ts
      - services/api/src/auth/cookies.ts
      - services/api/src/auth/auth.module.ts
      - services/api/src/app.module.ts
      - services/api/src/main.ts
      - services/api/src/health/health.controller.ts
    rationale: |
      A global guard with an opt-out is safer than per-route opt-in: a new route added later is protected by default (AC 5). Existing controllers are only touched to mark health public.

  - description: |
      API end-to-end test over the real Nest app with the in-memory repository: full sign-in, session, sign-out, lockout and reset flows over HTTP with cookie handling.
    files:
      - services/api/test/e2e/auth.spec.ts
    rationale: Verifies the cookie and guard wiring that unit tests with mocks cannot (AC 1, 2, 5).

  - description: |
      Account provisioning script, since self-registration is out and AC1 needs real accounts. Run as `cd services/api && pnpm create-user <email> <name>`; it prompts for the password with echo off (never a command-line argument), validates it with `validatePassword`, hashes it and inserts the user. Add `"create-user": "nest build && node dist/scripts/create-user.js"` to the `scripts` in `package.json` (compiled by the existing Nest build, so no new dependency).
      ```ts
      // create-user.ts — pure core, unit-tested; the CLI wrapper only reads argv/stdin and builds a Pool from DATABASE_URL
      export async function createUserAccount(
        repo: AuthRepository,
        input: { email: string; name: string; password: string },
      ): Promise<{ id: string }>;   // throws on weak password or an email that already exists (case-insensitive)
      ```
    files:
      - services/api/src/scripts/create-user.ts
      - services/api/src/scripts/create-user.spec.ts
      - services/api/package.json
    rationale: |
      Without a way to create accounts nobody can sign in after deploy. This is deliberately a command run by an operator, not an HTTP route, so it adds no registration surface. Roles are not set here; the roles story owns them.

  - description: |
      Amend ADR-0012 so the code does not contradict an accepted decision: state that built-in email/password sign-in with server-side sessions is permitted for employees, that corporate SSO remains the intended later path (ADR-0007), and reference this story. Keep the ADR index line in step (`ADR-INDEX.md` title unchanged, status stays accepted).
    files:
      - .arc/decisions/ADR-0012-cross-cutting-authentication.md
    rationale: Decision accepted by the reviewer in this session ("amend"); documentation only.

  - description: |
      Web: load the design-system component classes. `apps/web/src/index.css` already imports `../../../design-system/tokens.css` (line 2) but not `design-system/prototype-utils.css`, which is where `.card`, `.field`, `.field-hint`, `.input`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.alert`, `.alert-info/-warning/-danger/-success`, `.is-invalid`, `.spinner`, `.stack`, `.text-muted` are defined. Add `@import "../../../design-system/prototype-utils.css";` right after the tokens import.
    files:
      - apps/web/src/index.css
    rationale: The classes the prototype uses are not available in the app until this one import is added.

  - description: |
      Web: auth screens, built to the approved prototype (`TESTING-03-NOV-STORY-029-design.html`). Pre-sign-in pages sit outside any app shell: a top bar with a logo placeholder block (`.auth-bar`, `.auth-logo`, text "Logo", `role="img"` `aria-label="Company logo"`), then a centred column (`.auth-col`, max 420px) holding one `.card.auth-card.stack`.
      - SignInPage: banners above the card (`.alert-info` "You have signed out.", `.alert-warning` "Your session has ended. Sign in again to continue.", `.alert-danger` role=alert "Email or password is incorrect. Check both and try again.", `.alert-danger` locked "This account is locked after too many failed sign-in attempts. Try again in 15 minutes, or reset your password."). Card: h1 "Sign in", muted line "Use the email address and password your HR team gave you.", `.field` Email address (type=email, autocomplete=username, placeholder name@company.com), `.field` Password (autocomplete=current-password), right-aligned `.btn-ghost` "Forgot password?", full-width `.btn-primary` "Sign in" (spinner inside the button while submitting).
      - ForgotPasswordPage: h1 "Forgot your password?", muted explanation, Email field, `.btn-primary` "Send reset link"; sent state replaces the form with `.alert-success` "If an account exists for this email address, we have sent a link to reset the password."; `.btn-ghost` "Back to sign in" below.
      - ResetPasswordPage: opened from `#/reset-password?token=...`; on mount calls the validity endpoint. Invalid state: `.alert-danger` "This reset link has expired or has already been used. Request a new one." + `.btn-primary` "Request a new link". Default: h1 "Choose a new password", hint "At least 8 characters." (`aria-describedby`), New password + Confirm new password fields, `.btn-primary` "Save new password"; mismatch / too short shown inline with `.is-invalid` and `.field-error`. Done state: `.alert-success` "Your password has been reset. Your previous password no longer works." + `.btn-primary` "Sign in with your new password".
      Styling uses ONLY tokens: `--space-3/4/5`, `--color-bg`, `--color-bg-muted`, `--color-border`, `--color-border-strong`, `--color-fg-muted`, `--color-primary`, `--color-focus`, `--focus-ring-width`, `--border-width`, `--radius-sm`, `--font-size-sm/lg`, `--font-weight-bold`, `--control-height-sm/lg`. The prototype's own inline layout rules (`.auth-page`, `.auth-bar`, `.auth-logo`, `.auth-col`, `.auth-card`, `.auth-link`, `.auth-end`) are defined in the app's `auth.css` on those tokens. Wording follows the guidelines (sentence case, verbs on buttons, no exclamation marks). Form errors that belong to a field are inline; page-level outcomes use `.alert`. Components in the existing catalogue (`BetControl`) do not cover any of this, so these are new.
    files:
      - apps/web/src/auth/SignInPage.tsx
      - apps/web/src/auth/SignInPage.test.tsx
      - apps/web/src/auth/ForgotPasswordPage.tsx
      - apps/web/src/auth/ForgotPasswordPage.test.tsx
      - apps/web/src/auth/ResetPasswordPage.tsx
      - apps/web/src/auth/ResetPasswordPage.test.tsx
      - apps/web/src/auth/AuthLayout.tsx
      - apps/web/src/auth/auth.css
    rationale: Three screens, each with the states the prototype lists (default, error, locked, session-ended, signed-out; default, sent; default, invalid-link, done).

  - description: |
      Web: auth client, session state and route protection.
      ```ts
      // authApi.ts — all calls use credentials: 'include' and the existing VITE_API_BASE_URL convention
      signIn(email, password): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'locked' }>
      signOut(): Promise<void>
      getSession(): Promise<SessionUser | null>
      requestPasswordReset(email): Promise<void>
      checkResetLink(token): Promise<boolean>
      confirmPasswordReset(token, newPassword): Promise<'ok' | 'invalid-link' | 'weak-password'>
      // apiFetch.ts — fetch wrapper adding credentials and calling onUnauthorized() on any 401
      ```
      `AuthProvider` calls `getSession()` on load; in `App.tsx`, no session on any route other than the three auth routes redirects to `#/sign-in` (session-ended banner when a previous session existed, nothing when first visit), and a 401 from `apiFetch` does the same. Successful sign-in sets `window.location.hash = ''` so the person lands on the dashboard. Sign-out calls the API and then shows the sign-in page with the "You have signed out." banner. A "Sign out" control is needed to exercise AC 2; the app shell/account menu is a separate story, so add a single `.btn-ghost` "Sign out" button rendered by `App.tsx` above the dashboard, to be moved into the top bar account menu by the shell story. Existing fetchers (`patientSummary.ts` and the today's-readings fetch) switch to `apiFetch`.
    files:
      - apps/web/src/auth/authApi.ts
      - apps/web/src/auth/authApi.test.ts
      - apps/web/src/auth/apiFetch.ts
      - apps/web/src/auth/apiFetch.test.ts
      - apps/web/src/auth/AuthProvider.tsx
      - apps/web/src/auth/AuthProvider.test.tsx
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/src/dashboard/patientSummary.ts
      - apps/web/src/dashboard/stats/todayReadings.ts
    rationale: Implements the redirect for signed-out and expired sessions (AC 5) on top of the existing hash router, which is explicitly a stand-in until the shell story.

  - description: |
      Web Playwright e2e of the key journeys against the running stack (sign in, sign out, redirect, reset with the logged link). Uses the existing `apps/web/e2e/app.spec.ts` conventions.
    files:
      - apps/web/e2e/auth.spec.ts
    rationale: Covers the flows across web and API together (AC 1-5, 9).

tests:
  - |
    AC1 (API service) — sign-in with a correct email and password returns a session:
    `const r = await svc.signIn('priya.raman@northwind.example', 'correct-horse'); expect(r.kind).toBe('ok');`
    plus controller test: `expect(res.status).toBe(200); expect(res.headers['set-cookie'][0]).toMatch(/^sid=.*HttpOnly/)`. Web: `SignInPage.test.tsx` submits the form and asserts `expect(window.location.hash).toBe('')` and the dashboard heading `Today` shows. Email lookup is case-insensitive.
  - |
    AC2 — after sign-out the session no longer resolves and the sign-in page shows:
    `await svc.signOut(token); expect(await svc.resolveSession(token)).toBeNull();` Web: click `Sign out`, `expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible(); expect(screen.getByText('You have signed out.')).toBeVisible();`
  - |
    AC3 — reset then sign in with the new password:
    `await svc.requestReset(email); const token = mailer.lastToken(); expect(await svc.confirmReset(token, 'new-passw0rd')).toBe('ok'); expect((await svc.signIn(email, 'new-passw0rd')).kind).toBe('ok');` Also asserts the user's other sessions are deleted and the stored token is a hash (`expect(repo.tokenHashes).not.toContain(token)`). Web `ResetPasswordPage.test.tsx`: default to done state shows "Your password has been reset. Your previous password no longer works."; mismatched confirm shows an inline error and makes no request.
  - |
    AC4 — old password is refused after reset:
    `await svc.confirmReset(token, 'new-passw0rd'); expect((await svc.signIn(email, 'correct-horse')).kind).toBe('invalid');`
  - |
    AC5 — signed-out or expired session is redirected. API: `SessionGuard` returns 401 for no cookie, unknown token, and a session whose `expiresAt` is in the past: `await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)`; a `@Public()` route passes. Web: `App.test.tsx` with `getSession` resolving null renders the `Sign in` heading for `#/`, `#/readings/new` and `#/appointments/new`; with a 401 from `apiFetch` after load it shows `Your session has ended. Sign in again to continue.` and `expect(window.location.hash).toBe('#/sign-in')`.
  - |
    AC6 — wrong password for a real account is refused with an error: `expect((await svc.signIn(email, 'wrong')).kind).toBe('invalid');` controller `expect(res.status).toBe(401)`. Web: `expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect. Check both and try again.')`.
  - |
    AC7 — the error does not reveal which part was wrong: `expect(await svc.signIn(known, 'wrong')).toEqual(await svc.signIn('nobody@northwind.example', 'wrong'));` and at HTTP level the two response bodies are deeply equal: `expect(unknownRes.body).toEqual(wrongPwRes.body)`.
  - |
    AC8 — an email without an account is refused and no session is created: `const r = await svc.signIn('nobody@northwind.example', 'anything'); expect(r.kind).toBe('invalid'); expect(repo.sessionCount()).toBe(0);` and no Set-Cookie header: `expect(res.headers['set-cookie']).toBeUndefined()`.
  - |
    AC9 — expired or used reset link refused. `clock.advance(61 * 60_000); expect(await svc.confirmReset(token, 'new-passw0rd')).toBe('invalid-link');` and `expect(await svc.confirmReset(token2, 'a-passw0rd1')).toBe('ok'); expect(await svc.confirmReset(token2, 'another-passw0rd')).toBe('invalid-link');` Controller: `GET /auth/password-reset/:token` returns 410 for both. Web: invalid state shows "This reset link has expired or has already been used. Request a new one." and a `Request a new link` button navigating to `#/forgot-password`. Pg spec: two concurrent `consumeResetToken` calls — exactly one returns a user id.
  - |
    AC10 — 5th consecutive wrong password shows the locked message: `for (let i = 0; i < 4; i++) expect((await svc.signIn(email, 'bad')).kind).toBe('invalid'); expect((await svc.signIn(email, 'bad')).kind).toBe('locked');` controller `expect(res.status).toBe(423)`; web shows the locked alert text. Also: a successful sign-in before the 5th failure resets the counter.
  - |
    AC11 — correct password refused inside the 15-minute lock: `/* locked at t0 */ clock.advance(14 * 60_000 + 59_000); expect((await svc.signIn(email, 'correct-horse')).kind).toBe('locked'); expect(repo.sessionCount()).toBe(0);`
  - |
    AC12 — correct password accepted once 15 minutes passed: `clock.advance(15 * 60_000); expect((await svc.signIn(email, 'correct-horse')).kind).toBe('ok');` and the counter is back to 0, so one further wrong password gives `invalid`, not `locked`.
  - |
    AC13 — reset request answers identically for known and unknown emails and sends mail only for the known one: `expect(await svc.requestReset('nobody@northwind.example')).toBeUndefined(); expect(mailer.sent).toHaveLength(0);` controller `expect(unknownRes.status).toBe(202); expect(unknownRes.body).toEqual(knownRes.body)`. Web `ForgotPasswordPage.test.tsx` shows the same success alert text whatever the API outcome (including a network error is NOT hidden — it shows a page-level `.alert-danger`).
  - |
    Provisioning (supports AC1) — `createUserAccount` creates a user who can then sign in, and rejects a weak password and a duplicate email regardless of case: `const { id } = await createUserAccount(repo, { email: 'New@Northwind.example', name: 'New', password: 'long-enough-1' }); expect((await svc.signIn('new@northwind.example', 'long-enough-1')).kind).toBe('ok'); await expect(createUserAccount(repo, { email: 'new@northwind.example', name: 'X', password: 'long-enough-1' })).rejects.toThrow(); await expect(createUserAccount(repo, { email: 'b@northwind.example', name: 'B', password: 'short' })).rejects.toThrow();`
  - |
    Global guard — every route except health and the public auth routes needs a session: `const res = await request(app.getHttpServer()).post('/spin').send({}); expect(res.status).toBe(401); expect((await request(app.getHttpServer()).get('/health')).status).toBe(200);` and a route table test asserts that the only `@Public()` handlers are health, sign-in and the three reset routes.
  - |
    Layer/e2e checks: `services/api/test/e2e/auth.spec.ts` drives sign-in, `GET /auth/session`, sign-out, 5-failure lockout and reset over HTTP; `apps/web/e2e/auth.spec.ts` covers redirect from `/` to the sign-in page, sign-in landing on the dashboard, and sign-out. Narrow commands: `(cd services/api && pnpm vitest run src/auth test/e2e/auth.spec.ts)` and `(cd apps/web && pnpm vitest run src/auth src/App.test.tsx)`.

assumptions_or_open_questions:
  - |
    DECIDED by the reviewer (accepted recommendation) — ADR-0012 is AMENDED, not superseded: it said SSO only with no built-in passwords, but this story requires email/password. The amendment permits built-in email/password for employees now and keeps SSO as the later path. The plan includes the documentation edit to the ADR.
  - |
    DECIDED by the reviewer (accepted recommendation) — session lifetime is 8 hours absolute with a 30-minute idle timeout sliding on use, configurable through `SESSION_ABSOLUTE_HOURS` and `SESSION_IDLE_MINUTES`.
  - |
    DECIDED by the reviewer (accepted recommendation) — reset links are 32 random bytes with only the SHA-256 hash stored, valid 60 minutes, single use enforced by an atomic UPDATE, and a successful reset revokes all sessions of that account.
  - |
    DECIDED by the reviewer (accepted recommendation) — every existing route requires sign-in except health and the public auth routes. Still unverified: I did not read how the spin controller identifies the player, and wiring `player_id` to the signed-in user is NOT in scope.
  - |
    Password strength: only the prototype's minimum of 8 characters is enforced; the company's wider rules (project-wide open question under EPIC-014) are not known. Audit logging of sign-ins is also not built here (ADR-0013 audit trail, open question); no audit events are written by this plan.
  - |
    DECIDED by the reviewer (accepted recommendation) — email delivery: only an `EmailSender` port and a development adapter that logs the reset link are built. The real provider is a separate story, so in production no reset email reaches anyone until it lands; an operator must pass the logged link on or provision accounts with known passwords until then. This is a known gap, not an oversight.
  - |
    DECIDED by the reviewer (accepted recommendation) — account provisioning is an operator script, `pnpm create-user <email> <name>`, in this item. Roles are not assigned by it; the roles story owns that. A user-management screen is out of scope.
  - |
    Lockout details assumed: the counter is per account, resets on a successful sign-in, on lock expiry success, and on a successful password reset (reset also clears the lock — the locked message offers reset as the way out). Unknown emails cannot be locked. A locked account is refused with the locked message even for the correct password, and the 15 minutes run from the 5th failure and are not extended by further attempts during the lock.
  - |
    Making the session guard global changes behaviour of existing routes (spin and the patient/readings routes the web app calls): they will return 401 when signed out. I did not read the spin controller's player identity handling; the guard exposes the signed-in user on the request but wiring `player_id` to it is NOT in scope.
  - |
    Prototype vs. acceptance criteria: the prototype's "signed-in" state shows a "Welcome back. You are signed in." banner on the sign-in page, but AC1 says the person lands in the app, so the plan navigates to the dashboard and does not render that banner. The prototype's page background is `--color-warning-bg`, which looks like a wireframe highlight; the plan uses `--color-bg-muted` instead — please confirm. The "Sign out" placement is temporary (top-bar account menu belongs to the shell story).
  - |
    Values with no token: the prototype uses raw 120px logo width, 420px column width and 44px touch-target height. `--control-height-lg` (48px) and `--control-height-sm` (32px) cover the heights approximately; no token exists for a 120px logo or 420px column width (nearest are `--modal-width` 480px and `--toast-width` 320px). Needs a decision (new tokens, or reuse `--modal-width`). Also, the prototype's inlined tokens show `--duration-fast: [object Object]`; I did not check whether design-system/tokens.css has the same defect, which would break `.btn` transitions.
  - |
    Cross-origin cookies: the plan assumes the web app and API are served from the same site or that `WEB_ORIGIN`/CORS credentials are configured; the deployment layout (ADR-0006) was not verified.

estimated_points: 8

package_dependencies: []

notes: |
  ### Data & rollout
  - **Existing data**: `002_auth.sql` only creates three new tables (`IF NOT EXISTS`); it does not touch `spin_records` or `jackpot_pools`, so existing rows are unaffected. There are no existing accounts, so after deploy nobody can sign in until accounts are provisioned (see open question).
  - **Backfill / seed**: no backfill. The system needs at least one user to be usable, created with `cd services/api && pnpm create-user <email> <name>` (prompts for the password); it refuses a duplicate email, so it is safe to re-run. The migration is idempotent and safe to re-run.
  - **Settings**: `SESSION_ABSOLUTE_HOURS` (default 8), `SESSION_IDLE_MINUTES` (default 30), `RESET_LINK_MINUTES` (default 60), `WEB_BASE_URL` (used to build the reset link; default `http://localhost:5173`), `WEB_ORIGIN` (CORS origin with credentials; unset = CORS not enabled). Defaults are safe when unset. Documented in `services/api/src/auth/auth.config.ts` (single place that reads them). Existing `DATABASE_URL` is reused; web keeps `VITE_API_BASE_URL`.
  - **Provisioning**: users must exist (created by `pnpm create-user`, run by an operator after the migration). An email provider must exist before reset emails reach people (ADR-0008, open); this plan does not create one, so reset links are only logged by the server.
  - **Order and rollback**: apply `002_auth.sql` before deploying the API that reads it; deploy API before web. Rollback: redeploy the previous API and web (the global guard disappears with it); the three tables can stay in place unused or be dropped with `DROP TABLE password_reset_tokens, sessions, users;` since nothing else references them.
  - **Existing-rows test**: the Pg repository spec applies `001_spin_records.sql` then `002_auth.sql`, inserts a spin record before the second migration, and asserts `findByPlayer` still returns it afterwards.

  ### Approach
  - Stack: NestJS + PostgreSQL + vitest/playwright (API), React + Vite + Tailwind + vitest/playwright (web), pnpm. No new dependencies: scrypt, SHA-256 and random bytes come from `node:crypto`; the cookie header is parsed by hand.
  - Sessions are server-side opaque tokens (not JWTs) so sign-out and password reset can revoke them immediately; this suits the <100 users scale (ADR-0004).
  - Design tokens are loaded in `apps/web/src/index.css` line 2 (`@import "../../../design-system/tokens.css"`); component classes come from `design-system/prototype-utils.css`, imported once next to it.
  - The `login` error response is one body for unknown-email and wrong-password, and unknown emails pay the same scrypt cost, so neither message nor timing reveals which was wrong (AC 7, 8).

  ```mermaid
  flowchart TD
    Main[main.ts - CORS with credentials] --> AppModule[app.module.ts - registers AuthModule and APP_GUARD]
    AppModule --> AuthModule[auth/auth.module.ts]
    AuthModule --> Guard[auth/session.guard.ts - 401 unless session or Public]
    AuthModule --> Controller[auth/auth.controller.ts - /auth routes]
    Controller --> Service[auth/auth.service.ts - lockout, reset, sessions]
    Service --> Repo[auth/pg-auth.repository.ts]
    Service --> Mail[auth/email.sender.ts port]
    Repo --> Mig[migrations/002_auth.sql]
    AppModule --> Health[health.controller.ts - marked Public]
    AppModule --> Spin[spin.controller.ts - now behind guard]
    WebApp[web App.tsx - redirect and Sign out] --> Provider[auth/AuthProvider.tsx]
    WebApp --> Pages[auth/SignInPage, ForgotPasswordPage, ResetPasswordPage]
    Provider --> Client[auth/authApi.ts and apiFetch.ts]
    Client --> Controller
    WebCss[web index.css - import prototype-utils.css] --> Pages
    Summary[dashboard/patientSummary.ts - uses apiFetch] --> Client
    classDef touched fill:#f96,color:#000
    class Main,AppModule,AuthModule,Guard,Controller,Service,Repo,Mail,Mig,Health,WebApp,Provider,Pages,Client,WebCss,Summary touched
  ```

review_focus: |
  IN: email/password sign-in, sign-out, reset, lockout, global 401 guard, web redirect, the operator `create-user` script and the ADR-0012 amendment; OUT: SSO, self-registration, roles/permissions, shell/navigation, a real email provider (reset links are only logged), audit logging, and a user-management screen. Riskiest areas are lockout/reset atomicity (counter and single-use token updates must be single SQL statements) and the new global guard changing the behaviour of existing routes (decided: all routes protected except health and public auth routes). Deliberate decisions: ADR-0012 is amended (reviewer-approved) because the story requires built-in passwords; session 8h absolute / 30min idle and reset links 60min are reviewer-confirmed; the unknown-email and wrong-password paths are intentionally indistinguishable in body and timing; the temporary "Sign out" button in App.tsx exists only until the shell story.
