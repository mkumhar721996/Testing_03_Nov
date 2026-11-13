-- Tool-neutral: the project's migration tool is still an open decision.
-- A booking has no technician until an admin assigns one; notifications are stored in-app rows.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES technicians(id);
CREATE INDEX IF NOT EXISTS bookings_technician_day_idx ON bookings (technician_id, day);

CREATE TABLE IF NOT EXISTS technician_notifications (
  id uuid PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES technicians(id),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  kind text NOT NULL CHECK (kind IN ('assigned','removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
