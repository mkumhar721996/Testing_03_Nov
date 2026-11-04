-- Tool-neutral: the project's migration tool is still an open decision.
-- Finance contact email and phone are optional; the screen shows a dash when they are NULL.
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  admin_name text NOT NULL,
  admin_email text NOT NULL,
  created_by text NOT NULL,
  finance_contact_role text NOT NULL,
  finance_contact_name text NOT NULL,
  finance_contact_email text NULL,
  finance_contact_phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
