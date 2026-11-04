-- Tool-neutral: the project's migration tool is still an open decision.
-- Nullable so rows written before this column existed stay valid; the repository
-- recomputes their win from the stored grid and bet.
ALTER TABLE spin_records ADD COLUMN IF NOT EXISTS total_win numeric(10,2);
