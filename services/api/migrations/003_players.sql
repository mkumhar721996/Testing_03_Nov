-- Tool-neutral: the project's migration tool is still an open decision.
-- A row is stored by the first debit or credit; reads of an unknown player return the starting balance.
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY,
  balance numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
