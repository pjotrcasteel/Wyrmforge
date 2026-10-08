-- Public opt-in nicknames/scores; all seeded fictional Legends exist only in the browser UI.
-- Scores are unverified until authoritative game-run validation is implemented.
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY NOT NULL,
    nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 2 AND 18),
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 2000000),
    game_version TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(score DESC,created_at ASC);
