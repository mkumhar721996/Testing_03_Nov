# Testing_03_Nov

## Local development

The API needs `DATABASE_URL` (a Postgres connection string) to boot: accounts, sessions and sign-in attempts are stored there. Apply the SQL files in `services/api/migrations/` (including `006_accounts.sql`) before starting it.

The slot capacity endpoints use a temporary header-based identity (`x-user-id`, `x-user-role`) and return 401 unless `ALLOW_INSECURE_HEADER_IDENTITY=true` is set. Copy `services/api/.env.example` to `services/api/.env` (or export the variable) for development and tests. Never enable it where the API is reachable by untrusted callers.
