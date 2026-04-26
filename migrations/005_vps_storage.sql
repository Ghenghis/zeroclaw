-- migrations/005_vps_storage.sql
-- VPS disk monitoring, TimeWarp access tracking, additional settings
-- Run after 004_theme_engine.sql

-- ── Disk usage snapshots ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disk_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  used_gb         REAL NOT NULL,
  total_gb        REAL NOT NULL,
  free_gb         REAL GENERATED ALWAYS AS (total_gb - used_gb) STORED,
  used_percent    REAL GENERATED ALWAYS AS (used_gb / total_gb) STORED,
  archive_count   INTEGER NOT NULL DEFAULT 0,
  archive_gb      REAL NOT NULL DEFAULT 0,
  tmp_gb          REAL DEFAULT 0,
  log_gb          REAL DEFAULT 0,
  logged_at       DATETIME DEFAULT (datetime('now'))
);

-- ── TimeWarp preview access log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS timewarp_access (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL,            -- YYYY-MM-DD of accessed site
  ip_hash       TEXT,                     -- hashed IP (privacy)
  duration_s    INTEGER,                  -- seconds spent in preview
  port_used     INTEGER,                  -- preview port (4000-4099)
  accessed_at   DATETIME DEFAULT (datetime('now'))
);

-- ── Scheduler run queue ───────────────────────────────────────────────
-- Tracks in-progress and queued recreation runs
CREATE TABLE IF NOT EXISTS scheduler_queue (
  id          TEXT PRIMARY KEY,           -- UUID
  status      TEXT NOT NULL DEFAULT 'queued', -- 'queued'|'running'|'done'|'failed'
  reason      TEXT DEFAULT 'scheduled',
  started_at  DATETIME,
  finished_at DATETIME,
  progress    INTEGER DEFAULT 0,          -- 0-100
  step        TEXT,                       -- current step description
  created_at  DATETIME DEFAULT (datetime('now'))
);

-- ── Additional settings defaults ──────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('timewarp_max_previews',    '5'),
  ('timewarp_idle_timeout_m',  '30'),
  ('disk_warn_threshold',      '0.80'),
  ('disk_danger_threshold',    '0.90'),
  ('archive_max_age_days',     '180'),
  ('log_retention_days',       '30'),
  ('site_generation_timeout_m','45'),
  ('lighthouse_timeout_m',     '5');

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_disk_snapshots_time    ON disk_snapshots(logged_at);
CREATE INDEX IF NOT EXISTS idx_timewarp_date          ON timewarp_access(date);
CREATE INDEX IF NOT EXISTS idx_timewarp_accessed      ON timewarp_access(accessed_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_queue_status ON scheduler_queue(status);
