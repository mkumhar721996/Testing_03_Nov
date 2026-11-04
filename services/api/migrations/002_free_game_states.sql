-- Tool-neutral: the project's migration tool is still an open decision.
-- A player with no row has no free games in progress.
CREATE TABLE IF NOT EXISTS free_game_states (
  player_id uuid PRIMARY KEY,
  remaining integer NOT NULL CHECK (remaining >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
