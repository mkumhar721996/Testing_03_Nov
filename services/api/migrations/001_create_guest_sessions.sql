create table if not exists guest_sessions (
  id uuid primary key,
  balance integer not null check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
