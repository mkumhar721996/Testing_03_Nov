# Testing_03_Nov

## Local development

The slot capacity endpoints use a temporary header-based identity (`x-user-id`, `x-user-role`) and return 401 unless `ALLOW_INSECURE_HEADER_IDENTITY=true` is set. Copy `services/api/.env.example` to `services/api/.env` (or export the variable) for development and tests. Never enable it where the API is reachable by untrusted callers.
