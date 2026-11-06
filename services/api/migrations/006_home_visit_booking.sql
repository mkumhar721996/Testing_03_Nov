-- Tool-neutral: the project's migration tool is still an open decision.
-- Minimal service catalogue and saved addresses for booking a home visit.
-- The new bookings columns are nullable so rows written before this migration stay valid.
CREATE TABLE IF NOT EXISTS service_categories (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES service_categories (id),
  name text NOT NULL,
  note text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS services_category_idx ON services (category_id);

-- time_zone is an IANA name, for example Europe/London.
CREATE TABLE IF NOT EXISTS addresses (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  label text NOT NULL,
  line text NOT NULL,
  time_zone text NOT NULL
);

CREATE INDEX IF NOT EXISTS addresses_customer_idx ON addresses (customer_id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_id text REFERENCES services (id),
  ADD COLUMN IF NOT EXISTS address_id text REFERENCES addresses (id),
  ADD COLUMN IF NOT EXISTS visit_fee numeric(10, 2),
  ADD COLUMN IF NOT EXISTS fee_currency text;

INSERT INTO service_categories (id, name) VALUES
  ('heat', 'Heating and boilers'),
  ('laundry', 'Laundry appliances'),
  ('kitchen', 'Kitchen appliances')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, category_id, name, note) VALUES
  ('boiler-service', 'heat', 'Boiler service', 'Annual safety check and clean'),
  ('boiler-repair', 'heat', 'Boiler repair', 'Fault finding and repair'),
  ('radiator', 'heat', 'Radiator bleed and balance', 'Cold spots and noisy radiators'),
  ('washer', 'laundry', 'Washing machine repair', 'Drum, drain and door faults'),
  ('dryer', 'laundry', 'Tumble dryer repair', 'Heating and belt faults'),
  ('oven', 'kitchen', 'Oven repair', 'Elements, fans and thermostats'),
  ('dishwasher', 'kitchen', 'Dishwasher repair', 'Pump, spray arm and leaks'),
  ('fridge', 'kitchen', 'Fridge repair', 'Cooling and seal faults')
ON CONFLICT (id) DO NOTHING;
