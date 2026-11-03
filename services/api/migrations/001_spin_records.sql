-- Tool-neutral: the project's migration tool is still an open decision.
CREATE TABLE IF NOT EXISTS spin_records (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL,
  bet numeric(10,2) NOT NULL,
  grid jsonb NOT NULL,
  jackpot_trigger boolean NOT NULL,
  spun_at timestamptz NOT NULL DEFAULT now()
);

-- Pool rows are not seeded until the product owner supplies pool names.
CREATE TABLE IF NOT EXISTS jackpot_pools (
  pool text PRIMARY KEY,
  amount numeric(18,2) NOT NULL DEFAULT 0
);
