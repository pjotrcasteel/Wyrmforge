-- Reports are explicitly opted into by the tester; no raw IP or user-agent is stored.
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY NOT NULL,
    received_at TEXT NOT NULL,
    version TEXT NOT NULL,
    kind TEXT NOT NULL,
    enjoyment INTEGER,
    clarity INTEGER,
    replay TEXT,
    trouble_area TEXT,
    starts INTEGER NOT NULL DEFAULT 0,
    completed_runs INTEGER NOT NULL DEFAULT 0,
    interrupted_runs INTEGER NOT NULL DEFAULT 0,
    recent_run_count INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_received ON reports(received_at);
CREATE INDEX IF NOT EXISTS idx_reports_area ON reports(trouble_area);
CREATE TABLE IF NOT EXISTS rate_limits (
    bucket TEXT PRIMARY KEY NOT NULL,
    hits INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at);
