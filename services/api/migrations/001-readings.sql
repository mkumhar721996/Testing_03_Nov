CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  patient_id text NOT NULL,
  client_request_id uuid NOT NULL,
  type text NOT NULL,
  values jsonb NOT NULL,
  reading_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, patient_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS readings_patient_date_idx
  ON readings (tenant_id, patient_id, reading_date DESC);
