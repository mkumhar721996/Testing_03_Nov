-- Accounts for email-and-password sign-in. No phone column: phone verification is deferred.
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'technician', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_key ON accounts (lower(email));

-- Only a hash of the session token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts (id),
  expires_at timestamptz NOT NULL
);

-- Keyed by email, not account, so unknown emails are throttled and answered identically.
CREATE TABLE IF NOT EXISTS sign_in_attempts (
  email text PRIMARY KEY,
  failed_count integer NOT NULL,
  last_failed_at timestamptz NOT NULL
);
