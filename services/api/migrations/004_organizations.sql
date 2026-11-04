-- Tool-neutral: the project's migration tool is still an open decision.
-- Additive: creates a new table only. Every detail column except id, name and created_at is nullable,
-- so a missing value shows as "-" in the organization detail panel.
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  type text,
  reference text,
  phone text,
  street text,
  street2 text,
  city text,
  state text,
  postal_code text,
  admin_name text,
  admin_email text,
  admin_phone text,
  created_by_name text,
  created_by_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
