-- Tool-neutral: the project's migration tool is still an open decision.
-- Technicians are deactivated, never deleted; weekday is 0 (Sunday) to 6 (Saturday).
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (btrim(name) <> ''),
  login_email text NOT NULL CHECK (btrim(login_email) <> ''),
  phone text,
  service_area text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS technicians_login_email_key ON technicians (lower(login_email));

CREATE TABLE IF NOT EXISTS technician_working_hours (
  technician_id uuid NOT NULL REFERENCES technicians(id),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CHECK (end_time > start_time),
  PRIMARY KEY (technician_id, weekday)
);

CREATE TABLE IF NOT EXISTS technician_days_off (
  technician_id uuid NOT NULL REFERENCES technicians(id),
  day date NOT NULL,
  PRIMARY KEY (technician_id, day)
);
