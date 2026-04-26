-- migrations/004_theme_engine.sql
-- Theme engine, holiday backgrounds, weekend games, site archives, settings
-- Run after migrations 001-003 from daveai-master-plan.md

-- ── Daily design briefs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_briefs (
  date          TEXT PRIMARY KEY,           -- YYYY-MM-DD
  brief_json    TEXT NOT NULL,              -- DailyBrief JSON
  theme_name    TEXT GENERATED ALWAYS AS (json_extract(brief_json, '$.theme')) STORED,
  background    TEXT GENERATED ALWAYS AS (json_extract(brief_json, '$.background')) STORED,
  created_at    DATETIME DEFAULT (datetime('now'))
);

-- ── Daily recreation run log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_recreation_log (
  run_id            TEXT PRIMARY KEY,       -- UUID
  date              TEXT NOT NULL,          -- YYYY-MM-DD
  theme             TEXT NOT NULL,
  background        TEXT NOT NULL,
  lighthouse_score  INTEGER,               -- 0-100, NULL if not run
  build_time_ms     INTEGER,               -- build duration
  reason            TEXT DEFAULT 'scheduled', -- 'scheduled' | 'admin' | 'manual'
  success           INTEGER DEFAULT 1,     -- 1=success, 0=failed
  error_msg         TEXT,                  -- error message if failed
  created_at        DATETIME DEFAULT (datetime('now'))
);

-- ── Agent-generated backgrounds ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_backgrounds (
  id              TEXT PRIMARY KEY,         -- UUID (pipeline run ID)
  name            TEXT NOT NULL,
  scene_type      TEXT NOT NULL,
  canvas_code     TEXT NOT NULL,            -- complete React component source
  shader_code     TEXT,                     -- optional GLSL shader
  metadata_json   TEXT NOT NULL,            -- AgentGeneratedBackground metadata
  generated_at    DATETIME DEFAULT (datetime('now')),
  validated       INTEGER DEFAULT 0,        -- 1 if validation passed
  perf_score      INTEGER,                  -- performance score 0-100
  is_active       INTEGER DEFAULT 0         -- 1 if currently used
);

-- ── Weekend arcade games ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekend_games (
  id              TEXT PRIMARY KEY,         -- UUID
  title           TEXT NOT NULL,
  genre           TEXT NOT NULL,            -- 'arcade'|'puzzle'|'card'|etc.
  file_path       TEXT NOT NULL,            -- relative path in public/games/generated/
  description     TEXT,
  difficulty      TEXT DEFAULT 'adaptive',
  play_time       TEXT,                     -- "2-5 min"
  ticket_cost     INTEGER DEFAULT 10,
  metadata_json   TEXT NOT NULL,            -- full GeneratedGame JSON
  generated_at    DATETIME DEFAULT (datetime('now')),
  times_played    INTEGER DEFAULT 0,
  high_score      INTEGER DEFAULT 0,
  agent_model     TEXT DEFAULT 'claude-opus-4-5'
);

-- ── Site archives ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_archives (
  id                  TEXT PRIMARY KEY,     -- UUID
  run_id              TEXT NOT NULL,        -- matches daily_recreation_log.run_id
  date                TEXT NOT NULL,        -- YYYY-MM-DD
  archive_path        TEXT NOT NULL UNIQUE, -- absolute path to .tar.zst file
  size_bytes          INTEGER NOT NULL DEFAULT 0,
  uncompressed_bytes  INTEGER NOT NULL DEFAULT 0,
  compression_ratio   REAL GENERATED ALWAYS AS (
    CASE WHEN size_bytes > 0
      THEN CAST(uncompressed_bytes AS REAL) / size_bytes
      ELSE 1.0
    END
  ) STORED,
  theme               TEXT,
  lighthouse_score    INTEGER,
  archived_at         DATETIME DEFAULT (datetime('now')),
  last_accessed       DATETIME,
  access_count        INTEGER DEFAULT 0,
  FOREIGN KEY (run_id) REFERENCES daily_recreation_log(run_id)
);

-- ── Settings key-value store ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,              -- JSON-encoded value
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Default scheduler settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('scheduler_cron',          '"0 3 * * *"'),
  ('scheduler_timezone',      '"America/New_York"'),
  ('scheduler_enabled',       'true'),
  ('auto_compress',           'true'),
  ('lighthouse_min_score',    '90'),
  ('notify_minutes_before',   '0'),
  ('refresh_countdown_secs',  '60'),
  ('force_background',        'null'),
  ('admin_theme_override',    'null');

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_briefs_date         ON daily_briefs(date);
CREATE INDEX IF NOT EXISTS idx_recreation_log_date       ON daily_recreation_log(date);
CREATE INDEX IF NOT EXISTS idx_recreation_log_reason     ON daily_recreation_log(reason);
CREATE INDEX IF NOT EXISTS idx_agent_backgrounds_type    ON agent_backgrounds(scene_type);
CREATE INDEX IF NOT EXISTS idx_agent_backgrounds_active  ON agent_backgrounds(is_active);
CREATE INDEX IF NOT EXISTS idx_weekend_games_genre       ON weekend_games(genre);
CREATE INDEX IF NOT EXISTS idx_weekend_games_played      ON weekend_games(times_played DESC);
CREATE INDEX IF NOT EXISTS idx_site_archives_date        ON site_archives(date);
CREATE INDEX IF NOT EXISTS idx_site_archives_accessed    ON site_archives(last_accessed);
