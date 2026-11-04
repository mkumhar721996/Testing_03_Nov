-- Tool-neutral: the project's migration tool is still an open decision.
-- last_seen_at is stored for the open retention decision; nothing reads it yet.
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY,
  balance numeric(10,2) NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
