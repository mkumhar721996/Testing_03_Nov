-- Tool-neutral: the project's migration tool is still an open decision.
-- A day with no visit_limits row has no limit set and is not bookable.
CREATE TABLE IF NOT EXISTS visit_limits (
  day date PRIMARY KEY,
  visit_limit integer NOT NULL CHECK (visit_limit >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY,
  day date NOT NULL,
  slot_window text NOT NULL CHECK (slot_window IN ('08:00-11:00','11:00-14:00','14:00-17:00')),
  customer_id text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_day_idx ON bookings (day);
