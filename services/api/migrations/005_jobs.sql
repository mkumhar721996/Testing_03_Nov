-- Minimal jobs table so open jobs can be held by a technician and reassigned.
-- No booking table exists yet: replace with the booking story's table when it lands.
-- Open means status is not 'completed' or 'cancelled'.
CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  title text NOT NULL,
  customer text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time,
  technician_id uuid REFERENCES technicians(id),
  status text NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS jobs_technician_id_idx ON jobs (technician_id);
