-- Tool-neutral: the project's migration tool is still an open decision.
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  personal_email text,
  phone text,
  work_email text NOT NULL,
  department_id uuid NOT NULL,
  job_title_id uuid NOT NULL,
  manager_id uuid,
  status text NOT NULL DEFAULT 'pending_start',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS employees_work_email_uq ON employees (tenant_id, lower(work_email));

CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES employees (id),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS employee_invitations_employee_idx ON employee_invitations (tenant_id, employee_id, created_at DESC);
