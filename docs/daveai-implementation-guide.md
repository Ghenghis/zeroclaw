# DaveAI Implementation Guide
> Agent-readable master reference for the ZeroClaw site system
> Last updated: 2026-02-19 | Version: 1.0.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [VPS Resource Budget](#2-vps-resource-budget)
3. [Complete File Tree](#3-complete-file-tree)
4. [Database Schema](#4-database-schema)
5. [SSE Streams Reference](#5-sse-streams-reference)
6. [Daily Recreation Flow](#6-daily-recreation-flow)
7. [Theme Priority System](#7-theme-priority-system)
8. [Weekend System](#8-weekend-system)
9. [Background Scene Catalog](#9-background-scene-catalog)
10. [Environment Variables](#10-environment-variables)
11. [Logging Reference](#11-logging-reference)
12. [Quick Start for Agents](#12-quick-start-for-agents)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. System Overview

ZeroClaw is a Next.js 15 App Router site that **recreates itself daily** using an AI pipeline. Every day at a configurable time (default 3AM), a scheduler triggers Claude Opus to generate a new site brief, builds it into a staging directory, performs quality checks, then atomically swaps it to production with zero downtime.

### Core Pillars

| Pillar | Description |
|--------|-------------|
| **Daily Recreation** | Full site rebuild every 24h via AI-generated brief + Next.js build |
| **Agentic Backgrounds** | 35+ animated background scenes, selected by theme priority engine |
| **Weekend Arcade** | Saturday = game arcade (AI-generated HTML games), Sunday = relaxation mode |
| **Live Stats Widget** | Bottom-right widget showing git stats, agent status, disk usage, current theme |
| **TimeWarp** | Browse any past version of the site via archive decompression |
| **SSE Streams** | Real-time commit comets, stats polling, site-refresh countdown toast |

### Technology Stack

```
Framework:     Next.js 15 App Router + Turbopack
Language:      TypeScript 5.x
Rendering:     Canvas 2D (particles), WebGL/GLSL (shaders), React Three Fiber (3D)
Animation:     Boids algorithm, mulberry32 PRNG, RAF loops
Streaming:     Server-Sent Events (SSE) — 3 streams
AI:            Anthropic Claude (claude-opus-4-5 for generation, claude-haiku-4-5 for fallbacks)
Database:      PostgreSQL (via Neon serverless or local pg)
Compression:   zstd (-T0 -19) for site archives
Web Server:    nginx with Let's Encrypt SSL
Process Mgmt:  systemd (app + scheduler as separate services)
Logging:       Pino structured JSON logger with child namespaces
```

### High-Level Data Flow

```
[CronJob 3AM]
      │
      ▼
DailyRecreationScheduler.triggerRecreation()
      │
      ├─ 1. DailyBriefGenerator.generate()  ──→ Claude Opus ──→ JSON brief
      │
      ├─ 2. Build staging site (npm run build in /staging/)
      │
      ├─ 3. Quality check (Lighthouse score ≥ 80, build success)
      │
      ├─ 4. Atomic swap: /current → /prev_YYYY-MM-DD, /staging → /current
      │
      ├─ 5. Compress /prev_YYYY-MM-DD → /archives/YYYY-MM-DD.tar.zst
      │
      └─ 6. Broadcast 'site_refresh' SSE → all connected clients get toast
```

---

## 2. VPS Resource Budget

**Server**: Hostinger VPS — 4 vCPU / 16 GB RAM / 200 GB NVMe

### Storage Allocation

| Purpose | Size | Notes |
|---------|------|-------|
| OS + packages | 8 GB | Ubuntu 22.04 LTS |
| Node.js + npm cache | 4 GB | v22 LTS |
| /var/www/zeroclaw/current | 500 MB | Live production build |
| /var/www/zeroclaw/staging | 500 MB | In-progress build |
| /var/www/zeroclaw/prev | 500 MB | Last build (pre-swap) |
| /var/www/archives/ | ~5 GB | 365× zstd compressed (≈12 MB each) |
| /tmp/timewarp/ | 1 GB max | Decompressed previews (auto-cleaned) |
| PostgreSQL data | 2 GB | Daily briefs, logs, stats |
| Logs (/var/log/zeroclaw/) | 1 GB | Rotated weekly via logrotate |
| **Total used** | **~23 GB** | **177 GB free headroom** |

### Compression Math

```
Raw Next.js build:  ~80-150 MB (with node_modules excluded)
After zstd -19:     ~8-15 MB per archive
365 days × 12 MB:   ~4.4 GB for full year
Emergency headroom: DiskMonitor triggers cleanup at 80% (160 GB used)
```

### CPU Budget

| Process | Cores | Notes |
|---------|-------|-------|
| Next.js server | 1-2 | Node cluster mode |
| Scheduler daemon | 0.5 | Mostly sleeping |
| Daily build | 2-3 (burst) | npm run build, ~2-5 min |
| TimeWarp decompression | 1 (burst) | zstd -d, seconds |
| nginx | 0.5 | SSL termination + proxy |

### RAM Budget

| Process | RAM | Notes |
|---------|-----|-------|
| Next.js server | 512 MB - 1 GB | NODE_OPTIONS=--max-old-space-size=1024 |
| Scheduler daemon | 128 MB | Lightweight |
| TimeWarp servers | 256 MB each | Max 10 concurrent = 2.5 GB |
| PostgreSQL | 1-2 GB | shared_buffers=256MB |
| nginx | 64 MB | |
| OS overhead | 1 GB | |
| **Total max** | **~7 GB** | **9 GB free headroom** |

---

## 3. Complete File Tree

> **Last updated: 2026-02-19** — reflects all files implemented across all build sessions.

```
zeroclaw/
├── app/                                    # Next.js 15 App Router
│   ├── api/
│   │   ├── commits/
│   │   │   └── stream/route.ts             # SSE: git commits → commit comets
│   │   ├── stats/
│   │   │   └── stream/route.ts             # SSE: DaveAIStats every 5s
│   │   ├── events/
│   │   │   └── site/route.ts               # SSE: site-refresh broadcast
│   │   ├── weekend/
│   │   │   ├── generate/route.ts           # POST: AI-generate arcade game
│   │   │   └── games/route.ts              # GET/POST: list games + record score
│   │   └── admin/
│   │       ├── scheduler/
│   │       │   ├── route.ts                # GET/PATCH: cron config + status
│   │       │   └── trigger/route.ts        # POST: manual rebuild trigger
│   │       ├── storage/
│   │       │   ├── route.ts                # GET: storage stats
│   │       │   ├── archives/route.ts       # GET: archive list
│   │       │   ├── archives/[id]/route.ts  # DELETE: individual archive
│   │       │   ├── cleanup/route.ts        # POST: prune | emergency cleanup
│   │       │   └── timewarp/route.ts       # GET/DELETE: TimeWarp sessions
│   │       ├── theme/route.ts              # GET/PATCH/DELETE: theme override
│   │       └── debug/route.ts              # GET: full system snapshot
│   ├── admin/
│   │   ├── page.tsx                        # Admin dashboard (nav cards)
│   │   ├── scheduler/page.tsx              # Scheduler control + cron editor
│   │   ├── storage/page.tsx                # Disk usage + archive browser
│   │   └── theme/page.tsx                  # Theme pin + background override
│   ├── layout.tsx                          # Root layout
│   └── page.tsx                            # Home page
│
├── components/
│   ├── backgrounds/
│   │   ├── BackgroundRenderer.tsx          # Master orchestrator — lazy-loads all scenes
│   │   └── SpaceBackground/
│   │       └── index.tsx                   # Space orchestrator (Nebula+StarField+Planets+Aurora)
│   ├── SiteRefreshListener.tsx             # SSE → 60s countdown toast
│   ├── stats/
│   │   └── DaveAIStatsWidget.tsx           # Fixed bottom-right live stats widget
│   └── weekend/                            # (weekend UI components — TBD)
│
├── lib/
│   ├── logger.ts                           # Pino structured logger
│   ├── agent/
│   │   ├── AgentThemeSelector.ts           # Contextual theme + background selection engine
│   │   ├── QualityGates.ts                 # LCP/CLS/WCAG/keyboard/reduced-motion checks
│   │   └── spaceThemeAgent.ts              # StyleSeed→SpaceVariant + milestone overrides
│   ├── theme/
│   │   ├── ThemeConfig.ts                  # ThemeConfig interface + default config
│   │   ├── ThemeRegistry.ts                # 20 full ThemeConfig objects (all scenes/fonts/colors)
│   │   └── ThemeResolver.ts                # resolveTheme() — 7-level priority engine
│   ├── backgrounds/
│   │   ├── holidayDetector.ts              # 18 holidays + Gregorian Easter
│   │   ├── deviceCapability.ts             # detectPerformanceTier() — low/medium/high
│   │   ├── space/
│   │   │   ├── space.config.ts             # 5 SpaceVariant configs + buildConfig()
│   │   │   ├── StarField.tsx               # Canvas 2D parallax star field
│   │   │   ├── CommitComets.tsx            # Canvas 2D commit-driven comets
│   │   │   ├── Nebula.tsx                  # WebGL1 GLSL nebula (6-oct FBM + mouse lens)
│   │   │   ├── Aurora.tsx                  # CSS gradient aurora with GSAP
│   │   │   ├── Planets.tsx                 # React Three Fiber planets + tooltips
│   │   │   ├── hooks/
│   │   │   │   ├── useMouseParallax.ts     # Ref-based lerp mouse tracker
│   │   │   │   ├── useReducedMotion.ts     # prefers-reduced-motion SSR-safe hook
│   │   │   │   ├── useDeviceCapability.ts  # WebGL detection + tier estimation
│   │   │   │   └── useCommitStream.ts      # SSE client with exponential backoff + mock
│   │   │   └── shaders/
│   │   │       └── nebula.frag.glsl        # Standalone GLSL for vite-plugin-glsl
│   │   ├── nature/
│   │   │   ├── OceanReef.tsx               # Canvas 2D boids fish + caustics + bubbles
│   │   │   ├── FireflySystem.tsx           # Canvas 2D wander-steering fireflies
│   │   │   ├── CherryBlossoms.tsx          # Canvas 2D petal physics
│   │   │   └── FireworksSystem.ts          # Canvas 2D fireworks (4 burst types)
│   │   ├── city/
│   │   │   ├── MatrixRain.tsx              # Canvas 2D katakana code rain
│   │   │   └── NeonCity.tsx                # Canvas 2D parallax neon city
│   │   ├── ocean/
│   │   │   └── useBoids.ts                 # Boids algorithm hook
│   │   agentic/                            # (agentic backgrounds — TBD)
│   │   └── holidays/                       # (holiday backgrounds — TBD)
│   ├── daily/
│   │   ├── DailyBriefGenerator.ts          # Claude Opus → JSON brief (6-axis diversity)
│   │   └── DailyRecreationScheduler.ts     # CronJob pipeline: brief→build→qa→swap→compress→broadcast
│   ├── weekend/
│   │   ├── WeekendModeEngine.ts            # detectMode(), loadGames(), recordPlay()
│   │   ├── GameGenerator.ts                # Claude Opus → HTML game (19 genres)
│   │   ├── GameTemplateRegistry.ts         # 19 game types + BASE_SCAFFOLD HTML template
│   │   ├── WebAudioSynthesizer.ts          # Pure Web Audio — 15 sound types, no files
│   │   ├── ConfettiEngine.ts               # Canvas confetti: burst() + celebrate()
│   │   ├── MobileTouchAdapter.ts           # Swipe/tap/dpad/joystick → KeyboardEvent
│   │   ├── LeaderboardSystem.ts            # localStorage top-10 leaderboard + HTML table
│   │   ├── AdaptiveDifficultyEngine.ts     # localStorage-backed ±15/12% difficulty
│   │   ├── TicketEconomy.ts                # Daily login tickets + per-game costs
│   │   └── SundayRelaxation.ts             # Sunday ambient scene selection
│   ├── stats/
│   │   └── StatsCollector.ts               # Aggregates git/disk/agent stats
│   ├── storage/
│   │   └── DiskMonitor.ts                  # Threshold alerts + routine/emergency cleanup
│   └── timewarp/
│       └── TimeWarpServer.ts               # Port pool 4000-4099, decompress + serve
│
├── styles/
│   └── globals.css                         # Required: reduced-motion, fluid type, SSE dot, ticket widget
│
├── migrations/
│   ├── 004_theme_engine.sql                # daily_briefs, recreation_log, agent_backgrounds, weekend_games
│   └── 005_vps_storage.sql                 # site_archives, settings, disk_snapshots, timewarp_access
│
├── scripts/
│   └── scheduler.js                        # Node.js daemon: DailyRecreationScheduler + signal handlers
│
├── deploy/
│   ├── zeroclaw.service                    # systemd: Next.js app
│   ├── zeroclaw-scheduler.service          # systemd: scheduler daemon
│   ├── nginx.conf                          # nginx: SSL, SSE keep-alive, static caching
│   ├── logrotate.conf                      # Weekly rotation, 4 weeks retained
│   └── setup.sh                            # Bootstrap: Node, nginx, certbot, dirs, services
│
├── docs/
│   ├── daveai-master-plan.md               # Full system design audit (2475 lines)
│   ├── daveai-theme-engine.md              # Backgrounds, holidays, weekend, stats (5816 lines)
│   ├── daveai-vps-storage-plan.md          # VPS specs, storage math, TimeWarp (978 lines)
│   └── daveai-implementation-guide.md      # This file — agent-readable master reference
│
├── public/
│   └── games/generated/                    # AI-generated HTML game files (runtime)
│
├── next.config.js                          # Security headers, GLSL loader, image domains, SSE headers
├── .env.local                              # Local dev env vars (see §10)
├── .scheduler-config.json                  # Persisted scheduler config (runtime)
└── package.json                            # node-cron, pino, @anthropic-ai/sdk, three, @react-three/fiber
```

---

## 4. Database Schema

All migrations live in `migrations/`. Run in order: 001 → 002 → 003 → 004 → 005.

### migrations/004_theme_engine.sql

```sql
-- Daily AI-generated site briefs
CREATE TABLE daily_briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL UNIQUE,
  theme_name      TEXT NOT NULL,
  color_palette   TEXT NOT NULL,        -- e.g. 'ocean-blues'
  layout_style    TEXT NOT NULL,        -- e.g. 'bento-grid'
  typography      TEXT NOT NULL,        -- e.g. 'geometric-sans'
  animation_style TEXT NOT NULL,        -- e.g. 'kinetic'
  industry_focus  TEXT NOT NULL,        -- e.g. 'fintech'
  accent_mood     TEXT NOT NULL,        -- e.g. 'energetic'
  background_scene TEXT NOT NULL,       -- SceneType enum value
  prompt_used     TEXT,                 -- Full prompt sent to Claude
  raw_response    JSONB,                -- Full JSON response from Claude
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Recreation pipeline run log
CREATE TABLE daily_recreation_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL,
  trigger_reason TEXT NOT NULL,          -- 'scheduled' | 'manual' | 'admin'
  status        TEXT NOT NULL,           -- 'running' | 'success' | 'failed'
  stage         TEXT,                    -- Last completed stage
  duration_ms   INTEGER,
  error_message TEXT,
  lighthouse_score INTEGER,
  archive_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Agentic background session registry
CREATE TABLE agent_backgrounds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_type  TEXT NOT NULL,
  parameters  JSONB NOT NULL DEFAULT '{}',
  performance_tier TEXT NOT NULL DEFAULT 'high',
  seed        BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Weekend arcade game library
CREATE TABLE weekend_games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  genre         TEXT NOT NULL,
  description   TEXT,
  html_path     TEXT NOT NULL,           -- relative to public/games/generated/
  ticket_cost   INTEGER NOT NULL DEFAULT 10,
  play_count    INTEGER NOT NULL DEFAULT 0,
  high_score    INTEGER,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  last_played   TIMESTAMPTZ
);
```

### migrations/005_vps_storage.sql

```sql
-- Archive inventory
CREATE TABLE site_archives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL UNIQUE,
  archive_path  TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  compressed    BOOLEAN DEFAULT TRUE,
  lighthouse_score INTEGER,
  brief_summary TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Admin-configurable settings (key/value store)
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Insert defaults:
INSERT INTO settings (key, value) VALUES
  ('scheduler_cron', '"0 3 * * *"'),
  ('scheduler_timezone', '"UTC"'),
  ('scheduler_enabled', 'true'),
  ('max_archive_days', '365'),
  ('lighthouse_min_score', '80');

-- Disk usage snapshots for trending
CREATE TABLE disk_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  used_bytes    BIGINT NOT NULL,
  total_bytes   BIGINT NOT NULL,
  archive_count INTEGER NOT NULL,
  snapshot_at   TIMESTAMPTZ DEFAULT NOW()
);

-- TimeWarp access log
CREATE TABLE timewarp_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  port        INTEGER NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduler queue for upcoming tasks
CREATE TABLE scheduler_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type     TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. SSE Streams Reference

Three SSE endpoints, all requiring `proxy_buffering off` in nginx:

### Stream 1: `/api/commits/stream`

**Purpose**: Feed git commits to CommitComets background animation.

**Client usage**:
```typescript
const es = new EventSource('/api/commits/stream');
es.addEventListener('commits', (e) => {
  const commits = JSON.parse(e.data); // CommitData[]
  // Each: { hash, message, author, timestamp }
});
es.addEventListener('heartbeat', () => {}); // keep-alive
```

**Behavior**:
- On connect: sends last 3 commits immediately
- Every 30s: checks git HEAD SHA for new commits, sends batch if changed
- Every 25s: sends heartbeat
- On disconnect: cleanup via `req.signal.addEventListener('abort')`

### Stream 2: `/api/stats/stream`

**Purpose**: Power the DaveAIStatsWidget with live data.

**Client usage**:
```typescript
const es = new EventSource('/api/stats/stream');
es.addEventListener('stats', (e) => {
  const stats: DaveAIStats = JSON.parse(e.data);
});
es.addEventListener('heartbeat', () => {});
```

**DaveAIStats shape**:
```typescript
interface DaveAIStats {
  totalCommits: number;
  commitsToday: number;
  repoAge: string;           // "2y 3m"
  mostActiveHour: number;    // 0-23
  diskUsedGB: number;
  diskTotalGB: number;
  diskUsedPercent: number;
  archiveCount: number;
  agentsRunning: number;
  agentsTotal: number;
  currentTask: string;
  currentTheme: string;
  uptime: number;            // process.uptime() seconds
  timeWarpPreviews: number;  // active decompressed previews
}
```

**Behavior**: Emits every 5s, heartbeat every 30s.

### Stream 3: `/api/events/site`

**Purpose**: Broadcast site-refresh events to trigger countdown toast.

**Client usage**: Handled automatically by `SiteRefreshListener.tsx` in root layout.

**Payload**:
```typescript
interface SiteRefreshEvent {
  type: 'site_refresh';
  scheduledAt: string;        // ISO timestamp of when swap happened
  newTheme: string;           // e.g. "Midnight Fintech Kinetic"
  countdownSeconds: number;   // Always 60
}
```

**How to trigger**:
```typescript
// From DailyRecreationScheduler after atomic swap:
import { broadcastSiteRefresh } from '@/app/api/events/site/route';
broadcastSiteRefresh({ type: 'site_refresh', scheduledAt: new Date().toISOString(), newTheme, countdownSeconds: 60 });
```

---

## 6. Daily Recreation Flow

Complete step-by-step timeline of what happens when `triggerRecreation()` is called:

```
T+0:00  CronJob fires (default: "0 3 * * *")
        └─ DailyRecreationScheduler.triggerRecreation('scheduled')
        └─ Writes log entry: status='running', stage='generate_brief'

T+0:10  Stage 1: generate_brief
        └─ DailyBriefGenerator.generate(today, last7DayHistory)
        └─ Calls Claude Opus: buildGenerationPrompt(spec) → JSON
        └─ 6-axis diversity: colorPalette, layoutStyle, typography,
           animationStyle, industryFocus, accentMood
        └─ pickFresh() avoids values used in last 7 days per axis
        └─ pickBackground(mood, industry) → SceneType
        └─ Saves brief to daily_briefs table
        └─ Writes .env.daily with NEXT_PUBLIC_THEME_NAME, NEXT_PUBLIC_SCENE_TYPE

T+0:40  Stage 2: build_staging
        └─ rm -rf /var/www/zeroclaw/staging
        └─ cp -r /var/www/zeroclaw/current /var/www/zeroclaw/staging
        └─ Apply brief patches to staging (update theme env vars)
        └─ cd /staging && npm run build
        └─ Typical build time: 2-5 minutes

T+5:00  Stage 3: quality_check
        └─ Verify build exit code === 0
        └─ Run Lighthouse on staging (port 3001)
        └─ Check lighthouse.lhr.categories.performance.score ≥ 0.80
        └─ If FAIL: abort, update log status='failed', send alert

T+5:30  Stage 4: atomic_swap
        └─ mv /var/www/zeroclaw/current → /var/www/zeroclaw/prev_YYYY-MM-DD
        └─ mv /var/www/zeroclaw/staging → /var/www/zeroclaw/current
        └─ systemctl reload nginx  (or: kill -HUP $(cat /var/run/nginx.pid))
        └─ Zero downtime: nginx continues serving during reload

T+5:31  Stage 5: compress (async, non-blocking)
        └─ tar -I 'zstd -T0 -19' -cf /var/www/archives/YYYY-MM-DD.tar.zst \
             -C /var/www/zeroclaw prev_YYYY-MM-DD
        └─ rm -rf /var/www/zeroclaw/prev_YYYY-MM-DD
        └─ Record in site_archives table

T+5:31  Stage 6: broadcast
        └─ broadcastSiteRefresh({ newTheme, countdownSeconds: 60 })
        └─ All SSE clients receive 'site_refresh' event
        └─ SiteRefreshListener shows toast: "Site refreshed! [60s countdown]"
        └─ User can click "Refresh Now" or "Later"

T+6:31  Users who didn't click get auto-refresh via router.refresh()

T+10:00 DiskMonitor.routineCleanup() (runs after each recreation)
        └─ List archives older than maxArchiveDays (default: 365)
        └─ Delete oldest first if disk > WARN_THRESHOLD (80%)
```

### Admin Manual Trigger

```
POST /api/admin/scheduler/trigger
→ Returns 202 Accepted immediately
→ Recreation runs async in background
→ Poll GET /api/admin/scheduler for status
```

### Changing the Schedule

```
PATCH /api/admin/scheduler
Content-Type: application/json
{ "cronExpression": "0 4 * * *", "timezone": "America/New_York" }

→ Validates: 5-field cron regex
→ Validates: Intl.DateTimeFormat timezone
→ Restarts CronJob with new expression
→ Persists to .scheduler-config.json
→ Returns 200 with new config
```

---

## 7. Theme Priority System

`lib/theme/ThemeResolver.ts` — `resolveTheme(context)` returns the active SceneType.

### Priority Levels (highest wins)

| Level | Priority | Source | When Active |
|-------|----------|--------|-------------|
| Admin Override | 10 | Admin dashboard / env var | NEXT_PUBLIC_ADMIN_SCENE set |
| User Preference | 8 | localStorage 'user-scene' | User has manually selected scene |
| Holiday | 6 | holidayDetector.ts | Within holiday window (±1 day) |
| Season | 4 | Date-based | Mar-May=Spring, Jun-Aug=Summer, etc. |
| Weekend | 3 | Day of week | Saturday or Sunday |
| Daily AI | 2 | DailyBriefGenerator | brief.backgroundScene |
| Random Daily | 1 | mulberry32 PRNG | Fallback, seeded by date |

### Holiday Windows

Holidays activate backgrounds for a window around the date:

```typescript
// Christmas: Dec 18 - Dec 31 (extended window)
// Halloween: Oct 24 - Oct 31
// New Year: Dec 31 - Jan 2
// Valentine: Feb 13 - Feb 15
// St Patrick: Mar 16 - Mar 18
// Easter: Easter Sunday ± 2 days
// Independence Day (US): Jul 3 - Jul 5
// Thanksgiving: Thu + Fri + Sat of 4th week in November
// Hanukkah: lookup table 2024-2030 (variable dates)
// Diwali: lookup table 2024-2030 (variable dates)
// ... + 8 more holidays
```

### Season Determination

```typescript
// Spring: Mar 20 - Jun 20 → cherry_blossoms
// Summer: Jun 21 - Sep 22 → ocean_reef (or fireflies)
// Autumn: Sep 23 - Dec 20 → forest_autumn
// Winter: Dec 21 - Mar 19 → snowfall (or aurora)
```

### Seeded Daily Random

```typescript
const seed = year * 10000 + month * 100 + day; // e.g. 20260219
const rng = mulberry32(seed);
// Same date → same scene, every time (reproducible)
```

---

## 8. Weekend System

### Saturday — Arcade Mode

**Detection**: `new Date().getDay() === 6`

**Flow**:
1. `WeekendModeEngine.detectMode()` → `'saturday_arcade'`
2. Load `public/games/meta.json` (cached, refreshes every 5 min)
3. Display arcade UI with game list, ticket balance, leaderboard
4. User spends tickets to play games (or generate new ones)
5. Background: `neon_city` or `retro_grid` (arcade theme)

**Game Generation** (`POST /api/weekend/generate`):
```typescript
interface GameSpec {
  genre: GameGenre;        // 19 options (see below)
  difficulty: 'easy' | 'medium' | 'hard';
  theme: string;           // e.g. "space pirates"
  targetDuration: number;  // minutes
}
```

**19 Game Genres**:
platformer, puzzle, shooter, runner, rhythm, tower_defense, match3,
word_game, trivia, memory, reaction_time, clicker, maze, card_game,
physics, drawing, strategy, arcade_classic, adventure

**Ticket Costs by Genre**:
- Easy platformer/puzzle: 5 tickets
- Medium shooter/rhythm: 10 tickets
- Hard strategy/adventure: 20 tickets
- (See `TICKET_COSTS` in GameGenerator.ts for full map)

**Ticket Economy**:
- +5 tickets on site visit (once per hour)
- +2 tickets per commit streak day
- +10 tickets for new high score
- +3 tickets for watching commit stream 5 min
- Stored in `localStorage['zeroclaw-tickets']`

### Sunday — Relaxation Mode

**Detection**: `new Date().getDay() === 0`

**Flow**:
1. `WeekendModeEngine.detectMode()` → `'sunday_relaxation'`
2. `SundayRelaxation.getScene()` → peaceful SceneType
3. Ambient background: `meditation_garden`, `rain_window`, or `fireplace`
4. Slower animation speeds, softer colors, reduced particles
5. Display "Weekly Digest" — top commits, stats summary

**Sunday Scenes** (calming):
`ocean_calm`, `forest_rain`, `meditation_garden`, `stargazing`, `fireplace`

---

## 9. Background Scene Catalog

All 35+ scenes, their render method, holiday/season trigger, and particle count:

### Space Scenes
| Scene | Render | Trigger | Particles |
|-------|--------|---------|-----------|
| `starfield` | Canvas 2D | Default/daily | 200-800 stars |
| `nebula` | WebGL GLSL | Sci-fi brief | Shader-based |
| `black_hole` | WebGL GLSL | Special events | Shader-based |
| `galaxy_spiral` | Canvas 2D | Space industry | 500 stars |
| `commit_comets` | Canvas 2D | Always overlay | 1 per commit |
| `asteroid_belt` | Canvas 2D | Weekend space | 50 asteroids |
| `solar_system` | React Three Fiber | Special | 3D planets |

### Ocean Scenes
| Scene | Render | Trigger | Particles |
|-------|--------|---------|-----------|
| `ocean_reef` | Canvas 2D + Boids | Summer | 30 fish |
| `ocean_calm` | Canvas 2D | Sunday | Waves only |
| `jellyfish` | Canvas 2D | Relaxation | 8-15 jellyfish |
| `deep_ocean` | WebGL | Dark theme | Shader-based |
| `bioluminescent` | Canvas 2D | Night theme | 100 particles |
| `underwater_cave` | WebGL | Dark brief | Shader-based |

### Nature Scenes
| Scene | Render | Trigger | Particles |
|-------|--------|---------|-----------|
| `cherry_blossoms` | Canvas 2D | Spring | 150 petals |
| `fireflies` | Canvas 2D | Summer night | 50 fireflies |
| `forest_autumn` | Canvas 2D | Autumn | 200 leaves |
| `snowfall` | Canvas 2D | Winter | 300 snowflakes |
| `rain_window` | Canvas 2D | Sunday/Forest | Streaks |
| `meditation_garden` | Canvas 2D | Sunday | Ripples |
| `northern_lights` | WebGL GLSL | Winter/Aurora | Shader |
| `thunderstorm` | Canvas 2D | Dramatic brief | Lightning |

### Holiday Scenes
| Scene | Holiday | Render | Particles |
|-------|---------|--------|-----------|
| `fireworks` | New Year / July 4th | Canvas 2D | Burst types × 4 |
| `halloween_bats` | Halloween | Canvas 2D + Boids | 30 bats |
| `spooky_mist` | Halloween | WebGL | Shader |
| `christmas_snow` | Christmas | Canvas 2D | 400 snowflakes |
| `santa_flight` | Christmas | Canvas 2D | Animated SVG |
| `valentines` | Valentine | Canvas 2D | Heart particles |
| `st_patricks` | St Patrick | Canvas 2D | Shamrocks |
| `diwali_lights` | Diwali | Canvas 2D | Lanterns + fireworks |
| `hanukkah_candles` | Hanukkah | Canvas 2D | Flame simulation |
| `easter_eggs` | Easter | Canvas 2D | Bouncing eggs |

### City/Tech Scenes
| Scene | Render | Trigger | Particles |
|-------|--------|---------|-----------|
| `neon_city` | Canvas 2D | Weekend arcade | Rain + neon |
| `retro_grid` | CSS 3D | Arcade/retro | CSS grid |
| `matrix_rain` | Canvas 2D | Tech/hacker brief | Code rain |
| `circuit_board` | Canvas 2D | Tech industry | Trace anim |
| `data_streams` | Canvas 2D | Data industry | Flow lines |
| `particle_network` | Canvas 2D | Network/startup | Connected dots |

### Special/Ambient
| Scene | Render | Trigger |
|-------|--------|---------|
| `fireplace` | Canvas 2D | Sunday winter |
| `stargazing` | Canvas 2D + Stars | Sunday clear |
| `gradient_mesh` | CSS | Minimal/clean brief |
| `noise_field` | WebGL | Abstract brief |

---

## 10. Environment Variables

### Required (`.env.local` for dev, systemd EnvironmentFile for prod)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zeroclaw

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...

# Site paths (production)
SITE_DIR=/var/www/zeroclaw
CURRENT_DIR=/var/www/zeroclaw/current
STAGING_DIR=/var/www/zeroclaw/staging
ARCHIVE_DIR=/var/www/archives

# Scheduler
SCHEDULER_CRON="0 3 * * *"
SCHEDULER_TZ=UTC
SCHEDULER_PID_FILE=/var/run/zeroclaw-scheduler.pid

# Build
BUILD_COMMAND="npm run build"
LIGHTHOUSE_MIN_SCORE=80

# TimeWarp
TIMEWARP_PORT_START=4000
TIMEWARP_PORT_END=4099
TIMEWARP_TEMP_DIR=/tmp/timewarp
TIMEWARP_IDLE_TIMEOUT_MS=1800000

# Disk
DISK_WARN_THRESHOLD=0.80
DISK_DANGER_THRESHOLD=0.90
MAX_ARCHIVE_DAYS=365
```

### Optional / Runtime-Generated

```bash
# Set by DailyBriefGenerator after each recreation
NEXT_PUBLIC_THEME_NAME="Midnight Fintech Kinetic"
NEXT_PUBLIC_SCENE_TYPE=nebula
NEXT_PUBLIC_COLOR_PALETTE=deep-space-blues

# Admin override (forces specific scene regardless of priority)
NEXT_PUBLIC_ADMIN_SCENE=starfield

# Performance tuning
NODE_OPTIONS=--max-old-space-size=1024
NEXT_TELEMETRY_DISABLED=1

# Logging
LOG_LEVEL=info          # debug | info | warn | error
LOG_PRETTY=false        # true for dev (human-readable), false for prod (JSON)
```

---

## 11. Logging Reference

All logging via `lib/logger.ts` — Pino structured JSON.

### Child Loggers

```typescript
import { logger } from '@/lib/logger';

// Create child with persistent context
const themeLog    = logger.child({ module: 'theme' });
const bgLog       = logger.child({ module: 'background' });
const schedLog    = logger.child({ module: 'scheduler' });
const agentLog    = logger.child({ module: 'agent' });
const statsLog    = logger.child({ module: 'stats' });
const arcadeLog   = logger.child({ module: 'arcade' });
const reqLog      = logger.child({ module: 'request' });
const storageLog  = logger.child({ module: 'storage' });
const timewarpLog = logger.child({ module: 'timewarp' });
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Detailed trace (PRNG values, frame timings) |
| `info` | Normal operations (stage completions, game generated) |
| `warn` | Degraded state (disk > 80%, Lighthouse < 90%) |
| `error` | Failures requiring attention (build failed, DB error) |
| `fatal` | Process-crashing errors |

### Sample Log Lines

```json
{"level":30,"time":1708300800000,"module":"scheduler","stage":"atomic_swap","msg":"Atomic swap complete","duration_ms":245}
{"level":30,"time":1708300800245,"module":"arcade","genre":"platformer","title":"Space Jumper","tokens":4821,"msg":"Game generated"}
{"level":40,"time":1708300800500,"module":"storage","used_pct":0.82,"threshold":0.80,"msg":"Disk usage above warning threshold"}
{"level":30,"time":1708300801000,"module":"theme","scene":"nebula","priority":2,"source":"daily_ai","msg":"Theme resolved"}
{"level":20,"time":1708300801100,"module":"background","tier":"high","cores":4,"mem_gb":16,"msg":"Performance tier detected"}
```

### Log Files (production)

```
/var/log/zeroclaw/app.log          # Next.js server (rotated weekly)
/var/log/zeroclaw/scheduler.log    # Scheduler daemon (rotated weekly)
/var/log/zeroclaw/error.log        # Error-level only
/var/log/nginx/zeroclaw-access.log # nginx access log
/var/log/nginx/zeroclaw-error.log  # nginx error log
```

---

## 12. Quick Start for Agents

When an agent needs to work on this codebase, follow this order:

### Step 1: Read the Docs
```
docs/daveai-master-plan.md          — Full system intent (read overview sections)
docs/daveai-theme-engine.md         — Background scenes and theme system detail
docs/daveai-vps-storage-plan.md     — VPS architecture and storage strategy
docs/daveai-implementation-guide.md — This file (you're reading it!)
```

### Step 2: Understand the Pipeline
The critical path is: **CronJob → DailyRecreationScheduler → DailyBriefGenerator → Build → Swap → Broadcast**

Read these files in order:
1. `lib/daily/DailyBriefGenerator.ts` — What briefs look like
2. `lib/daily/DailyRecreationScheduler.ts` — How the pipeline works
3. `app/api/events/site/route.ts` — How refresh is broadcast
4. `components/SiteRefreshListener.tsx` — How client handles it

### Step 3: Understand the Theme System
1. `lib/theme/ThemeConfig.ts` — Data types
2. `lib/theme/ThemeResolver.ts` — Priority resolution
3. `lib/backgrounds/holidayDetector.ts` — Holiday detection
4. `lib/backgrounds/deviceCapability.ts` — Performance tiers

### Step 4: Understand Backgrounds
Each background is a self-contained Canvas/WebGL/CSS component. Add new backgrounds by:
1. Create `lib/backgrounds/{category}/{SceneName}.tsx`
2. Add `SceneType` value to `ThemeConfig.ts`
3. Add scene entry to Background Scene Catalog above
4. Wire into a `BackgroundRenderer` component (to be created — see §12.1)

### Step 5: Add a New Page or Feature
Follow Next.js 15 App Router conventions:
- Pages: `app/{route}/page.tsx`
- APIs: `app/api/{route}/route.ts`
- Components: `components/{Name}.tsx`
- Server lib: `lib/{category}/{Name}.ts`

### Step 6: Database Changes
1. Create `migrations/00N_description.sql`
2. Run: `psql $DATABASE_URL -f migrations/00N_description.sql`
3. Update TypeScript interfaces in relevant lib files

### Step 7: Deploy Changes
```bash
# On VPS via SSH
cd /var/www/zeroclaw/current
git pull
npm install
npm run build
systemctl restart zeroclaw
```

### Step 8: Test SSE Streams
```bash
# Test commit stream
curl -N http://localhost:3000/api/commits/stream

# Test stats stream
curl -N http://localhost:3000/api/stats/stream

# Test site refresh broadcast (trigger manually)
curl -X POST http://localhost:3000/api/admin/scheduler/trigger
curl -N http://localhost:3000/api/events/site
```

### Step 9: Test Weekend System
```javascript
// Force Saturday arcade mode in browser console
localStorage.setItem('debug-weekend-mode', 'saturday_arcade');
// Force Sunday relaxation
localStorage.setItem('debug-weekend-mode', 'sunday_relaxation');
```

### Step 10: Test Theme Priority
```bash
# Force admin scene override
NEXT_PUBLIC_ADMIN_SCENE=nebula npm run dev

# Test holiday detection
# Set system date to Oct 31 or use debug endpoint:
curl http://localhost:3000/api/admin/debug | jq '.theme'
```

### Step 11: View Admin Debug Panel
```bash
curl http://localhost:3000/api/admin/debug | jq .
# Returns: disk status, scheduler config, timewarp sessions,
#          weekend games, live stats, process info
```

### Step 12: Monitor Disk
```bash
curl http://localhost:3000/api/admin/debug | jq '.disk'
# { usedGB, totalGB, usedPercent, warningLevel, archiveCount }
```

### Step 13: Access TimeWarp
```bash
# List available archive dates
curl http://localhost:3000/api/admin/debug | jq '.timewarp.availableDates'

# Start a preview (allocates port 4000-4099)
# TimeWarpServer.getOrStartPreview('2026-01-15') returns port number
# Visit http://localhost:{port} to see the old site
```

### Step 14: Check Scheduler Status
```bash
curl http://localhost:3000/api/admin/scheduler | jq .
# { config: {cronExpression, timezone, enabled}, status: {isRunning, lastRun, nextRun}, recentRuns: [...] }
```

### Step 15: Trigger Manual Recreation
```bash
curl -X POST http://localhost:3000/api/admin/scheduler/trigger
# Returns 202 Accepted, runs async
# Poll /api/admin/scheduler for status updates
```

### Step 16: Update Scheduler Config
```bash
curl -X PATCH http://localhost:3000/api/admin/scheduler \
  -H 'Content-Type: application/json' \
  -d '{"cronExpression": "0 4 * * *", "timezone": "America/New_York"}'
```

### Step 17: Generate an Arcade Game
```bash
curl -X POST http://localhost:3000/api/weekend/generate \
  -H 'Content-Type: application/json' \
  -d '{"genre": "platformer", "difficulty": "medium", "theme": "cyber pirates", "targetDuration": 5}'
# Only works on Saturdays (returns 403 on weekdays)
```

---

### 12.1 BackgroundRenderer Component (TODO)

This component needs to be created at `components/backgrounds/BackgroundRenderer.tsx`.

It should:
1. Call `resolveTheme(context)` to get current SceneType
2. Detect performance tier via `detectPerformanceTier()`
3. Lazy-load the correct background component
4. Pass `{ seed, tier, width, height }` props

```typescript
// Pseudocode — implement this component
import dynamic from 'next/dynamic';
import { resolveTheme } from '@/lib/theme/ThemeResolver';
import { detectPerformanceTier } from '@/lib/backgrounds/deviceCapability';

const SCENE_COMPONENTS = {
  starfield: dynamic(() => import('@/lib/backgrounds/space/StarField')),
  nebula: dynamic(() => import('@/lib/backgrounds/space/NebulaShader')), // TODO
  ocean_reef: dynamic(() => import('@/lib/backgrounds/ocean/OceanReef')), // TODO
  fireworks: dynamic(() => import('./FireworksCanvas')), // wraps FireworksSystem.ts
  // ... all 35+ scenes
};

export function BackgroundRenderer() {
  const scene = resolveTheme(/* context */);
  const tier = detectPerformanceTier();
  const Component = SCENE_COMPONENTS[scene] ?? SCENE_COMPONENTS.starfield;
  return <Component seed={dateSeed} tier={tier} />;
}
```

**Files still needed** (not yet implemented):
- `lib/backgrounds/space/NebulaShader.tsx` — WebGL GLSL nebula
- `lib/backgrounds/ocean/OceanReef.tsx` — wraps useBoids hook
- `lib/backgrounds/nature/CherryBlossoms.tsx` — petal physics
- `lib/backgrounds/nature/FireflySystem.tsx` — firefly animation
- `lib/backgrounds/city/MatrixRain.tsx` — code rain
- `lib/backgrounds/city/NeonCity.tsx` — neon rain + city silhouette
- `components/backgrounds/BackgroundRenderer.tsx` — the router component above

---

## 13. Testing Checklist

Use this checklist when verifying the system works end-to-end:

### Build & Startup
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes successfully
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] All API routes return expected shapes

### Theme System
- [ ] `resolveTheme()` returns correct scene for each priority level
- [ ] Holiday detection returns correct holiday for test dates (Oct 31, Dec 25, Jan 1)
- [ ] Seeded PRNG returns same scene for same date across page reloads
- [ ] Admin override (NEXT_PUBLIC_ADMIN_SCENE) takes highest priority

### Background Animations
- [ ] StarField renders on Canvas without errors
- [ ] Parallax effect responds to mouse movement
- [ ] CommitComets spawn from SSE commits (or demo mode)
- [ ] FireworksSystem launches bursts with all 4 types
- [ ] useBoids produces natural-looking flocking
- [ ] Performance tier detection returns correct tier on device

### SSE Streams
- [ ] `/api/commits/stream` connects and sends initial commits
- [ ] `/api/stats/stream` sends stats every 5 seconds
- [ ] `/api/events/site` connects and receives test broadcast
- [ ] All streams reconnect after server restart (exponential backoff)
- [ ] nginx properly proxies SSE (no buffering, long timeout)

### Daily Recreation
- [ ] `DailyBriefGenerator.generate()` returns valid brief from Claude
- [ ] 6-axis diversity avoids last 7 days (test with mock history)
- [ ] Scheduler triggers at correct cron time
- [ ] Atomic swap succeeds (staging → current, current → prev)
- [ ] Archive created at correct path with zstd compression
- [ ] Broadcast reaches all SSE clients after swap

### Admin APIs
- [ ] `GET /api/admin/scheduler` returns config + history
- [ ] `PATCH /api/admin/scheduler` updates cron, restarts job
- [ ] `POST /api/admin/scheduler/trigger` returns 202, runs async
- [ ] `GET /api/admin/debug` returns complete system snapshot

### Weekend System
- [ ] Saturday: arcade mode detected, game list loads
- [ ] Sunday: relaxation mode detected, ambient scene selected
- [ ] `POST /api/weekend/generate` generates HTML game (Saturday only)
- [ ] Ticket economy awards and deducts correctly
- [ ] Game high score persists across sessions

### Storage & Disk
- [ ] DiskMonitor reports correct usage percentages
- [ ] Routine cleanup removes archives older than maxArchiveDays
- [ ] Emergency cleanup triggers at DANGER_THRESHOLD (90%)
- [ ] TimeWarpServer allocates ports correctly from pool
- [ ] TimeWarp decompresses archive and serves on allocated port
- [ ] Idle sessions cleaned up after 30 minutes

### Stats Widget
- [ ] Widget renders in bottom-right corner
- [ ] Collapsed view shows key stats
- [ ] Expanded view shows full system info
- [ ] SSE stats stream updates widget every 5 seconds
- [ ] Git stats accurate (totalCommits, commitsToday, repoAge)

### Deployment
- [ ] nginx config valid (`nginx -t`)
- [ ] SSL certificate obtained via certbot
- [ ] systemd services start on boot
- [ ] logrotate config valid (`logrotate -d /etc/logrotate.d/zeroclaw`)
- [ ] `setup.sh` runs without errors on fresh Ubuntu 22.04
- [ ] Scheduler PID file created and readable

---

## Appendix A: Key Constants

```typescript
// Theme priorities
const PRIORITY = {
  ADMIN: 10, USER: 8, HOLIDAY: 6, SEASON: 4,
  WEEKEND: 3, DAILY_AI: 2, RANDOM: 1
};

// Performance tier multipliers
const PARTICLE_MULTIPLIERS = { low: 0.25, medium: 0.6, high: 1.0 };

// Disk thresholds
const WARN_THRESHOLD  = 0.80;  // 80% used → warning
const DANGER_THRESHOLD = 0.90;  // 90% used → emergency cleanup

// TimeWarp
const PORT_START = 4000;
const PORT_END   = 4099;
const MAX_PREVIEWS = 10;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes

// Cron default
const DEFAULT_CRON = '0 3 * * *';  // 3AM UTC daily

// Lighthouse
const MIN_LIGHTHOUSE_SCORE = 80;

// Diversity axes - avoid last N days
const DIVERSITY_WINDOW = 7;

// Ticket economy
const TICKETS_PER_VISIT     = 5;
const TICKETS_PER_COMMIT    = 2;
const TICKETS_PER_HIGHSCORE = 10;
const TICKETS_PER_STREAM    = 3;   // after 5 min watching

// Claude models
const GENERATION_MODEL = 'claude-opus-4-5';   // briefs + games
const FALLBACK_MODEL   = 'claude-haiku-4-5';   // quick fallbacks

// SSE intervals
const STATS_INTERVAL_MS   = 5000;   // 5s
const COMMITS_POLL_MS     = 30000;  // 30s
const HEARTBEAT_MS        = 30000;  // 30s
```

---

## Appendix B: File Relationships Diagram

```
┌─────────────────────────────────────────────────────┐
│                    ROOT LAYOUT                       │
│  app/layout.tsx                                      │
│    ├── <SiteRefreshListener />   ← /api/events/site  │
│    ├── <DaveAIStatsWidget />     ← /api/stats/stream │
│    └── <BackgroundRenderer />    ← ThemeResolver     │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌────────────────┐   ┌─────────────────────┐
│ ThemeResolver  │   │ BackgroundRenderer   │
│ (priority 1-10)│   │ (lazy loads scenes)  │
│    │           │   │    │                 │
│    ├─ holidayDe│   │    ├─ StarField.tsx  │
│    ├─ season   │   │    ├─ CommitComets   │
│    ├─ weekend  │   │    ├─ useBoids.ts    │
│    └─ daily_ai │   │    └─ Fireworks.ts   │
└────────────────┘   └─────────────────────┘

┌─────────────────────────────────────────────────────┐
│              DAILY RECREATION PIPELINE               │
│                                                      │
│  CronJob → DailyRecreationScheduler                  │
│               │                                      │
│               ├─ DailyBriefGenerator → Claude Opus   │
│               ├─ npm run build (staging)             │
│               ├─ Lighthouse quality check            │
│               ├─ atomicSwap() (mv commands)          │
│               ├─ zstd compress → /archives/          │
│               └─ broadcastSiteRefresh() → SSE        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 WEEKEND SYSTEM                       │
│                                                      │
│  WeekendModeEngine.detectMode()                      │
│    ├─ Saturday → GameGenerator → Claude Opus → HTML  │
│    │              TicketEconomy (localStorage)        │
│    └─ Sunday  → SundayRelaxation → ambient scene     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 STORAGE SYSTEM                       │
│                                                      │
│  DiskMonitor (thresholds 80% / 90%)                  │
│    └─ routineCleanup() / emergencyCleanup()          │
│                                                      │
│  TimeWarpServer (ports 4000-4099)                    │
│    └─ zstd decompress → npx serve → preview          │
└─────────────────────────────────────────────────────┘
```

---

*This guide covers all implemented files as of 2026-02-19.*
*For the full background scene design specs, see `docs/daveai-theme-engine.md`.*
*For VPS architecture and storage math, see `docs/daveai-vps-storage-plan.md`.*
*For the complete system design, see `docs/daveai-master-plan.md`.*
