# DaveAI Agentic Website Builder — Master Plan

> **Date:** 2026-02-19 | **Status:** Active Planning Document
> **Project:** daveai.tech — A fully agentic Wix/Lindo.ai-style website builder powered by ZeroClaw agents
> **Audited by:** 3 parallel Claude audit agents synthesizing full codebase + SOTA research

---

## Table of Contents

1. [Part 1: Codebase State Audit & Critical Fixes Required](#part-1-codebase-state-audit--critical-fixes-required)
2. [Part 2: SOTA Feature Set, Timeline Engine & Missing Capabilities](#part-2-sota-feature-set-timeline-engine--missing-capabilities)
3. [Part 3: Milestone Roadmap, Architecture & Implementation](#part-3-milestone-roadmap-architecture--implementation)

---

## Part 1: Codebase State Audit & Critical Fixes Required

---

### 1.1 Service Inventory

| Service | Port | Container Name | Status | Version/Binary | Health Check | Notes |
|---|---|---|---|---|---|---|
| ZeroClaw | 3000 (internal) | zeroclaw | Unknown | Rust binary (native runtime) | `/health` assumed | Exposed only to Docker network; nginx blocks external access |
| LiteLLM | 4000 | litellm | Unknown | litellm proxy | `/health` | Routes to LM Studio PCs at 100.64.0.10:1234 and 100.64.0.11:1235 |
| Agent Brain | 8888 | agent-brain | BROKEN | brain.py (v3 deployed) | `/health` present | v4 exists but NOT deployed; all v4 endpoints dead |
| Next.js UI | 3001 | agentic-ui | Partial | Next.js (version unconfirmed) | HTTP 200 on `/` | SSE/stream endpoints point to wrong internal hostname |
| Nginx | 80/443 | host process | Unknown | Nginx (version unconfirmed) | Config passes `nginx -t` | Proxies daveai.tech → :3001, /api → :8888, /zeroclaw → :3000 |
| Playwright | N/A | N/A | Not integrated | playwright via npm | smoke.spec.ts exists | Not wired into any CI or PM2 process |
| self_improve.py | N/A | N/A | Dead | Python script | None | No process manager entry |
| watchdog.py | N/A | N/A | Dead | Python script | None | No process manager entry |

---

### 1.2 Critical Bugs Table

| # | Bug | Severity | Impact | Fix Required |
|---|---|---|---|---|
| B-001 | `brain.py` (v3) is the deployed entrypoint, not `brain_v4_part1.py` | P0 CRITICAL | Every UI feature requiring `/stream`, `/agents/status`, `/admin/login`, `/pages`, `/vault`, `/projects`, `/analytics` is completely dead. The UI renders but all advanced actions fail silently or 404. | Concatenate `brain_v4_part1.py` + `brain_v4_part2.py` into `brain.py`, or update `docker-compose.yml` CMD to point to the v4 entry. |
| B-002 | `NEXT_PUBLIC_AGENT_HTTP=http://agent-brain:8888` is a Docker-internal hostname | P0 CRITICAL | The browser (client-side JS) cannot resolve `agent-brain` as a hostname. All fetch/SSE calls from the browser to this URL fail with DNS resolution errors. The value must be a public URL. | Change to `NEXT_PUBLIC_AGENT_HTTP=https://daveai.tech/api` in `docker-compose.yml` and rebuild the UI container. |
| B-003 | `agent_skills.py` (50+ tools) is imported by `brain_v4` but NOT by the deployed `brain.py` (v3) | P0 CRITICAL | Every skill — file ops, git, npm, playwright, lighthouse, shadcn, LLM tools — is dead code. Agents have zero tool capability in production. | Deploy v4 brain (fixes B-001), which already imports the skill registry. |
| B-004 | LiteLLM fallback model `claude-sonnet-4-5` requires `ANTHROPIC_API_KEY` which is absent from `litellm/.env` | P1 HIGH | Any request that triggers the fallback chain hits an auth error. The fallback is supposed to be the safety net; its failure means total model unavailability if LM Studio PCs are unreachable. | Add `ANTHROPIC_API_KEY` to `litellm/.env` and restart the litellm container. |
| B-005 | ZeroClaw skills in `agent_skills_p1.py` call assumed endpoints (`/tools/shell/run`, `/tools/file/write`, `/tools/file/read`, `/workspace/tree`) that may not match actual ZeroClaw REST API surface | P1 HIGH | Shell execution, file write, file read, and workspace tree tools will 404 or return unexpected responses, silently breaking the Coder and Asset agents. | Audit actual ZeroClaw HTTP endpoint routes from source (`src/tools/*.rs`, gateway layer). Map each skill call to the correct route. |
| B-006 | ZeroClaw `kind="native"` in `config.toml` — no sandbox isolation | P1 HIGH | Agent shell commands run as the container user with no bubblewrap/firejail/landlock containment. A prompt injection or runaway agent command can affect the host filesystem at `/var/www/agentic-website`. | Switch to `kind="docker"` or `kind="firejail"` in `zeroclaw-config/config.toml`. ZeroClaw source confirms docker/firejail/landlock/bubblewrap backends exist. |
| B-007 | `self_improve.py` and `watchdog.py` not started by any process manager or Docker entrypoint | P2 MEDIUM | Self-improvement loop and process watchdog are completely inert. No automatic recovery from crashes, no feedback-driven skill updates. | Add to PM2 ecosystem file or add RUN/CMD entries in the agent-brain Dockerfile. |
| B-008 | Voice input in `page.tsx` is a UI sketch — no Web Speech API implementation | P2 MEDIUM | Voice button renders but does nothing. Users clicking it get no feedback and no function. | Implement `window.SpeechRecognition` / `webkitSpeechRecognition` with interim results fed into the chat input, or remove the button to avoid user confusion. |
| B-009 | OpenRouter provider not configured in `litellm/config.yaml` despite being referenced in master planning | P2 MEDIUM | Any model that was intended to route through OpenRouter (for burst capacity or cost control) is silently absent. The system is entirely dependent on two LM Studio PCs. | Add OpenRouter virtual keys to `litellm/config.yaml` with correct `api_base: https://openrouter.ai/api/v1` and the appropriate `OPENROUTER_API_KEY` env var. |
| B-010 | `website-workspace/tests/smoke.spec.ts` is never executed by any automated process | P2 MEDIUM | QA agent's Playwright test capability exists on disk but is not wired into the build/deploy pipeline. Regressions go undetected. | Add a PM2 post-deploy hook or a ZeroClaw cron skill that runs `npx playwright test` after agent build cycles complete. |

---

### 1.3 File-by-File Status Table

| File | State | Role | Notes |
|---|---|---|---|
| `agent-brain/brain.py` | DEPLOYED BUT OBSOLETE | v3 brain entrypoint | Only has `/chat`, `/ws`, `/health`. Missing all v4 features. Should be replaced. |
| `agent-brain/brain_v4_part1.py` | EXISTS, NOT DEPLOYED | v4 brain part 1 | Contains FastAPI app init, JWT auth, SQLite schema, `/stream` SSE, `/agents/status`, `/admin/login`, LangGraph graph construction. |
| `agent-brain/brain_v4_part2.py` | EXISTS, NOT DEPLOYED | v4 brain part 2 | Contains `/pages` CRUD, `/vault`, `/gitlab`, `/projects`, `/analytics`, SMTP email, key vault JSON, token streaming handlers. |
| `agent-brain/agent_skills_p1.py` | EXISTS, NOT ACTIVE | Tool definitions part 1 | 40+ tools covering filesystem, git, npm, PM2, nginx, docker, playwright, lighthouse, eslint, security, network. Not loaded by deployed brain. |
| `agent-brain/agent_skills_p2.py` | EXISTS, NOT ACTIVE | Tool definitions part 2 | LLM-powered tools (vision, copy gen, SEO, code review, design suggest), shadcn, scaffolding, env, SSL, backup, accessibility, email, webhook, log. Not loaded by deployed brain. |
| `agent-brain/agent_skills.py` | EXISTS, NOT ACTIVE | Skills registry | Defines `SUPERVISOR_SKILLS`, `CODER_SKILLS`, `ASSET_SKILLS`, `QA_SKILLS` subsets. Imported by brain_v4, dead in v3. |
| `agent-brain/self_improve.py` | EXISTS, ORPHANED | Self-improvement loop | Not started by any process. Logic present but inert. |
| `agent-brain/watchdog.py` | EXISTS, ORPHANED | Process watchdog | Not started by any process. Logic present but inert. |
| `agent-brain/.env` | EXISTS | Brain environment config | Has `ZEROCLAW_URL`, `LITELLM_URL`, `WORKSPACE`, `HEAVY_MODEL`, `FAST_MODEL`, `AUTONOMY`, `GIT_REMOTE`, `SITE_URL`. Missing `ANTHROPIC_API_KEY` passthrough if needed. |
| `agentic-ui/app/page.tsx` | EXISTS, PARTIALLY BROKEN | Next.js frontend | Full Lindo.ai-style UI with SSE streaming, 4-agent cards, admin JWT modal, page CRUD, project switcher. Broken because `NEXT_PUBLIC_AGENT_HTTP` resolves to Docker-internal hostname in browser context. |
| `stack/docker-compose.yml` | EXISTS, HAS BUGS | Service orchestration | B-002 hostname bug. Brain entrypoint likely points to `brain.py` not v4. Needs audit of all CMD/entrypoint values. |
| `nginx/daveai.tech.conf` | EXISTS, CORRECT | Reverse proxy config | WS/SSE headers present. ZeroClaw internal-only. Paths `/api` → `:8888`, `/zeroclaw` → `:3000` look correct structurally. |
| `litellm/config.yaml` | EXISTS, INCOMPLETE | LiteLLM model router | 4 models configured with latency-based routing. Fallback to claude-sonnet-4-5 will fail without API key. OpenRouter not configured. |
| `litellm/.env` | EXISTS OR MISSING | LiteLLM secrets | `ANTHROPIC_API_KEY` likely absent. `OPENROUTER_API_KEY` absent. |
| `zeroclaw-config/config.toml` | EXISTS, INSECURE | ZeroClaw daemon config | `kind="native"` — no sandbox. Security allowlist present. `workspace=/var/www/agentic-website`. |
| `website-workspace/playwright.config.ts` | EXISTS | Playwright config | Configured but not executed automatically. |
| `website-workspace/tests/smoke.spec.ts` | EXISTS | E2E smoke test | Basic tests present, never run in pipeline. |


---

### 1.4 ZeroClaw Integration Gaps

#### 1.4.1 What the Skills Assume

The Python skills in `agent_skills_p1.py` make HTTP calls to ZeroClaw endpoints. The assumed API surface is:

```
POST /tools/shell/run          — zeroclaw_shell skill
GET  /tools/file/read          — zeroclaw_file_read skill
POST /tools/file/write         — zeroclaw_file_write skill
GET  /workspace/tree           — zeroclaw_workspace_tree skill
GET  /tools/http/get           — zeroclaw_http_get skill
POST /tools/http/post          — zeroclaw_http_post skill
GET  /health                   — service_health skill
GET  /status                   — zeroclaw_status skill
```

#### 1.4.2 What ZeroClaw Actually Exposes

From reading ZeroClaw source structure (`src/tools/*.rs`, `src/gateway/`, `src/daemon/`), the actual tool implementations are Rust structs registered through a tool registry. The confirmed tool implementations from source are:

```
src/tools/shell.rs             — shell execution (sandbox-aware)
src/tools/file_read.rs         — file read
src/tools/file_write.rs        — file write
src/tools/git_operations.rs    — git ops
src/tools/http_request.rs      — HTTP client
src/tools/screenshot.rs        — screenshots
src/tools/browser.rs           — browser control
src/tools/browser_open.rs      — browser open
src/tools/memory_store.rs      — memory write
src/tools/memory_recall.rs     — memory read
src/tools/memory_forget.rs     — memory delete
src/tools/web_search_tool.rs   — web search
src/tools/image_info.rs        — image metadata
src/tools/schedule.rs          — scheduling
src/tools/cron_*.rs            — cron management (5 files)
src/tools/delegate.rs          — agent delegation
src/tools/pushover.rs          — push notifications
src/tools/proxy_config.rs      — proxy management
src/tools/hardware_*.rs        — hardware introspection (3 files)
```

#### 1.4.3 Gap Analysis Table

| Skill in agent_skills_p1.py | Assumed ZeroClaw Endpoint | ZeroClaw Tool File Confirmed | Route Confirmed | Risk |
|---|---|---|---|---|
| `zeroclaw_shell` | `POST /tools/shell/run` | `shell.rs` — YES | NO — route unknown | HIGH |
| `zeroclaw_file_read` | `GET /tools/file/read` | `file_read.rs` — YES | NO — route unknown | HIGH |
| `zeroclaw_file_write` | `POST /tools/file/write` | `file_write.rs` — YES | NO — route unknown | HIGH |
| `zeroclaw_workspace_tree` | `GET /workspace/tree` | No dedicated rs file | NO — may not exist | CRITICAL |
| `zeroclaw_http_get` | `GET /tools/http/get` | `http_request.rs` — YES | NO — route unknown | HIGH |
| `zeroclaw_http_post` | `POST /tools/http/post` | `http_request.rs` — YES | NO — route unknown | HIGH |
| `zeroclaw_status` | `GET /status` | Daemon health infra | NO — route unknown | MEDIUM |
| Git skills (git_diff, git_push, etc.) | Called via shell or direct | `git_operations.rs` — YES | NO — may be shell-wrapped | HIGH |
| `playwright_screenshot` | Called via shell `npx playwright` | `screenshot.rs` — YES | NO — may be separate endpoint | MEDIUM |

#### 1.4.4 Python SDK Overlap

ZeroClaw ships a Python SDK at `zeroclaw/python/zeroclaw_tools/tools/` with `file.py`, `memory.py`, `shell.py`, `web.py`. The current `agent_skills_p1.py` does NOT use this SDK — it makes raw HTTP calls. This is a correctness risk: the SDK likely handles auth tokens, serialization, and endpoint routing correctly.

**Recommendation:** Replace raw HTTP calls in all `zeroclaw_*` skills with imports from the ZeroClaw Python SDK.

---

### 1.5 Deployment Gaps

#### docker-compose.yml Issues

```yaml
# CURRENT (BROKEN):
environment:
  - NEXT_PUBLIC_AGENT_HTTP=http://agent-brain:8888
  # ^ Docker-internal hostname. Browser JS cannot resolve this.

# REQUIRED FIX:
environment:
  - NEXT_PUBLIC_AGENT_HTTP=https://daveai.tech/api
  # ^ Public URL proxied through nginx to :8888
```

#### Environment Variable Gaps

| Variable | Service | Status | Required Value |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | litellm | MISSING | Required for claude-sonnet-4-5 fallback |
| `OPENROUTER_API_KEY` | litellm | MISSING | Required if OpenRouter routing is added |
| `NEXT_PUBLIC_AGENT_HTTP` | agentic-ui | WRONG VALUE | Must be `https://daveai.tech/api` |
| `LITELLM_MASTER_KEY` | litellm | UNCONFIRMED | Required if brain authenticates to litellm |
| `JWT_SECRET` | agent-brain | UNCONFIRMED | Required for v4 admin auth — must match between restarts |
| `SMTP_HOST/USER/PASS` | agent-brain | UNCONFIRMED | Required for email skill and v4 SMTP features |
| `GIT_REMOTE` | agent-brain | EXISTS | Must be valid GitLab/GitHub remote for git_push to work |
| `VAULT_KEY` | agent-brain | UNCONFIRMED | Required for key vault encryption in brain_v4_part2 |

#### Nginx SSE Gap

The nginx config must add `proxy_buffering off` and `X-Accel-Buffering: no` to the `/api/stream` location block. Standard proxy buffering will break SSE.

---

### 1.6 What Is Working vs. Broken

#### Currently Working (with caveats)

| Component | Working | Caveat |
|---|---|---|
| Nginx reverse proxy | YES | SSE buffering headers unverified |
| ZeroClaw daemon startup | LIKELY | Native runtime, no sandbox |
| LiteLLM routing to LM Studio PC1/PC2 | LIKELY | Depends on PC availability; no OpenRouter fallback |
| Next.js UI renders | YES | UI loads, but all API calls fail |
| Basic `/health` endpoint | YES | brain.py v3 has this |
| Docker container orchestration | LIKELY | Restart policies unconfirmed |

#### Currently Broken

| Component | Broken Because |
|---|---|
| SSE `/stream` endpoint | brain.py v3 does not have it |
| Agent status panel (`/agents/status`) | brain.py v3 does not have it |
| Admin login modal | brain.py v3 does not have `/admin/login` |
| Page CRUD (create/edit/delete pages) | brain.py v3 does not have `/pages` |
| Key vault | brain.py v3 does not have `/vault` |
| Projects endpoint | brain.py v3 does not have `/projects` |
| Analytics | brain.py v3 does not have `/analytics` |
| All 50+ agent skills | agent_skills.py not imported in deployed brain |
| Browser-to-brain API calls | `NEXT_PUBLIC_AGENT_HTTP` is Docker-internal hostname |
| claude-sonnet-4-5 fallback | `ANTHROPIC_API_KEY` not in litellm env |
| self_improve loop | Not started by any process |
| watchdog recovery | Not started by any process |
| Voice input | Not implemented |
| Playwright test automation | Not wired into pipeline |
| ZeroClaw tool calls from skills | Route correctness unverified |

---

### 1.7 Immediate Fix Priority List

#### P0 — System is non-functional without these fixes

| ID | Action | Files to Change | Estimated Effort |
|---|---|---|---|
| P0-1 | Deploy v4 brain: merge `brain_v4_part1.py` + `brain_v4_part2.py` into `brain.py` OR update `docker-compose.yml` CMD to use the v4 entrypoint | `agent-brain/brain.py`, `stack/docker-compose.yml` | 30 min |
| P0-2 | Fix `NEXT_PUBLIC_AGENT_HTTP` to public URL | `stack/docker-compose.yml`, rebuild agentic-ui container | 15 min + rebuild |
| P0-3 | Add SSE buffering headers to nginx for `/api/stream` | `nginx/daveai.tech.conf` | 10 min + nginx reload |
| P0-4 | Verify ZeroClaw actual REST route paths from gateway source and correct all `zeroclaw_*` skills | `agent-brain/agent_skills_p1.py`, optionally switch to Python SDK | 2-4 hours |

#### P1 — System is degraded / insecure without these fixes

| ID | Action | Files to Change | Estimated Effort |
|---|---|---|---|
| P1-1 | Add `ANTHROPIC_API_KEY` to litellm env | `litellm/.env` | 5 min |
| P1-2 | Switch ZeroClaw `kind` from `native` to `docker` or `firejail` | `zeroclaw-config/config.toml` | 30 min + ZeroClaw restart |
| P1-3 | Confirm and add all missing env vars (`JWT_SECRET`, `LITELLM_MASTER_KEY`, `SMTP_*`, `VAULT_KEY`) | `agent-brain/.env`, `litellm/.env` | 30 min |
| P1-4 | Add Docker health checks and `restart: unless-stopped` to all services | `stack/docker-compose.yml` | 20 min |
| P1-5 | Verify shared volume mount between zeroclaw and agent-brain for workspace | `stack/docker-compose.yml` | 15 min |

#### P2 — System is incomplete without these fixes

| ID | Action | Files to Change | Estimated Effort |
|---|---|---|---|
| P2-1 | Add `self_improve.py` and `watchdog.py` to PM2 ecosystem or Dockerfile CMD | `stack/docker-compose.yml` or new `pm2.config.js` | 30 min |
| P2-2 | Implement Web Speech API voice input in page.tsx or remove button | `agentic-ui/app/page.tsx` | 1-2 hours |
| P2-3 | Configure OpenRouter in litellm for burst/fallback capacity | `litellm/config.yaml`, `litellm/.env` | 30 min |
| P2-4 | Wire `smoke.spec.ts` into post-deploy hook or ZeroClaw cron | `website-workspace/playwright.config.ts`, PM2 or ZeroClaw cron skill | 1 hour |
| P2-5 | Switch ZeroClaw skill calls from raw HTTP to Python SDK (`zeroclaw/python/zeroclaw_tools`) | `agent-brain/agent_skills_p1.py` | 3-4 hours |
| P2-6 | Add GitLab CI pipeline or equivalent to run lint, type-check, and Playwright on push | New `.gitlab-ci.yml` | 2 hours |

> **Summary Assessment:** The two P0 fixes (deploying v4, correcting `NEXT_PUBLIC_AGENT_HTTP`) will unlock ~80% of the system in under one hour. The ZeroClaw skill endpoint verification (P0-4) is the highest-risk item requiring the most investigation.


---

## Part 2: SOTA Feature Set, Timeline Engine & Missing Capabilities

---

### 2.1 TimeWarp Timeline Engine (Detailed Spec)

#### Overview

The TimeWarp engine transforms the existing git commit history into a first-class visual experience, analogous to a video editing timeline in tools like DaVinci Resolve or Fusion 3D. Every agent action that modifies the site becomes a "keyframe" in the timeline. Users scrub through time, preview past states, compare versions, and restore with one click.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TimeWarp Engine                              │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐ │
│  │  Git Layer  │───▶│ Snapshot DB  │───▶│  Timeline UI API   │ │
│  │ (per-site   │    │ (SQLite)     │    │  /api/timewarp/*   │ │
│  │  bare repo) │    │ thumbnails,  │    │                    │ │
│  │             │    │ metadata,    │    │  GET /frames       │ │
│  │  commits    │    │ diffs cached)│    │  GET /snapshot/:id │ │
│  │  branches   │    │              │    │  POST /restore     │ │
│  │  tags       │    │ Redis cache  │    │  GET /diff         │ │
│  └─────────────┘    └──────────────┘    └────────────────────┘ │
│         │                  │                      │             │
│         ▼                  ▼                      ▼             │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐ │
│  │  Snapshot   │    │  Thumbnail   │    │   Next.js Timeline │ │
│  │  Worker     │    │  Renderer    │    │   Component        │ │
│  │  (headless  │    │  (Playwright │    │   <TimeWarp />     │ │
│  │   Chromium) │    │   screenshot)│    │                    │ │
│  └─────────────┘    └──────────────┘    └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Git Commits as Timeline Keyframes

Every meaningful agent operation is committed to the site's dedicated git repository using a structured commit message schema:

```
[AGENT:coder] [TYPE:feature] Add hero section with gradient background
[AGENT:asset] [TYPE:image] Generate hero background image via Flux
[AGENT:qa] [TYPE:fix] Fix mobile overflow on nav menu
[AGENT:supervisor] [TYPE:daily] Daily autonomous generation — Theme: Nordic Minimal
[AGENT:coder] [TYPE:style] Apply Dracula color palette
[USER] [TYPE:manual] User edited contact form layout
```

#### UI Spec: The TimeWarp Panel

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TIMEWARP  [main ▼]  [🔍 Filter: All Agents ▼]  [📅 Jan 1 – Feb 19 ▼]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ◀◀  ◀  [ PLAYING ]  ▶  ▶▶       🕐 2026-02-19 14:32  [LIVE]           │
│                                                                          │
│  ─────────────────────────────────────●────────────────────────────►    │
│  Jan 1    Jan 15    Feb 1    Feb 10  [scrubber]  Feb 19 (now)           │
│                                                                          │
│  [thumb] [thumb] [thumb] [thumb] [thumb] [thumb] [thumb] [thumb] [NOW]  │
│   Jan1    Jan3   Jan7   Jan15   Jan22   Feb1    Feb10   Feb17   Feb19   │
│   Daily   Coder  Asset  Daily   Daily   Fix     Daily   Style   LIVE    │
│                                                                          │
│  Branch tracks:                                                          │
│  main:     ●────────●──────────●─────────●───────────●──────────●       │
│  feature/  ·············●──────●─────────● (merged Feb 10)              │
│  dark-mode                                                               │
│                                                                          │
│  [GHOST MODE: OFF]  [DIFF OVERLAY: OFF]  [RESTORE THIS POINT]          │
└──────────────────────────────────────────────────────────────────────────┘
│                        PREVIEW IFRAME                                    │
│         [ Site as of 2026-01-15 — "Arctic Frost" Daily Theme ]          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Keyframe color coding:**

| Agent/Type | Color | Icon |
|---|---|---|
| Daily (auto) | Purple | ★ |
| Coder agent | Blue | { } |
| Asset agent | Orange | IMG |
| QA agent | Green | ✓ |
| User manual | White | ✎ |
| Restore point | Gold | ◆ |

#### Preview Mechanism: Iframe + Git Snapshot Cache

```
1. User scrubs to SHA abc1234
2. Brain API: GET /api/timewarp/snapshot/abc1234
3. Snapshot Worker checks cache:
   - If HIT: return static file path /snapshots/abc1234/
   - If MISS:
     a. git worktree add /tmp/snapshot-abc1234 abc1234
     b. Copy static build output to /snapshots/abc1234/
     c. git worktree remove /tmp/snapshot-abc1234
     d. Record in snapshot DB
4. Next.js serves <iframe src="/snapshots/abc1234/index.html" sandbox />
5. Iframe is pointer-events: none in preview mode (read-only)
```

Snapshots older than 90 days are stored as compressed tarballs and decompressed on demand (target: under 2 seconds).

#### Ghost Mode (Overlay Diff)

Ghost Mode renders two snapshots simultaneously — the historical state at semi-transparency overlaid on the current live site:

```css
.ghost-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.35;
    mix-blend-mode: difference;
    pointer-events: none;
    z-index: 100;
}
```

A slider (0–100%) controls the ghost opacity. The file-level diff is shown in a collapsible drawer below the preview.

#### Branching Timeline Visualization

Feature branches appear as parallel horizontal tracks beneath the main branch track, rendered as an SVG canvas using dagre-d3 or a custom DAG layout:

```
main:        A────B────C──────────────G────H────I (LIVE)
                        \            /
feature/hero:            D────E────F
                                    (merged at G)
```

#### Timeline Filters

- **By agent:** Coder / Asset / QA / Supervisor / User / All
- **By file type:** HTML only / CSS only / JS only / Images only / All
- **By commit type:** Feature / Fix / Style / Daily / Manual
- **By date range:** Calendar picker, presets (Last 7d / 30d / 90d / All time)
- **By theme name:** Search the `theme_name` field in keyframes table
- **By keyword:** Full-text search over commit summaries

#### Restore from Any Point

```
POST /api/timewarp/restore
{
  "site_id": "site_abc",
  "sha": "abc1234",
  "mode": "full" | "merge" | "branch"
}
```

- **full**: Hard reset — site becomes exactly the snapshot. Current state is auto-committed as a restore backup keyframe before the reset.
- **merge**: Attempt a 3-way git merge between snapshot, current, and a common ancestor.
- **branch**: Create a new branch from the snapshot SHA, allowing parallel exploration without touching main.

#### Export Snapshot as ZIP

`GET /api/timewarp/export/:sha` returns a ZIP containing all HTML, CSS, JS files, referenced images/fonts, a `timewarp_metadata.json` with commit info, theme name, style seed, and a `README.md` auto-generated by LLM from the commit history up to that point.

---

### 2.2 Daily Autonomous Site Generation Engine

#### Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Daily Generation Pipeline                    │
│                                                          │
│  APScheduler / ZeroClaw Cron                             │
│       │                                                  │
│       ▼  (configurable: daily/weekly/monthly at HH:MM)  │
│  ┌─────────────────┐                                     │
│  │  StyleSeed Gen  │◀─── Admin settings (constraints)   │
│  │  - palette      │                                     │
│  │  - font pair    │                                     │
│  │  - layout var   │                                     │
│  │  - theme name   │                                     │
│  └────────┬────────┘                                     │
│           ▼                                              │
│  ┌─────────────────┐                                     │
│  │  Concept Brief  │◀─── Trend scraper results           │
│  │  Generator LLM  │     (Dribbble / Awwwards)           │
│  └────────┬────────┘                                     │
│           ▼                                              │
│  ┌─────────────────────────────────────┐                 │
│  │     LangGraph 4-Agent Pipeline      │                 │
│  │  Supervisor → Coder → Asset → QA   │                 │
│  └────────┬────────────────────────────┘                 │
│           ▼                                              │
│  ┌─────────────────┐                                     │
│  │  QA Gate        │── FAIL ──▶ Auto-fix loop (3x max)  │
│  └────────┬────────┘                                     │
│           │ PASS                                         │
│           ▼                                              │
│  ┌─────────────────┐                                     │
│  │  Git commit +   │                                     │
│  │  Thumbnail gen  │                                     │
│  │  + Gallery add  │                                     │
│  └─────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
```

#### Style Seed System

Every daily generation begins with a randomly generated (or admin-constrained) style seed:

```json
{
  "seed_id": "f3a7c2",
  "theme_name": "Nordic Minimal",
  "palette": {
    "primary":    "#2E3440",
    "secondary":  "#4C566A",
    "accent":     "#88C0D0",
    "background": "#ECEFF4",
    "text":       "#2E3440",
    "scheme":     "analogous"
  },
  "fonts": {
    "heading": "Inter",
    "body":    "DM Sans",
    "mono":    "JetBrains Mono",
    "pairing_class": "sans-sans-modern"
  },
  "layout": {
    "variant":       "editorial",
    "hero_style":    "full-bleed-text-left",
    "nav_style":     "minimal-top",
    "section_rhythm": "asymmetric",
    "grid":          "12-col",
    "border_radius": "4px",
    "spacing_scale": "comfortable"
  },
  "motion": {
    "intensity":  "subtle",
    "library":    "framer-motion",
    "entry_anim": "fade-up"
  },
  "personality": "clean, professional, Scandinavian",
  "industry_target": "tech startup"
}
```

**Font pairing database (sample):**

| Class | Heading | Body | Personality |
|---|---|---|---|
| classic-editorial | Playfair Display | Source Serif 4 | elegant, literary |
| modern-tech | Space Grotesk | Inter | sharp, technical |
| warm-humanist | Fraunces | Nunito | friendly, organic |
| minimal-swiss | Neue Haas Grotesk | Helvetica Now | corporate, precise |
| expressive-display | Clash Display | DM Sans | bold, creative |
| retro-revival | Bebas Neue | IBM Plex Mono | retro, edgy |

#### Multi-Page Generation

Each daily site generates a complete multi-page site:

```
Pages generated per daily run:
├── index.html      (Home)     — hero, features, testimonials, CTA
├── about.html      (About)    — story, team, values, timeline
├── services.html   (Services) — cards, pricing table, FAQ
├── contact.html    (Contact)  — form, map embed, socials
├── blog/
│   ├── index.html  (Blog list) — article cards, categories, search
│   └── post-1.html (Sample)    — generated article with AI content
└── 404.html        (Error)    — branded error page
```

#### Admin Controls

```
┌─────────────────────────────────────────────────────┐
│  DAILY GENERATION SETTINGS                          │
├─────────────────────────────────────────────────────┤
│  Schedule:       [Daily ▼]  at  [02:00 AM ▼]       │
│  Timezone:       [UTC ▼]                            │
│  Auto-promote:   [OFF] (manual review required)     │
│  Auto-promote if QA score ≥ [90]%                   │
│                                                     │
│  Style Constraints:                                 │
│  ├── Lock brand colors:  [#FF6B00] [#1A1A2E]       │
│  ├── Font lock:          [OFF — allow any]          │
│  ├── Layout lock:        [OFF — allow any]          │
│  ├── Industry target:    [Tech ▼]                   │
│  └── AI autonomy level:  [████████░░] 80%           │
│                                                     │
│  Retention:      [90 days ▼]                        │
│  Pages per site: [All ▼] (Home/About/Services/...)  │
│  Thumbnail res:  [1280x720 ▼]                       │
│                                                     │
│  [Save Settings]  [Run Now]  [View History]        │
└─────────────────────────────────────────────────────┘
```

**AI autonomy level** (0–100 slider):
- 0%: Strictly follows brand guidelines, no creative deviation
- 50%: Follows guidelines but may experiment with layouts
- 100%: Full creative freedom, only brand colors are respected

#### Generated Site Gallery

```
┌─────────────────────────────────────────────────────────────────┐
│  GENERATED SITES GALLERY           [Sort: Newest ▼] [Filter ▼] │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │       │
│  │ Feb 19   │  │ Feb 18   │  │ Feb 17   │  │ Feb 16   │       │
│  │ Nordic   │  │ Tropical │  │ Brutalist│  │ Glassmor.│       │
│  │ Minimal  │  │ Vibrant  │  │ Dark     │  │ Light    │       │
│  │ ★★★★☆   │  │ ★★★☆☆   │  │ ★★★★★   │  │ ★★☆☆☆   │       │
│  │ QA: 94% │  │ QA: 87% │  │ QA: 97% │  │ QA: 72% │       │
│  │[PREVIEW] │  │[PREVIEW] │  │[MAKE LIVE│  │[PREVIEW] │       │
│  │[RESTORE] │  │[RESTORE] │  │ CONFIRM] │  │[RESTORE] │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.3 AI Creativity Engine

#### Trend Scraping Pipeline

```
Trend Scraper (runs weekly, or on-demand):
├── Targets:
│   ├── Dribbble /shots/popular (CSS scraper + image download)
│   ├── Awwwards /nominees (scraper + metadata)
│   ├── SiteInspire (scraper)
│   └── Muzli Design News RSS feed
│
├── Extracts:
│   ├── Color palettes (via image color quantization — k-means 5 colors)
│   ├── Layout patterns (described by VLM — LLaVA/Claude Vision)
│   ├── Typography observations (VLM or OCR + font classifier)
│   └── Design keywords / mood tags
│
└── Stores in: trends_db (SQLite)
    ├── trend_id, source, date_scraped
    ├── dominant_colors (JSON array)
    ├── layout_description (TEXT)
    ├── mood_tags (JSON array)
    └── reference_image_path (TEXT)
```

#### Color Psychology Rules (Enforced by Asset Agent)

```python
COLOR_PSYCHOLOGY_MAP = {
    "blue":    ["trust", "technology", "calm"],
    "green":   ["nature", "health", "growth", "finance"],
    "red":     ["urgency", "passion", "energy"],
    "purple":  ["luxury", "creativity", "wisdom"],
    "orange":  ["enthusiasm", "warmth", "CTA-optimized"],
    "yellow":  ["optimism", "attention", "caution"],
    "black":   ["sophistication", "luxury", "power"],
    "white":   ["clean", "minimal", "pure"],
}

CONTRAST_ENFORCEMENT = {
    "normal_text":    4.5,   # WCAG AA
    "large_text":     3.0,
    "ui_components":  3.0,
    "enhanced":       7.0,   # WCAG AAA target
}
```

#### Font Pairing Intelligence

```python
FONT_PAIRING_RULES = {
    "forbidden": [
        ("Comic Sans", ANY),
        ("Papyrus", ANY),
        (DECORATIVE, DECORATIVE),    # two display fonts together
        (MONO, MONO),                # two monospace together
    ],
    "preferred_combos": [
        (SERIF_DISPLAY, SANS_BODY),      # classic editorial
        (SANS_GEOMETRIC, HUMANIST_SANS), # modern clean
        (SLAB_SERIF, GROTESQUE),         # editorial tech
    ],
    "x_height_harmony": True,
    "max_font_files": 4,
    "variable_fonts_preferred": True,
}
```

#### A/B Variant Generation

Each daily run generates two variants (A + B) with the same concept brief but different layout interpretations. Variant B uses an alternative hero style, section order, or color temperature (warm/cool swap). Both are stored in the gallery. The admin can choose which to promote, or enable automatic A/B selection based on analytics score.


---

### 2.4 Complete Missing Skills List (120+ Skills)

#### Voice & Audio

| Skill ID | Description | Implementation Path |
|---|---|---|
| `voice_transcribe` | Whisper STT for voice commands | faster-whisper local server, WebSocket |
| `tts_speak` | Agent responses as audio | Coqui TTS / ElevenLabs API |
| `voice_command_parse` | Intent extraction from transcribed text | LLM post-processing of STT output |
| `audio_upload` | Accept audio file uploads for transcribe | Multipart upload endpoint |
| `voice_wake_word` | "Hey Dave" wake word detection | Porcupine / openWakeWord |

#### Image Generation

| Skill ID | Description | Implementation Path |
|---|---|---|
| `image_generate_flux` | Flux.1 image generation | ComfyUI API / Replicate |
| `image_generate_sdxl` | SDXL 1.0 image generation | local diffusers server |
| `image_generate_dalle` | DALL-E 3 via OpenAI API | LiteLLM image routing |
| `image_upscale` | 4x upscale via Real-ESRGAN | local GPU inference |
| `image_remove_bg` | Background removal | rembg library |
| `image_compress` | WebP/AVIF optimization | sharp / squoosh CLI |
| `image_crop_smart` | AI-guided focal point crop | saliency detection model |
| `image_colorize` | B&W to color | DeOldify model |
| `svg_generate` | AI-generated SVG icons/illustrations | Vectorizer AI / LLM SVG output |
| `og_image_generate` | Open Graph 1200x630 image auto-gen | Playwright headless renderer |

#### Web Intelligence

| Skill ID | Description | Implementation Path |
|---|---|---|
| `web_search` | DuckDuckGo / Serper.dev search | httpx + Serper API |
| `web_scrape` | Generic HTML scraper | Playwright + BeautifulSoup |
| `web_scraper_structured` | JSON extraction from pages | LLM + CSS selector guidance |
| `trend_scrape_dribbble` | Scrape Dribbble popular shots | Playwright headless |
| `trend_scrape_awwwards` | Scrape Awwwards nominees | Playwright headless |
| `url_screenshot` | Screenshot any URL | Playwright screenshot |
| `competitor_analyze` | Extract design system from competitor URL | VLM + CSS extractor |
| `seo_audit_url` | Lighthouse-based SEO audit | Lighthouse CI API |
| `pagespeed_check` | Google PageSpeed Insights | PageSpeed API |
| `broken_link_check` | Crawl and find 404s | linkchecker CLI |
| `ssl_check` | HTTPS/TLS validation | ssl Python module |
| `uptime_monitor` | HTTP uptime monitoring | httpx periodic ping |

#### Site Templates & Themes

| Skill ID | Description | Implementation Path |
|---|---|---|
| `template_apply` | Apply a full site template | git sparse-checkout + file copy |
| `theme_export` | Export current theme as reusable JSON | Extract design tokens to JSON |
| `theme_import` | Import theme JSON and apply | Reverse of export |
| `component_install` | Install a community component | Component marketplace API |
| `style_transfer` | Apply design style of one site to another | VLM analysis + LLM CSS rewrite |
| `dark_mode_generate` | Auto-generate dark mode variant | CSS custom property inversion |
| `animation_apply` | Apply Framer Motion animation preset | Template injection into JSX |
| `tailwind_config_gen` | Generate tailwind.config.js from seed | LLM + design token mapping |

#### Multi-Site Management

| Skill ID | Description | Implementation Path |
|---|---|---|
| `site_create` | Create new site with isolated git repo | mkdir + git init + nginx vhost |
| `site_clone` | Clone existing site as new project | git clone + new site record |
| `site_fork` | Fork from a timeline point | git worktree + new site |
| `site_delete` | Archive/delete site | nginx disable + git archive |
| `site_rename` | Rename site and update routing | nginx config update |
| `domain_assign` | Map custom domain to site | nginx server_name update |
| `subdomain_create` | Create subdomain for site | DNS API + nginx |
| `site_compare` | Side-by-side compare two sites | Dual iframe layout |

#### Analytics & Metrics

| Skill ID | Description | Implementation Path |
|---|---|---|
| `analytics_dashboard` | Real-time usage stats UI | Grafana embed / custom D3 |
| `visitor_heatmap` | Click/scroll heatmap | Hotjar API / self-hosted Matomo |
| `performance_metrics` | Core Web Vitals per page | web-vitals.js + telemetry endpoint |
| `ab_test_report` | A/B variant performance comparison | Stats engine + UI |
| `seo_rank_track` | Keyword ranking over time | SerpAPI integration |
| `conversion_track` | CTA click tracking | Custom event system |
| `error_rate_monitor` | JS error tracking | Sentry integration |

#### Collaboration

| Skill ID | Description | Implementation Path |
|---|---|---|
| `presence_indicator` | Show who is viewing/editing | WebSocket presence channel |
| `comment_thread` | Inline comments on UI elements | Annotation overlay system |
| `change_request` | Propose a change for review | Git branch + PR-like workflow |
| `share_preview_link` | Shareable read-only preview URL | Token-based auth for snapshot URLs |
| `co_edit_session` | Real-time collaborative editing | Yjs CRDT + WebSocket |
| `notification_send` | Notify team on events | WebSocket + email |
| `slack_send` | Post updates to Slack channel | Slack webhook integration |

#### Export & Deploy

| Skill ID | Description | Implementation Path |
|---|---|---|
| `vercel_deploy` | Deploy to Vercel | Vercel CLI / REST API |
| `netlify_deploy` | Deploy to Netlify | Netlify CLI / REST API |
| `github_pages_deploy` | Push to GitHub Pages branch | git push + gh-pages lib |
| `cloudflare_pages_deploy` | Deploy to Cloudflare Pages | wrangler CLI |
| `zip_export` | Export site as ZIP | Python zipfile from git tree |
| `docker_export` | Export as nginx Docker container | Dockerfile generator + build |
| `ftp_deploy` | FTP/SFTP upload | paramiko / ftplib |
| `archive_create` | Create tar.gz archive of site | tarfile Python module |

#### Database & CMS

| Skill ID | Description | Implementation Path |
|---|---|---|
| `database_query` | SQLite agent memory queries | SQLite3 + ORM layer |
| `cms_content_create` | Create CMS content entry | Headless CMS API (Directus) |
| `cms_content_update` | Update CMS entry | Directus REST API |
| `cms_schema_generate` | Generate CMS schema from site | LLM analysis + Directus schema |
| `content_migrate` | Migrate content between formats | Pandoc + custom converters |
| `database_backup` | Backup site database | sqlite3 .backup command |

#### E-commerce

| Skill ID | Description | Implementation Path |
|---|---|---|
| `stripe_product_create` | Create Stripe product + pricing | Stripe API |
| `stripe_checkout_embed` | Embed Stripe checkout in page | Stripe.js injection |
| `product_page_generate` | Generate product listing pages | Template + CMS integration |
| `cart_component_add` | Add shopping cart component | Snipcart / custom React cart |
| `inventory_track` | Basic inventory management | SQLite + admin UI |
| `order_form_generate` | Generate order form | Formspree / custom endpoint |

#### SEO Automation

| Skill ID | Description | Implementation Path |
|---|---|---|
| `sitemap_generate` | Auto-generate sitemap.xml | Crawl site structure |
| `robots_txt_generate` | Generate robots.txt | Template + config |
| `meta_tags_inject` | Inject SEO meta tags | HTML head manipulation |
| `og_tags_inject` | Open Graph tags injection | HTML head manipulation |
| `schema_org_inject` | JSON-LD structured data | LLM schema generation |
| `canonical_url_set` | Set canonical URLs | HTML head link injection |
| `image_alt_generate` | AI-generated alt text for images | VLM image captioning |
| `keyword_density_check` | Analyze keyword density | Text analysis |

#### Performance Optimization

| Skill ID | Description | Implementation Path |
|---|---|---|
| `image_lazy_load` | Add lazy loading attributes | HTML attribute injection |
| `css_purge` | Remove unused CSS (PurgeCSS) | PurgeCSS CLI |
| `js_minify` | Minify JavaScript | Terser CLI |
| `css_minify` | Minify CSS | csso CLI |
| `bundle_analyze` | Analyze JS bundle size | webpack-bundle-analyzer |
| `cdn_configure` | Configure CDN for assets | Cloudflare API |
| `preload_hints_inject` | Add `<link rel=preload>` hints | HTML head manipulation |
| `service_worker_generate` | Generate PWA service worker | Workbox template generator |

#### Accessibility Automation

| Skill ID | Description | Implementation Path |
|---|---|---|
| `axe_audit` | Run axe-core accessibility audit | axe CLI / Playwright integration |
| `aria_labels_add` | Add missing ARIA labels | LLM + DOM analysis |
| `focus_order_check` | Verify logical focus order | Playwright keyboard navigation |
| `color_contrast_audit` | Full contrast ratio audit | axe-core contrast checker |
| `screen_reader_test` | Simulate screen reader output | axe-core + nvda-like output |
| `skip_link_add` | Add skip navigation link | HTML injection |

#### Security Hardening

| Skill ID | Description | Implementation Path |
|---|---|---|
| `csp_header_generate` | Generate Content Security Policy | LLM + nginx config update |
| `cors_configure` | Configure CORS headers | nginx/FastAPI middleware |
| `headers_audit` | Audit HTTP security headers | SecurityHeaders.com API |
| `dependency_audit` | npm audit for vulnerabilities | npm audit JSON output |
| `rate_limit_configure` | Configure nginx rate limiting | nginx limit_req_zone config |
| `form_csrf_protect` | Add CSRF tokens to forms | HTML hidden field injection |

#### Monitoring & Alerting

| Skill ID | Description | Implementation Path |
|---|---|---|
| `uptime_alert` | Alert when site goes down | httpx ping + webhook |
| `performance_alert` | Alert on Core Web Vitals regression | Lighthouse CI threshold |
| `error_alert` | Alert on JS error spike | Sentry alert rules |
| `ssl_expiry_alert` | Alert before SSL expiry | cert expiry cron check |
| `disk_usage_alert` | Alert on disk space | psutil monitoring |
| `cron_add` | Schedule recurring tasks | APScheduler / Celery Beat |
| `log_tail` | Stream live server logs | WebSocket log tail endpoint |

---

### 2.5 SOTA 2026 Features Not Yet Present

#### Multi-Modal Input

| Feature | Description | Status |
|---|---|---|
| Image → Website Design | Upload a screenshot/mockup, AI generates matching website | Missing |
| Sketch → Site | Hand-drawn wireframe photo → generated site | Missing |
| PDF → Site | Convert PDF brochure to web equivalent | Missing |
| Screen recording → Recreation | Record a site interaction, AI recreates it | Missing |
| Voice → Full Site | Describe site verbally, agents build it while you speak | Missing |
| Video brief → Site | Upload a video mood reel, AI extracts design direction | Missing |

#### AI Intelligence Features

| Feature | Description | Status |
|---|---|---|
| Competitor Analysis | Give URL → AI extracts and optionally replicates design language | Missing |
| Natural Language CSS | "Make the hero more dramatic" → precise CSS changes | Missing |
| AI Design Critique | Ongoing automated scoring: aesthetics, UX, performance, accessibility | Missing |
| Design Memory | AI remembers your preferences across sessions, improves personalization | Missing |
| Brand Voice Consistency | LLM enforces consistent copy tone across all pages | Missing |
| Auto-i18n | Detect primary language, auto-translate + RTL-adapt entire site | Missing |
| Auto-GDPR | Detect data collection, auto-add compliance pages + cookie consent | Missing |

#### Component & Asset Intelligence

| Feature | Description | Status |
|---|---|---|
| Component Marketplace | Share/install community components (npm-like for site blocks) | Missing |
| Video Background Integration | Search Pexels/Pixabay, auto-embed optimized video backgrounds | Missing |
| Lottie Animation Integration | Search LottieFiles, inject JSON animations | Missing |
| Particle.js Scene Generation | AI describes, generates particle.js config for hero backgrounds | Missing |
| Three.js Scene Generation | LLM generates Three.js scene code from description | Missing |
| WebGL Shader Generation | GLSL shader generation from visual description | Missing |
| SVG Animation (GSAP) | Generate GSAP-animated SVG illustrations | Missing |
| Icon Pack Intelligence | Auto-select consistent icon set based on site personality | Missing |

#### Progressive & Platform Features

| Feature | Description | Status |
|---|---|---|
| PWA Auto-Generation | Auto-add manifest.json, service worker, offline page | Missing |
| Dark/Light/System Theme | Generate all three theme variants automatically from one seed | Missing |
| Cookie Consent Automation | Detect cookies used, generate compliant consent banner | Missing |
| Schema.org Injection | Auto-inject appropriate JSON-LD based on page content type | Missing |
| Open Graph Image Auto-Gen | Playwright-rendered branded OG images per page | Missing |
| RSS Feed Generation | Auto-generate RSS/Atom feed for blog pages | Missing |
| AMP Page Generation | Accelerated Mobile Pages variant for content pages | Missing |
| Email Template Export | Export site styling as email-compatible HTML template | Missing |

#### Developer Experience Features

| Feature | Description | Status |
|---|---|---|
| Real-Time Design Preview | Hot reload preview as agent makes changes (SSE/WebSocket) | Missing |
| Component Storybook Export | Export generated components to Storybook format | Missing |
| Design Token Export (Figma) | Export design tokens in Figma-compatible format | Missing |
| GitHub Sync | Two-way sync with GitHub repository | Missing |
| VS Code Extension | Edit in VS Code with AI agent still running | Missing |
| CI/CD Pipeline Generation | Generate GitHub Actions workflow for the site | Missing |

---

### 2.6 Feature Ideas Around the Timeline Concept (25 Ideas)

#### Video & Presentation

1. **Site Evolution Export (Time-Lapse Video)** — Stitch timeline thumbnails into an MP4 time-lapse showing the site evolving from first commit to now. Configurable FPS, frame hold duration per keyframe, background music selection. Ideal for portfolio/case study use.

2. **Animated Changelog Reel** — Auto-generated 60-second narrated video where an AI voice (TTS) reads out the AI-generated changelog while the visual shows the site at each stage.

3. **"Speed Build" Recording** — Capture a live agent build session as a real-time video recording, compress to 2–3 minutes with speed-up, exportable for social media.

#### Sharing & Social

4. **Public Timeline Sharing** — Shareable link (`daveai.tech/timeline/share/<token>`) that lets anyone view the site's history in a read-only TimeWarp panel without logging in.

5. **Embed Timeline Widget** — `<iframe>` embeddable timeline widget for blog posts or portfolios — shows your site's evolution embedded on another page.

6. **Timeline Portfolio Mode** — A curated presentation of selected keyframes, formatted as a portfolio case study page, auto-generated by LLM from commit history.

#### Annotation & Documentation

7. **Timeline Annotations** — Add text/emoji/tag notes to any commit keyframe. Appears as a tooltip in the timeline scrubber. Supports markdown in the note body.

8. **AI-Generated Changelog** — LLM reads the git diff between two keyframes and generates human-readable release notes: "Added dark hero section, improved mobile navigation, switched to Inter font."

9. **Design Decision Log** — For each daily generated site, the AI documents why it made each design choice (color, layout, font). Stored alongside the keyframe, browsable in a "behind the scenes" panel.

10. **Milestone Tagging** — Tag specific keyframes as milestones (v1.0, "First Client Review", "Rebrand 2026"). Milestones appear as gold markers on the timeline and can be bookmarked directly.

#### Comparison & Analysis

11. **Design Comparison Slider** — Side-by-side before/after split view between any two keyframes, with a draggable center divider. Works at the full page level or a specific component crop.

12. **Metric Overlay on Timeline** — If analytics is integrated, overlay a line graph of visitor count, bounce rate, or performance score directly on the timeline. See how design changes correlate with metric changes.

13. **Multi-Site Timeline Comparison** — Display two different sites' timelines on the same canvas, synchronized by date. Compare how two brands' sites evolved in parallel.

14. **Diff Heatmap** — Color-code sections of the page based on how much they have changed over time. Sections that never change appear cool blue; frequently modified areas appear hot red.

#### Intelligence & Automation

15. **AI Timeline Summary** — LLM analyses the full timeline and generates a narrative summary: "Over 45 days, 8 daily generations were run. The dominant themes were minimalism and blue palettes. The biggest design shift happened on Feb 10 when dark mode was introduced."

16. **Scheduled Rollback Guard** — Configure automatic revert if performance score drops below threshold within N hours of a new commit.

17. **Trend Correlation Analysis** — Compare your timeline's design style at each keyframe against scraped design trends from the same date.

18. **Clone from Past + Evolve** — Select a keyframe, clone it as a new site, then let the daily engine continue evolving it from that historical starting point — creating a parallel design universe.

#### Search & Discovery

19. **Timeline Content Search** — Full-text search across all git diffs in the timeline. "Find when the word 'contact' was first added to the hero section." Returns keyframe + line diff.

20. **Visual Similarity Search** — Upload an image or design reference; the system scans all timeline thumbnails for the visually closest match using image embedding similarity (CLIP-based).

21. **"Best Of" Curation Panel** — Auto-surface the highest-rated / best QA-scored / most-viewed keyframes in a curated "greatest hits" gallery. One-click restore or fork from any of them.

#### Forking & Branching

22. **Style Fork** — Take any keyframe and say "evolve this in a more playful direction" — creates a new agent branch starting from that exact point, with a new style seed applied.

23. **Merge Request for Agents** — Propose an agent-generated feature branch back to main via a visual "merge request" UI showing the diff of what will change if merged.

24. **A/B Timeline Tracks** — Run two daily generation tracks simultaneously (Track A: minimalist, Track B: bold/expressive). Both appear as parallel tracks in the timeline. View metrics side by side.

25. **Timeline as Onboarding** — When a new team member joins, walk them through the site's full timeline as an interactive tour with annotations and AI narration.

---

### 2.7 Feature Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---|---|---|---|
| TimeWarp UI (basic scrubber) | High | High | P1 |
| Git keyframe parser | High | Low | P1 |
| Thumbnail generator | High | Medium | P1 |
| Daily generation scheduler | High | Medium | P1 |
| Style seed system | High | Low | P1 |
| Multi-page generation | High | Medium | P1 |
| Snapshot cache + iframe preview | High | Medium | P1 |
| Gallery UI | Medium | Low | P2 |
| Ghost mode overlay | Medium | Medium | P2 |
| Branch visualization | Medium | High | P2 |
| web_search skill | High | Low | P2 |
| image_generate skill (Flux) | High | Medium | P2 |
| Trend scraper | Medium | Medium | P2 |
| Voice input (Whisper) | Medium | Medium | P2 |
| ZIP export | Medium | Low | P2 |
| Vercel/Netlify deploy | Medium | Low | P2 |
| Timeline video export | Low | High | P3 |
| Public timeline sharing | Low | Medium | P3 |
| Multi-site comparison | Low | High | P3 |
| Component marketplace | Low | High | P3 |
| Real-time collaboration | Low | High | P3 |


---

## Part 3: Milestone Roadmap, Architecture & Implementation

---

### 3.1 Full System Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET / CLIENTS                                    │
└──────────────────────────┬──────────────────────────────────────────────────────────────┘
                           │ HTTPS :443
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            CLOUDFLARE (DNS + DDoS + CDN)                                │
│                    Tunnel: cloudflared → Nginx on VPS                                   │
└──────────────────────────┬──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          VPS: NGINX (reverse proxy + static)                            │
│  /            → Next.js :3001      /api/         → FastAPI :8888                        │
│  /stream      → FastAPI :8888 SSE  /timewarp/    → FastAPI :8888                        │
│  /sites/live  → static HTML export /__admin/     → Next.js admin panel                  │
└───────────┬──────────────────────────────────────────┬──────────────────────────────────┘
            │                                          │
            ▼                                          ▼
┌───────────────────────────┐              ┌───────────────────────────────────────────────┐
│     NEXT.JS UI :3001      │              │         FASTAPI BRAIN v4 :8888                │
│                           │              │                                               │
│  ┌────────────────────┐   │  WebSocket   │  ┌─────────────────────────────────────────┐ │
│  │  TimeWarp Timeline  │◄──┼─────────────┤  │           AGENT PIPELINE                │ │
│  │  (D3 + filmstrip)  │   │   /stream    │  │                                         │ │
│  └────────────────────┘   │     SSE      │  │  ┌──────────┐  ┌──────────────────────┐ │ │
│  ┌────────────────────┐   │              │  │  │ Intent   │  │  Web Design Agent    │ │ │
│  │  Site Gallery      │   │              │  │  │ Analyser │→ │  (layout/style gen)  │ │ │
│  └────────────────────┘   │              │  │  └──────────┘  └──────────────────────┘ │ │
│  ┌────────────────────┐   │              │  │       │                                  │ │
│  │  Voice Input/TTS   │   │              │  │  ┌────▼─────┐  ┌──────────────────────┐ │ │
│  └────────────────────┘   │              │  │  │ Code     │  │  Content Agent       │ │ │
│  ┌────────────────────┐   │              │  │  │ Generator│→ │  (copy, SEO, CMS)    │ │ │
│  │  Admin Dashboard   │   │              │  │  └──────────┘  └──────────────────────┘ │ │
│  └────────────────────┘   │              │  │       │                                  │ │
│  ┌────────────────────┐   │              │  │  ┌────▼─────┐  ┌──────────────────────┐ │ │
│  │  Page Editor WYSIWYG│  │              │  │  │ Quality  │  │  Creativity Agent    │ │ │
│  └────────────────────┘   │              │  │  │ Auditor  │← │  (trends, mood board)│ │ │
└───────────────────────────┘              │  │  └──────────┘  └──────────────────────┘ │ │
                                           │  └─────────────────────────────────────────┘ │
                                           │                      │                        │
                                           │  ┌───────────────────▼────────────────────┐  │
                                           │  │         ZEROCLAW DAEMON :3000           │  │
                                           │  │  (Rust agent runtime)                   │  │
                                           │  │                                          │  │
                                           │  │  ┌──────────────────────────────────┐   │  │
                                           │  │  │         SKILLFORGE               │   │  │
                                           │  │  │  Auto-discover Python skills     │   │  │
                                           │  │  │  agent_skills_p1/ (25 skills)    │   │  │
                                           │  │  │  agent_skills_p2/ (25+ skills)   │   │  │
                                           │  │  └──────────────────────────────────┘   │  │
                                           │  │  TOOLS: Shell · File · Git · Browser    │  │
                                           │  │  WebSearch · Memory · RAG · Delegate    │  │
                                           │  │  Telegram · Discord · Email · Slack     │  │
                                           │  │  CRON: Daily site gen (02:00)           │  │
                                           │  │         Nightly backup (03:00)          │  │
                                           │  │         Trend scraping (06:00)          │  │
                                           │  └──────────────────────────────────────────┘  │
                                           └────────────────────────────────────────────────┘
                                                            │
                      ┌─────────────────────────────────────┼───────────────────────────────┐
                      │                                      │                               │
                      ▼                                      ▼                               ▼
          ┌───────────────────────┐           ┌──────────────────────┐       ┌──────────────────────┐
          │   LITELLM ROUTER      │           │   DATA LAYER (VPS)   │       │  LOCAL GPU FARM      │
          │   :4000               │           │                      │       │  (Tailscale LAN)     │
          │  OpenRouter:          │           │  SQLite: daveai.db   │       │                      │
          │   Gemini 2.5 Pro      │           │   - pages            │       │  PC1 (RTX 3090 Ti):  │
          │   Kimi K2             │           │   - analytics        │       │   GLM 4.7 Flash      │
          │   DeepSeek-R1         │           │   - timewarp_frames  │       │   LM Studio :1234    │
          │  Local LM Studio      │           │   - style_seeds      │       │                      │
          │  (PC1 via Tailscale)  │           │   - generated_sites  │       │  PC2 (AMD 7800 XT):  │
          │  Fallback:            │           │   - cron_jobs        │       │   DeepSeek-V3        │
          │  Anthropic Claude     │           │   - agent_log        │       │   Whisper STT :9000  │
          └───────────────────────┘           │   - admin_table      │       │   LM Studio :1235    │
                                              │  Git Repo:           │       │                      │
                                              │   /var/daveai/sites/ │       │  PC3 (GPU):          │
                                              │  Screenshots:        │       │   Flux SDXL          │
                                              │   /var/daveai/thumbs/│       │   (image gen)        │
                                              └──────────────────────┘       └──────────────────────┘
```

---

### 3.2 TimeWarp Engine Architecture

#### SQLite Schema: timewarp_frames

```sql
CREATE TABLE timewarp_frames (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash     TEXT NOT NULL UNIQUE,
    parent_hash     TEXT,                          -- for branch visualization
    branch          TEXT NOT NULL DEFAULT 'main',
    timestamp       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thumbnail_path  TEXT,                          -- /var/daveai/thumbs/{hash}_composite.jpg
    title           TEXT NOT NULL,                 -- "Daily Site #47: Aurora Bakery"
    tags            TEXT,                          -- JSON array: ["auto","bakery","minimalist"]
    site_name       TEXT,
    agent_summary   TEXT,                          -- LLM-generated 1-paragraph description
    page_count      INTEGER DEFAULT 1,
    pages_json      TEXT,                          -- JSON: list of {page_slug, thumbnail_path}
    style_seed_id   INTEGER REFERENCES style_seeds(id),
    is_live         INTEGER DEFAULT 0,             -- 1 = currently promoted to live
    export_zip_path TEXT,
    created_by      TEXT DEFAULT 'agent',          -- 'agent' | 'user' | 'cron'
    restored_from   TEXT                           -- hash if this was a restore
);

CREATE INDEX idx_twf_timestamp ON timewarp_frames(timestamp DESC);
CREATE INDEX idx_twf_branch ON timewarp_frames(branch);
CREATE INDEX idx_twf_is_live ON timewarp_frames(is_live);
```

#### Background Job: timewarp_indexer.py

```python
# zeroclaw/skills/timewarp_indexer.py
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
import aiosqlite

SITE_URL  = "http://localhost:3000"
THUMB_DIR = Path("/var/daveai/thumbs")
DB_PATH   = "/var/daveai/daveai.db"
PAGE_ROUTES = ["/", "/about", "/services", "/contact", "/blog"]

async def index_commit(commit_hash: str, title: str, branch: str = "main",
                       created_by: str = "agent", style_seed_id: int = None):
    thumbs    = await screenshot_site(commit_hash)
    composite = make_composite_thumbnail(thumbs, commit_hash)
    summary   = await generate_summary(commit_hash)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR IGNORE INTO timewarp_frames
            (commit_hash, branch, title, thumbnail_path, pages_json,
             page_count, agent_summary, style_seed_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (commit_hash, branch, title, str(composite),
              json.dumps(thumbs), len(thumbs), summary,
              style_seed_id, created_by))
        await db.commit()

async def screenshot_site(commit_hash: str) -> list[dict]:
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        for route in PAGE_ROUTES:
            await page.goto(f"{SITE_URL}{route}", wait_until="networkidle")
            out_path = THUMB_DIR / f"{commit_hash}{route.replace('/', '_')}.jpg"
            await page.screenshot(path=str(out_path), type="jpeg", quality=80)
            results.append({"slug": route, "thumbnail_path": str(out_path)})
        await browser.close()
    return results
```

#### Ghost Mode CSS

```css
/* TimeWarpGhost.module.css */
.ghost-container { position: relative; width: 100%; height: 600px; }
.ghost-layer-old {
    position: absolute; inset: 0;
    opacity: calc(1 - var(--diff-slider));
    filter: sepia(0.3);
}
.ghost-layer-new { position: absolute; inset: 0; opacity: var(--diff-slider); }
.diff-divider {
    position: absolute; top: 0; bottom: 0;
    left: calc(var(--diff-slider) * 100%);
    width: 2px; background: #f59e0b; cursor: ew-resize;
}
```

---

### 3.3 Daily Site Generation Engine Architecture

#### Cron Job Specification (ZeroClaw Cron Tool)

```toml
# zeroclaw/config/cron_jobs.toml

[[jobs]]
name        = "daily_site_generation"
schedule    = "0 2 * * *"          # 02:00 every day
skill       = "daily_site_gen"
args        = {}
timeout_s   = 1800                  # 30 min max
on_failure  = "notify_telegram"

[[jobs]]
name        = "nightly_backup"
schedule    = "0 3 * * *"
skill       = "backup_all"
args        = {dest = "s3://daveai-backups/"}
timeout_s   = 600

[[jobs]]
name        = "trend_scraper"
schedule    = "0 6 * * *"
skill       = "scrape_design_trends"
args        = {sources = ["dribbble", "awwwards", "behance"]}
timeout_s   = 300

[[jobs]]
name        = "analytics_rollup"
schedule    = "0 0 * * *"
skill       = "analytics_daily_rollup"
args        = {}
timeout_s   = 120
```

#### StyleSeed Generator LLM Prompt

```python
SEED_PROMPT = """
Generate a StyleSeed for a website. It must be completely different from the last 7 seeds.

Last 7 seeds: {recent_seeds_summary}

Produce a JSON object with:
- palette: array of 5 hex colors (primary, secondary, accent, background, text)
  - Ensure WCAG AA contrast between text and background
- fonts: {"heading": <Google Font name>, "body": <Google Font name>}
- layout: one of [hero-left, hero-center, hero-right, split-screen, magazine,
                  card-grid, full-bleed, asymmetric]
- theme: a specific business niche (e.g. "artisan coffee roasters", "indie game studio")
- mood: one of [energetic, calm, playful, professional, dark, minimal, luxurious, earthy]
- industry: broad category
- border_radius: one of [0px, 4px, 8px, 16px, 24px, 9999px]
- spacing: one of [compact, balanced, airy]
- animation: one of [none, subtle, dynamic]

Return only valid JSON. No commentary.
"""
```

#### Full Daily Generation Pipeline

```
02:00 Cron fires daily_site_generation skill
  │
  ├─ 1. Load last 7 style_seeds from DB (prevent repetition)
  ├─ 2. LLM generates new StyleSeed (Gemini 2.5 Pro / Kimi K2)
  ├─ 3. Save StyleSeed to DB
  ├─ 4. LLM generates SiteSpec from StyleSeed
  ├─ 5. Parallel page generation (5x concurrent LLM calls)
  │      Each page → full Next.js JSX component
  ├─ 6. Assemble shared Navbar + Footer from SiteSpec nav_links
  ├─ 7. Write all files to /var/daveai/sites/generated/{date}/
  ├─ 8. git add + git commit ("Auto: {site_name} [{date}]")
  ├─ 9. timewarp_indexer.index_commit(hash, title, created_by="cron")
  │      └─ Playwright screenshots all 5 pages
  │      └─ Composite thumbnail
  │      └─ Write timewarp_frames row
  ├─ 10. Save generated_sites row with site_name, spec, seed_id, frame_id
  ├─ 11. Update gallery DB
  └─ 12. Notify via Telegram: "Daily site generated: {site_name} 🎨"
```

#### Promotion Flow: "Make Live"

```
Admin clicks [Make Live] on timeline frame
  │
  POST /timewarp/promote/:hash
  │
  ├─ git checkout :hash -- sites/
  ├─ cp -r sites/generated/{hash}/ sites/live/
  ├─ nginx reload (graceful, no downtime)
  ├─ UPDATE timewarp_frames SET is_live=0 WHERE 1=1
  ├─ UPDATE timewarp_frames SET is_live=1 WHERE commit_hash=:hash
  └─ New git commit: "Promote: {site_name} to live"
     └─ timewarp_indexer indexes promotion commit
```

---

### 3.4 Complete Milestone Plan

#### Milestone 0: Fix Critical Bugs (Week 1)

| # | File | Change | Expected Outcome |
|---|---|---|---|
| 0.1 | `brain_v4_part1.py` + `brain_v4_part2.py` | Merge into single `brain.py`, replacing v3. Update all imports. | Single deployable brain_v4 |
| 0.2 | `docker-compose.yml` | Set `NEXT_PUBLIC_AGENT_HTTP=https://daveai.tech/api` in nextjs service env | UI can reach API |
| 0.3 | `docker-compose.yml` | Add `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `LITELLM_URL` to brain service env | LLM calls succeed |
| 0.4 | `brain.py` | Import and register ALL_SKILLS dict from both skill files | All 50+ skills available to brain |
| 0.5 | `zeroclaw/config.toml` | Set correct tool endpoint URLs, verify with `curl localhost:3000/tools/list` | ZeroClaw tools callable |
| 0.6 | `brain.py` `/stream` | Add `Content-Type: text/event-stream` header, test with `curl -N /stream` | SSE works end-to-end |
| 0.7 | `litellm/config.yaml` | Add model_list entries for OpenRouter models, verify with `/health` | LiteLLM routes correctly |
| 0.8 | `nginx.conf` | Add `proxy_buffering off` for `/stream` location block | SSE not buffered by Nginx |

#### Milestone 1: Full v4 Deployment (Week 2)

- All REST endpoints return correct HTTP status codes (tested with Postman collection)
- 4-agent pipeline SSE streaming visible in browser DevTools EventSource
- Admin JWT auth working: `POST /auth/login` → token → `Authorization: Bearer` header
- Pages CRUD: create/read/update/delete pages with slug routing
- Playwright E2E test: `npx playwright test tests/smoke.spec.ts` passes

#### Milestone 2: TimeWarp Timeline (Week 3-4)

- `timewarp_frames` SQLite table created and migrated
- `timewarp_indexer` background job triggered after every git commit
- All `/timewarp/*` API endpoints live and documented in OpenAPI schema
- Timeline UI component rendered in Next.js with filmstrip + scrubber
- Restore-from-timeline: clicking Restore on any frame re-deploys that version
- Diff overlay: selecting two frames shows ghost blend with slider

#### Milestone 3: Daily Site Generation (Week 5-6)

- StyleSeed generator produces valid, diverse seeds (tested: 30-day simulation)
- SiteSpec generator produces coherent 5-page briefs
- Multi-page generator writes valid JSX for all 5 page types
- ZeroClaw cron fires at 02:00 and completes within 30 minutes
- Admin panel shows cron status, last run time, next run time
- Gallery view shows all generated sites with thumbnails, searchable by theme/date

#### Milestone 4: Voice and Media (Week 7-8)

- Web Speech API voice input activates on mic button; transcript appears in chat
- Whisper STT server on PC2 accessible via Tailscale at `100.64.0.11:9000`
- TTS responses played in browser via Web Audio API (Coqui TTS endpoint)
- Image generation: `POST /generate/image` calls Flux API on PC3 via Tailscale
- Open Graph images auto-generated for every new site (1200x630 branded image)

#### Milestone 5: AI Creativity and SOTA (Week 9-10)

- Trend scraper pulls top 20 designs daily from Dribbble API + Awwwards scrape
- Design critique agent scores live site on: typography, color harmony, whitespace, conversion
- Competitor analysis: `POST /analyze/url` → style extraction → seed generation
- Component marketplace: 50+ pre-built section templates selectable in editor
- PWA manifest + service worker auto-generated for every site

#### Milestone 6: Production Hardening (Week 11-12)

- ZeroClaw runs inside bubblewrap sandbox (landlock + seccomp profile)
- OpenRouter integrated in LiteLLM with per-model cost tracking
- Prometheus metrics on FastAPI (`/metrics`) scraped by Prometheus on VPS
- Grafana dashboard: requests/s, LLM cost/day, agent queue depth, SSE clients
- Rate limiting: 100 req/min per IP on `/stream`, 10/min on `/generate/*`
- Nightly `tar.gz` of `/var/daveai/` piped to `rclone copy` → B2/S3
- Cost dashboard in admin panel: today's spend, 30-day trend, per-model breakdown


---

## 3.5 ZeroClaw SkillForge Integration Plan

### Skill Registration Format (TOML Manifest)

```toml
# zeroclaw/skills/manifest.toml
# Auto-discovered on ZeroClaw startup — add new skills here

[[skills]]
name        = "generate_page"
module      = "agent_skills_p1.page_generator"
function    = "generate_page"
description = "Generate a full Next.js page component from a SiteSpec and StyleSeed"
timeout_s   = 120
tags        = ["generation", "code", "pages"]

[[skills]]
name        = "timewarp_snapshot"
module      = "agent_skills_p2.timewarp"
function    = "take_snapshot"
description = "Commit current site state to TimeWarp git history + capture thumbnails"
timeout_s   = 60
tags        = ["timewarp", "git", "snapshot"]

[[skills]]
name        = "daily_site_gen"
module      = "agent_skills_p2.daily_generator"
function    = "run_daily_generation"
description = "Autonomous overnight site generation with random StyleSeed"
timeout_s   = 1800
tags        = ["generation", "cron", "autonomous"]

[[skills]]
name        = "style_seed_create"
module      = "agent_skills_p1.style_engine"
function    = "create_style_seed"
description = "Generate a randomized StyleSeed (palette, fonts, layout, mood)"
timeout_s   = 30
tags        = ["style", "creativity", "generation"]

[[skills]]
name        = "seo_audit"
module      = "agent_skills_p3.seo"
function    = "run_seo_audit"
description = "Lighthouse SEO audit and auto-fix recommendations"
timeout_s   = 180
tags        = ["seo", "audit", "quality"]

[[skills]]
name        = "accessibility_check"
module      = "agent_skills_p3.a11y"
function    = "run_a11y_check"
description = "WCAG AA accessibility audit with auto-fix capability"
timeout_s   = 120
tags        = ["accessibility", "wcag", "quality"]

[[skills]]
name        = "performance_optimize"
module      = "agent_skills_p3.performance"
function    = "optimize_build"
description = "Image compression, code splitting, lazy loading optimization"
timeout_s   = 300
tags        = ["performance", "optimization", "build"]

[[skills]]
name        = "component_extract"
module      = "agent_skills_p1.component_library"
function    = "extract_reusable_component"
description = "Extract page section into reusable React component library"
timeout_s   = 90
tags        = ["components", "library", "refactor"]

[[skills]]
name        = "ab_test_setup"
module      = "agent_skills_p3.ab_testing"
function    = "setup_ab_variant"
description = "Create A/B test variant of current page with tracking"
timeout_s   = 120
tags        = ["ab-test", "analytics", "conversion"]

[[skills]]
name        = "email_notify"
module      = "agent_skills_p2.notifications"
function    = "send_notification"
description = "Send email/webhook notification for agent events"
timeout_s   = 30
tags        = ["notifications", "email", "webhook"]
```

### ZeroClaw Auto-Discovery Configuration

```toml
# zeroclaw/config.toml (skills section)
[skills]
manifest_path    = "./skills/manifest.toml"
auto_reload      = true           # Hot-reload on manifest change
discovery_watch  = true           # Watch skills/ dir for new .toml files
skill_timeout_s  = 300            # Global default timeout
parallel_limit   = 4              # Max concurrent skill executions
retry_attempts   = 3
retry_delay_ms   = 1000

[skills.sandboxing]
enabled          = true
allowed_paths    = ["/app/output", "/app/cache", "/tmp"]
network_allowed  = true
memory_limit_mb  = 512
```

### ZeroClaw Memory Integration

```python
# How agent_brain registers skills with ZeroClaw memory
import httpx

async def register_skill_result(skill_name: str, result: dict, site_id: str):
    """Store skill execution result in ZeroClaw's memory channel."""
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://zeroclaw:3000/memory/store",
            json={
                "channel":    f"skill.{skill_name}",
                "key":        f"site_{site_id}_{skill_name}",
                "value":      result,
                "ttl_hours":  72,
                "tags":       [skill_name, site_id, "skill_result"]
            }
        )

async def recall_skill_context(skill_name: str, site_id: str) -> dict:
    """Retrieve previous skill results for context continuity."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "http://zeroclaw:3000/memory/recall",
            params={"channel": f"skill.{skill_name}", "key": f"site_{site_id}_*"}
        )
        return resp.json()
```

---

## 3.6 LiteLLM + OpenRouter Configuration

### Full `litellm/config.yaml`

```yaml
# litellm/config.yaml — Complete production configuration
# Restart LiteLLM after any changes: docker compose restart litellm

model_list:

  # ── CLOUD TIER: OpenRouter heavy reasoner ──────────────────────────────
  - model_name: heavy-reasoner
    litellm_params:
      model:    openrouter/google/gemini-2.5-pro
      api_key:  os.environ/OPENROUTER_API_KEY
      api_base: https://openrouter.ai/api/v1
      timeout:  120
    model_info:
      max_tokens:    65536
      input_cost:    0.0000035   # per token
      output_cost:   0.0000105
      mode:          chat

  # ── CLOUD TIER: Creative / Long context (Kimi K2) ─────────────────────
  - model_name: creative
    litellm_params:
      model:    openrouter/moonshotai/kimi-k2
      api_key:  os.environ/OPENROUTER_API_KEY
      api_base: https://openrouter.ai/api/v1
      timeout:  90
    model_info:
      max_tokens:    131072
      input_cost:    0.0000015
      output_cost:   0.0000045
      mode:          chat

  # ── CLOUD TIER: Heavy coder (DeepSeek R1) ─────────────────────────────
  - model_name: heavy-coder
    litellm_params:
      model:    openrouter/deepseek/deepseek-r1
      api_key:  os.environ/OPENROUTER_API_KEY
      api_base: https://openrouter.ai/api/v1
      timeout:  120
    model_info:
      max_tokens:    32768
      input_cost:    0.0000008
      output_cost:   0.0000024
      mode:          chat

  # ── LOCAL TIER: PC1 — RTX 3090 Ti (LM Studio) ─────────────────────────
  - model_name: local-fast
    litellm_params:
      model:    openai/local-model
      api_base: http://100.64.0.10:1234/v1
      api_key:  lm-studio
      timeout:  60
    model_info:
      max_tokens: 8192
      mode:       chat

  # ── LOCAL TIER: PC2 — AMD 7800 XT (LM Studio) ─────────────────────────
  - model_name: local-creative
    litellm_params:
      model:    openai/local-creative
      api_base: http://100.64.0.11:1235/v1
      api_key:  lm-studio
      timeout:  60
    model_info:
      max_tokens: 8192
      mode:       chat

  # ── FALLBACK TIER: Anthropic Claude ───────────────────────────────────
  - model_name: fallback-claude
    litellm_params:
      model:   claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY
      timeout: 90
    model_info:
      max_tokens: 8096
      mode:       chat

# ── Router Configuration ────────────────────────────────────────────────
router_settings:
  routing_strategy: latency-based-routing
  num_retries:      3
  retry_after:      5
  timeout:          120
  allowed_fails:    3
  cooldown_time:    60

  fallbacks:
    - heavy-reasoner: ["heavy-coder", "fallback-claude"]
    - creative:       ["heavy-reasoner", "local-creative"]
    - heavy-coder:    ["heavy-reasoner", "fallback-claude"]
    - local-fast:     ["heavy-coder", "heavy-reasoner"]
    - local-creative: ["creative", "heavy-reasoner"]

  context_window_fallbacks:
    - heavy-reasoner: ["creative"]   # Kimi K2 has 131k context
    - heavy-coder:    ["creative"]

# ── General Settings ────────────────────────────────────────────────────
litellm_settings:
  drop_params:     true
  set_verbose:     false
  json_logs:       true
  max_budget:      10.00           # USD daily spend cap
  budget_duration: 1d

  # Observability via Langfuse (optional)
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]
  langfuse_public_key:  os.environ/LANGFUSE_PUBLIC_KEY
  langfuse_secret_key:  os.environ/LANGFUSE_SECRET_KEY

# ── Server Settings ─────────────────────────────────────────────────────
general_settings:
  master_key:    os.environ/LITELLM_MASTER_KEY
  database_url:  os.environ/DATABASE_URL
  store_model_in_db: false
  health_check_interval: 30
```

### Model Selection Strategy

| Task | Primary Model | Fallback | Reason |
|------|--------------|----------|--------|
| Site architecture design | `heavy-reasoner` (Gemini 2.5 Pro) | `heavy-coder` | Multi-step reasoning |
| React/Next.js code gen | `heavy-coder` (DeepSeek R1) | `heavy-reasoner` | Code-specialized |
| Creative copywriting | `creative` (Kimi K2) | `heavy-reasoner` | Long context + creativity |
| CSS / style generation | `local-fast` (RTX 3090 Ti) | `heavy-coder` | Fast, deterministic |
| QA / review pass | `heavy-reasoner` | `fallback-claude` | Reasoning quality |
| Daily autonomous gen | `creative` → `heavy-coder` | `heavy-reasoner` | Parallelized pipeline |
| SEO optimization | `heavy-reasoner` | `fallback-claude` | Knowledge-intensive |
| A11y fixes | `local-fast` | `heavy-coder` | Repetitive, fast |

---

## 3.7 Admin Dashboard Spec

### ASCII Layout Mockup

```
╔══════════════════════════════════════════════════════════════════════════╗
║  🤖 DaveAI Admin Dashboard                          [Logout] [v4.0.0]   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  [Overview] [Generation] [TimeWarp] [Agents] [Models] [Settings] [Logs] ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ┌─── System Status ──────────────────────────────────────────────────┐  ║
║  │  ZeroClaw  ●ONLINE    Brain v4  ●ONLINE    LiteLLM  ●ONLINE       │  ║
║  │  Next.js   ●ONLINE    SQLite    ●ONLINE    Tailscale ●ONLINE       │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─── Quick Stats ────────────────────────────────────────────────────┐  ║
║  │  Sites Generated Today: 3    Total Sites: 247    Pages: 1,203      │  ║
║  │  Active Agents: 2/4          Queue Depth: 0      LLM Calls: 89     │  ║
║  │  TimeWarp Frames: 847        Last Snapshot: 14 min ago             │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─── Generation Schedule ────────────────────────────────────────────┐  ║
║  │  Auto-generation:  [●] ENABLED                                     │  ║
║  │  Frequency:        [Daily ▾]  Time: [02:00 ▾]  Timezone: [UTC ▾]  │  ║
║  │  Multi-page count: [3 ▾]      Style: [Random ▾]                    │  ║
║  │  Industry focus:   [Auto-detect ▾]                                 │  ║
║  │  Next run:         2026-02-20 02:00 UTC  [Run Now]                 │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─── TimeWarp Controls ──────────────────────────────────────────────┐  ║
║  │  Auto-snapshot:  [●] ON   Frequency: [On generation ▾]            │  ║
║  │  Max frames:     [500 ▾]  Retention: [90 days ▾]                  │  ║
║  │  Ghost mode:     [●] ENABLED  Diff threshold: [15% ▾]             │  ║
║  │  Branch display: [All ▾]  Thumbnail quality: [HD ▾]               │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─── Agent Autonomy ─────────────────────────────────────────────────┐  ║
║  │  Human approval required:  [None ▾]  (None / Destructive / All)   │  ║
║  │  Max concurrent agents:    [4 ▾]                                   │  ║
║  │  Agent memory TTL:         [72 hours ▾]                            │  ║
║  │  Skill auto-discovery:     [●] ENABLED                             │  ║
║  │  Sandbox mode:             [●] ENABLED                             │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─── Model Selection ────────────────────────────────────────────────┐  ║
║  │  Architecture:   [heavy-reasoner ▾]   Code gen: [heavy-coder ▾]   │  ║
║  │  Creative tasks: [creative ▾]         QA review: [heavy-reasoner ▾]│  ║
║  │  Daily gen:      [creative ▾]         Fallback:  [fallback-claude ▾]│  ║
║  │  Cost cap/day:   [$10.00]  Current spend: $2.47  [Reset]           │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Admin Dashboard Feature Table

| Section | Feature | Type | Default |
|---------|---------|------|---------|
| **Schedule** | Auto-generation toggle | On/Off | ON |
| **Schedule** | Frequency | Select: Daily/Weekly/Hourly/Manual | Daily |
| **Schedule** | Generation time | Time picker | 02:00 UTC |
| **Schedule** | Pages per site | Select: 1–10 | 3 |
| **Schedule** | Manual trigger | Button | — |
| **Style** | Style lock (freeze palette) | On/Off | OFF |
| **Style** | Locked palette | Color pickers | — |
| **Style** | Forced industry | Select / Auto | Auto |
| **Style** | Mood override | Select / Auto | Auto |
| **Style** | Font pairing lock | On/Off | OFF |
| **Agent Autonomy** | Approval mode | None/Destructive/All | None |
| **Agent Autonomy** | Max concurrent agents | 1–8 | 4 |
| **Agent Autonomy** | Memory TTL | 24h / 48h / 72h / 7d | 72h |
| **Agent Autonomy** | Skill auto-discovery | On/Off | ON |
| **Agent Autonomy** | Sandbox mode | On/Off | ON |
| **Model Selection** | Task→Model mapping | Select per task type | See defaults |
| **Model Selection** | Daily spend cap | Dollar input | $10.00 |
| **Model Selection** | Cost alert threshold | Percentage | 80% |
| **Key Vault** | OpenRouter API key | Password field | — |
| **Key Vault** | Anthropic API key | Password field | — |
| **Key Vault** | Langfuse keys | Password fields | — |
| **Email** | SMTP host/port/user/pass | Text fields | — |
| **Email** | Notification events | Multi-select | Generation,Error |
| **Backup** | Auto-backup | On/Off | ON |
| **Backup** | Backup frequency | Select | Daily |
| **Backup** | Backup destination | S3/Local/Both | Local |
| **Analytics** | Public analytics | On/Off | OFF |
| **Analytics** | Retention days | Number | 90 |
| **Timeline Mgmt** | Max frames stored | 100–5000 | 500 |
| **Timeline Mgmt** | Frame retention | Days | 90 |
| **Timeline Mgmt** | Ghost mode | On/Off | ON |
| **Timeline Mgmt** | Thumbnail quality | SD/HD/4K | HD |
| **User Mgmt** | Admin password change | Password fields | — |
| **User Mgmt** | JWT expiry | Hours | 24 |
| **User Mgmt** | Rate limit (req/min) | Number | 60 |

---

## 3.8 API Endpoint Complete Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Admin login → JWT token | No |
| POST | `/api/auth/logout` | Invalidate JWT | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |
| GET | `/api/auth/me` | Current admin profile | Yes |
| POST | `/api/auth/password` | Change admin password | Yes |

### Agent & Streaming (`/api/agent`, `/stream`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/agent/build` | Trigger full site build | Yes |
| POST | `/api/agent/generate-page` | Generate single page | Yes |
| POST | `/api/agent/edit` | Edit existing page | Yes |
| POST | `/api/agent/approve` | Approve pending agent action | Yes |
| POST | `/api/agent/cancel` | Cancel running agent job | Yes |
| GET | `/api/agent/status` | Current agent pipeline state | Yes |
| GET | `/api/agent/queue` | Job queue depth + pending jobs | Yes |
| GET | `/stream` | SSE stream of agent events | Yes |
| GET | `/stream/timewarp` | SSE for TimeWarp progress | Yes |

### Pages (`/api/pages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/pages` | List all pages (paginated) | Yes |
| GET | `/api/pages/:id` | Get page by ID | Yes |
| POST | `/api/pages` | Create page record | Yes |
| PUT | `/api/pages/:id` | Update page metadata | Yes |
| DELETE | `/api/pages/:id` | Soft-delete page | Yes |
| GET | `/api/pages/:id/preview` | Render page preview HTML | Yes |
| POST | `/api/pages/:id/publish` | Set page as published | Yes |
| GET | `/api/pages/search` | Full-text search pages | Yes |

### Site Generation (`/api/generate`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/generate/site` | Generate complete multi-page site | Yes |
| POST | `/api/generate/daily` | Trigger manual daily generation | Yes |
| GET | `/api/generate/history` | List generation runs | Yes |
| GET | `/api/generate/history/:id` | Single generation run detail | Yes |
| POST | `/api/generate/style-seed` | Create new StyleSeed | Yes |
| GET | `/api/generate/style-seeds` | List all StyleSeeds | Yes |
| GET | `/api/generate/style-seeds/:id` | Get single StyleSeed | Yes |
| DELETE | `/api/generate/style-seeds/:id` | Delete StyleSeed | Yes |

### TimeWarp (`/api/timewarp`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/timewarp/frames` | List all timeline frames | Yes |
| GET | `/api/timewarp/frames/:id` | Get frame detail + thumbnail URLs | Yes |
| POST | `/api/timewarp/snapshot` | Manually trigger snapshot | Yes |
| POST | `/api/timewarp/restore/:id` | Restore site to frame | Yes |
| DELETE | `/api/timewarp/frames/:id` | Delete a frame | Yes |
| GET | `/api/timewarp/branches` | List all timeline branches | Yes |
| POST | `/api/timewarp/branch` | Create new branch from frame | Yes |
| GET | `/api/timewarp/diff/:id1/:id2` | Diff two frames (ghost mode data) | Yes |
| GET | `/api/timewarp/thumbnail/:id` | Serve frame thumbnail image | No |
| GET | `/api/timewarp/export/:id` | Export frame as ZIP | Yes |

### Gallery (`/api/gallery`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/gallery` | Public generated sites gallery | No |
| GET | `/api/gallery/:id` | Single gallery item | No |
| POST | `/api/gallery/:id/like` | Like/heart a generated site | No |
| GET | `/api/gallery/featured` | Editor's picks / featured sites | No |
| GET | `/api/gallery/trending` | Most liked this week | No |

### Style Engine (`/api/style`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/style/generate` | Generate random StyleSeed | Yes |
| POST | `/api/style/lock` | Lock current style | Yes |
| DELETE | `/api/style/lock` | Unlock style | Yes |
| GET | `/api/style/trends` | Fetch current design trends | Yes |
| POST | `/api/style/preview` | Preview StyleSeed on template | Yes |

### Admin (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/settings` | Get all admin config | Yes |
| PUT | `/api/admin/settings` | Update admin config (bulk) | Yes |
| GET | `/api/admin/settings/:key` | Get single config value | Yes |
| PUT | `/api/admin/settings/:key` | Update single config value | Yes |
| GET | `/api/admin/keys` | List key vault entries (masked) | Yes |
| PUT | `/api/admin/keys/:name` | Store/update API key | Yes |
| DELETE | `/api/admin/keys/:name` | Delete API key | Yes |
| GET | `/api/admin/cron` | List scheduled jobs | Yes |
| PUT | `/api/admin/cron/:name` | Update job schedule | Yes |
| POST | `/api/admin/cron/:name/run` | Manually trigger cron job | Yes |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/overview` | Dashboard metrics overview | Yes |
| GET | `/api/analytics/pages` | Per-page view stats | Yes |
| GET | `/api/analytics/agents` | Agent performance metrics | Yes |
| GET | `/api/analytics/llm` | LLM cost + token usage | Yes |
| GET | `/api/analytics/timewarp` | TimeWarp activity stats | Yes |
| POST | `/api/analytics/event` | Record custom analytics event | No |

### Voice Input (`/api/voice`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/voice/transcribe` | Transcribe audio → text prompt | Yes |
| POST | `/api/voice/command` | Process voice command | Yes |

### Health & Meta (`/api/health`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Overall system health check | No |
| GET | `/api/health/zeroclaw` | ZeroClaw daemon status | No |
| GET | `/api/health/litellm` | LiteLLM proxy status | No |
| GET | `/api/health/db` | SQLite database status | No |
| GET | `/api/version` | App version + git SHA | No |
| GET | `/api/docs` | OpenAPI spec (JSON) | No |

---

## 3.9 Database Schema (SQLite — Full 8-Table Schema)

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- DaveAI SQLite Schema v4.0
-- File: agent-brain/database/schema.sql
-- Apply: sqlite3 daveai.db < schema.sql
-- ═══════════════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous  = NORMAL;

-- ── 1. PAGES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    slug            TEXT    NOT NULL UNIQUE,
    content         TEXT    NOT NULL DEFAULT '',
    meta_desc       TEXT,
    meta_keywords   TEXT,
    og_image        TEXT,
    status          TEXT    NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','published','archived')),
    page_type       TEXT    NOT NULL DEFAULT 'landing'
                            CHECK (page_type IN ('landing','about','contact',
                                                  'blog','portfolio','pricing',
                                                  'gallery','custom')),
    site_id         TEXT,           -- Groups multi-page sites together
    style_seed_id   INTEGER REFERENCES style_seeds(id) ON DELETE SET NULL,
    generation_id   INTEGER REFERENCES generated_sites(id) ON DELETE SET NULL,
    timewarp_frame  TEXT,           -- Current git commit hash
    view_count      INTEGER NOT NULL DEFAULT 0,
    created_by      TEXT    NOT NULL DEFAULT 'agent',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_pages_slug       ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_site_id    ON pages(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_status     ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages(created_at DESC);

-- Auto-update updated_at trigger
CREATE TRIGGER IF NOT EXISTS pages_updated_at
    AFTER UPDATE ON pages
    FOR EACH ROW BEGIN
        UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

-- ── 2. ANALYTICS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id     INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    event_type  TEXT    NOT NULL
                        CHECK (event_type IN ('page_view','click','scroll',
                                               'form_submit','gallery_view',
                                               'timewarp_view','custom')),
    session_id  TEXT,
    referrer    TEXT,
    user_agent  TEXT,
    country     TEXT,
    device_type TEXT    CHECK (device_type IN ('desktop','mobile','tablet',NULL)),
    meta        TEXT,   -- JSON blob for custom event data
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_id    ON analytics(page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session    ON analytics(session_id);

-- ── 3. ADMIN CONFIG ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_table (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key  TEXT    NOT NULL UNIQUE,
    config_val  TEXT    NOT NULL,
    val_type    TEXT    NOT NULL DEFAULT 'string'
                        CHECK (val_type IN ('string','integer','boolean',
                                             'float','json','secret')),
    description TEXT,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default config values
INSERT OR IGNORE INTO admin_table (config_key, config_val, val_type, description) VALUES
    ('auto_generation_enabled',  'true',       'boolean', 'Enable autonomous daily site generation'),
    ('generation_frequency',     'daily',      'string',  'Frequency: daily/weekly/hourly/manual'),
    ('generation_time',          '02:00',      'string',  'UTC time for daily generation'),
    ('generation_pages_count',   '3',          'integer', 'Pages to generate per site'),
    ('style_lock_enabled',       'false',      'boolean', 'Lock design palette'),
    ('agent_approval_mode',      'none',       'string',  'Approval gate: none/destructive/all'),
    ('max_concurrent_agents',    '4',          'integer', 'Max parallel agent workers'),
    ('agent_memory_ttl_hours',   '72',         'integer', 'Agent memory retention hours'),
    ('timewarp_max_frames',      '500',        'integer', 'Max TimeWarp snapshots to retain'),
    ('timewarp_retention_days',  '90',         'integer', 'Days to keep TimeWarp frames'),
    ('timewarp_ghost_mode',      'true',       'boolean', 'Enable ghost overlay diff mode'),
    ('thumbnail_quality',        'hd',         'string',  'Thumbnail quality: sd/hd/4k'),
    ('llm_daily_spend_cap',      '10.00',      'float',   'USD daily LLM spend ceiling'),
    ('llm_cost_alert_pct',       '80',         'integer', 'Alert when spend hits this % of cap'),
    ('model_architecture',       'heavy-reasoner', 'string', 'LLM for site architecture tasks'),
    ('model_code_gen',           'heavy-coder', 'string', 'LLM for code generation tasks'),
    ('model_creative',           'creative',   'string',  'LLM for creative/copy tasks'),
    ('model_daily_gen',          'creative',   'string',  'LLM for daily autonomous generation'),
    ('email_notifications',      'true',       'boolean', 'Send email on key events'),
    ('email_events',             '["generation_complete","error","daily_summary"]', 'json', 'Events to email'),
    ('backup_enabled',           'true',       'boolean', 'Auto-backup to local storage'),
    ('backup_frequency',         'daily',      'string',  'Backup frequency'),
    ('public_analytics',         'false',      'boolean', 'Show public analytics dashboard'),
    ('analytics_retention_days', '90',         'integer', 'Analytics data retention days'),
    ('jwt_expiry_hours',         '24',         'integer', 'JWT token expiry in hours'),
    ('rate_limit_rpm',           '60',         'integer', 'API rate limit requests per minute');

-- ── 4. TIMEWARP FRAMES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timewarp_frames (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash     TEXT    NOT NULL UNIQUE,
    branch          TEXT    NOT NULL DEFAULT 'main',
    title           TEXT    NOT NULL,
    description     TEXT,
    thumbnail_path  TEXT,                   -- Composite thumbnail file path
    thumbnail_paths TEXT,                   -- JSON array: per-page thumbnails
    style_seed_id   INTEGER REFERENCES style_seeds(id) ON DELETE SET NULL,
    generation_id   INTEGER REFERENCES generated_sites(id) ON DELETE SET NULL,
    page_count      INTEGER NOT NULL DEFAULT 1,
    ai_summary      TEXT,                   -- AI-generated diff summary
    tags            TEXT,                   -- JSON array of tags
    is_milestone    INTEGER NOT NULL DEFAULT 0,  -- Featured frame flag
    created_by      TEXT    NOT NULL DEFAULT 'agent',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timewarp_commit     ON timewarp_frames(commit_hash);
CREATE INDEX IF NOT EXISTS idx_timewarp_branch     ON timewarp_frames(branch);
CREATE INDEX IF NOT EXISTS idx_timewarp_created_at ON timewarp_frames(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timewarp_milestone  ON timewarp_frames(is_milestone)
    WHERE is_milestone = 1;

-- ── 5. STYLE SEEDS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS style_seeds (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    seed_hash       TEXT    NOT NULL UNIQUE,    -- Deterministic hash of seed params
    palette         TEXT    NOT NULL,           -- JSON: {primary, secondary, accent, bg, text}
    fonts           TEXT    NOT NULL,           -- JSON: {heading, body, mono}
    layout          TEXT    NOT NULL,           -- hero/grid/magazine/minimal/bold/card
    theme           TEXT    NOT NULL,           -- light/dark/auto
    mood            TEXT    NOT NULL,           -- professional/playful/luxury/minimal/bold
    industry        TEXT,                       -- tech/health/food/finance/etc (null=auto)
    animation_style TEXT    NOT NULL DEFAULT 'subtle',
    border_radius   TEXT    NOT NULL DEFAULT 'medium',
    spacing_scale   REAL    NOT NULL DEFAULT 1.0,
    trend_score     REAL,                       -- 0-1 how trend-aligned
    a11y_score      REAL,                       -- WCAG contrast score
    times_used      INTEGER NOT NULL DEFAULT 0,
    avg_rating      REAL,
    is_locked       INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_style_seeds_hash    ON style_seeds(seed_hash);
CREATE INDEX IF NOT EXISTS idx_style_seeds_mood    ON style_seeds(mood);
CREATE INDEX IF NOT EXISTS idx_style_seeds_industry ON style_seeds(industry);

-- ── 6. GENERATED SITES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_sites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name       TEXT    NOT NULL,
    site_slug       TEXT    NOT NULL UNIQUE,
    industry        TEXT,
    page_count      INTEGER NOT NULL DEFAULT 1,
    style_seed_id   INTEGER REFERENCES style_seeds(id) ON DELETE SET NULL,
    generation_type TEXT    NOT NULL DEFAULT 'daily'
                            CHECK (generation_type IN ('daily','manual','user',
                                                        'scheduled','ab_variant')),
    trigger_source  TEXT    NOT NULL DEFAULT 'cron',
    llm_model       TEXT,
    tokens_used     INTEGER,
    cost_usd        REAL,
    duration_s      REAL,
    status          TEXT    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','generating','complete',
                                              'failed','archived')),
    error_message   TEXT,
    timewarp_frame_id INTEGER REFERENCES timewarp_frames(id) ON DELETE SET NULL,
    is_featured     INTEGER NOT NULL DEFAULT 0,
    likes_count     INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_gen_sites_slug       ON generated_sites(site_slug);
CREATE INDEX IF NOT EXISTS idx_gen_sites_status     ON generated_sites(status);
CREATE INDEX IF NOT EXISTS idx_gen_sites_type       ON generated_sites(generation_type);
CREATE INDEX IF NOT EXISTS idx_gen_sites_created_at ON generated_sites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_sites_featured   ON generated_sites(is_featured)
    WHERE is_featured = 1;

-- ── 7. CRON JOBS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cron_jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name        TEXT    NOT NULL UNIQUE,
    schedule        TEXT    NOT NULL,       -- Cron expression: "0 2 * * *"
    skill           TEXT    NOT NULL,       -- ZeroClaw skill name
    enabled         INTEGER NOT NULL DEFAULT 1,
    last_run_at     DATETIME,
    next_run_at     DATETIME,
    last_status     TEXT    CHECK (last_status IN ('success','failed','running',NULL)),
    last_duration_s REAL,
    run_count       INTEGER NOT NULL DEFAULT 0,
    fail_count      INTEGER NOT NULL DEFAULT 0,
    on_failure      TEXT    NOT NULL DEFAULT 'notify_email',
    timeout_s       INTEGER NOT NULL DEFAULT 1800,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default cron jobs
INSERT OR IGNORE INTO cron_jobs
    (job_name, schedule, skill, on_failure, timeout_s) VALUES
    ('daily_site_generation', '0 2 * * *',  'daily_site_gen',    'notify_email', 1800),
    ('timewarp_cleanup',      '0 3 * * *',  'timewarp_cleanup',  'notify_email',  300),
    ('analytics_rollup',      '0 4 * * *',  'analytics_rollup',  'notify_email',  120),
    ('backup_database',       '0 5 * * *',  'db_backup',         'notify_email',   60),
    ('style_trend_refresh',   '0 6 * * 1',  'trend_scraper',     'notify_email',  600);

-- ── 8. AGENT LOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_role      TEXT    NOT NULL
                            CHECK (agent_role IN ('supervisor','coder','asset',
                                                   'qa','daily_gen','timewarp',
                                                   'style','seo','system')),
    job_id          TEXT,               -- Correlation ID across agent pipeline
    generation_id   INTEGER REFERENCES generated_sites(id) ON DELETE SET NULL,
    skill_name      TEXT,
    event_type      TEXT    NOT NULL
                            CHECK (event_type IN ('start','progress','complete',
                                                   'error','retry','approve',
                                                   'skip','warning')),
    message         TEXT    NOT NULL,
    metadata        TEXT,               -- JSON blob (tokens, cost, duration, etc.)
    llm_model       TEXT,
    tokens_in       INTEGER,
    tokens_out      INTEGER,
    cost_usd        REAL,
    duration_ms     INTEGER,
    error_code      TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_log_job_id    ON agent_log(job_id);
CREATE INDEX IF NOT EXISTS idx_agent_log_agent     ON agent_log(agent_role);
CREATE INDEX IF NOT EXISTS idx_agent_log_event     ON agent_log(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_log_created   ON agent_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_log_gen_id    ON agent_log(generation_id);

-- ── VIEWS ─────────────────────────────────────────────────────────────────
-- Daily generation summary view
CREATE VIEW IF NOT EXISTS v_daily_summary AS
SELECT
    date(created_at)    AS generation_date,
    COUNT(*)            AS sites_generated,
    SUM(page_count)     AS total_pages,
    AVG(duration_s)     AS avg_duration_s,
    SUM(cost_usd)       AS total_cost_usd,
    SUM(tokens_used)    AS total_tokens,
    SUM(CASE WHEN status='complete' THEN 1 ELSE 0 END) AS succeeded,
    SUM(CASE WHEN status='failed'   THEN 1 ELSE 0 END) AS failed
FROM generated_sites
GROUP BY date(created_at)
ORDER BY generation_date DESC;

-- Agent performance view
CREATE VIEW IF NOT EXISTS v_agent_performance AS
SELECT
    agent_role,
    skill_name,
    COUNT(*)                AS total_runs,
    AVG(duration_ms)/1000.0 AS avg_duration_s,
    SUM(tokens_in)          AS total_tokens_in,
    SUM(tokens_out)         AS total_tokens_out,
    SUM(cost_usd)           AS total_cost_usd,
    SUM(CASE WHEN event_type='error' THEN 1 ELSE 0 END) AS error_count
FROM agent_log
WHERE skill_name IS NOT NULL
GROUP BY agent_role, skill_name
ORDER BY total_runs DESC;
```

---

## 3.10 Deployment Checklist (10-Phase)

### Phase 1 — Environment Preparation

```bash
# 1.1 Verify .env file has all required keys
cd /app
grep -E "^(OPENROUTER_API_KEY|ANTHROPIC_API_KEY|LITELLM_MASTER_KEY|JWT_SECRET|SMTP_)" .env
# All 8+ keys must be present and non-empty

# 1.2 Confirm Tailscale VPN connectivity
ping -c 2 100.64.0.10   # PC1 — RTX 3090 Ti
ping -c 2 100.64.0.11   # PC2 — AMD 7800 XT
# Both must respond

# 1.3 Check disk space (need 10GB+ free)
df -h /app

# 1.4 Pull latest images
docker compose pull
```

### Phase 2 — Brain v4 Deployment

```bash
# 2.1 Verify v4 files exist
ls -la agent-brain/brain_v4_part1.py agent-brain/brain_v4_part2.py

# 2.2 Update Dockerfile to use v4
# Edit agent-brain/Dockerfile:
#   CMD ["uvicorn", "brain_v4_part1:app", "--host", "0.0.0.0", "--port", "8888"]

# 2.3 Apply SQLite schema
sqlite3 agent-brain/daveai.db < agent-brain/database/schema.sql
echo "✓ Schema applied"

# 2.4 Build and start agent-brain
docker compose build agent-brain
docker compose up -d agent-brain
sleep 5

# 2.5 Health check
curl -sf http://localhost:8888/api/health | jq .
# Expected: {"status":"healthy","version":"4.0.0",...}
```

### Phase 3 — LiteLLM Configuration

```bash
# 3.1 Copy config
cp litellm/config.yaml litellm/config.yaml.bak
# Verify your OpenRouter key is in .env

# 3.2 Start LiteLLM
docker compose up -d litellm
sleep 10

# 3.3 Test routing for each model alias
curl -sf http://localhost:4000/health | jq .
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"heavy-coder","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' \
  | jq .choices[0].message.content
# Expected: some valid response string

# 3.4 Test local model paths (if PCs are online)
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"local-fast","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'
```

### Phase 4 — ZeroClaw Tool Verification

```bash
# 4.1 Start ZeroClaw
docker compose up -d zeroclaw
sleep 5

# 4.2 Check skill manifest is loaded
curl -sf http://localhost:3000/skills | jq '.skills | length'
# Expected: 10+ skills

# 4.3 Test a simple skill
curl -X POST http://localhost:3000/skills/style_seed_create/run \
  -H "Content-Type: application/json" \
  -d '{"mood":"professional","industry":"tech"}' | jq .

# 4.4 Verify ZeroClaw ↔ brain-v4 communication
curl -sf http://localhost:3000/health/upstream | jq .
```

### Phase 5 — TimeWarp System

```bash
# 5.1 Initialize git repo for TimeWarp snapshots
cd /app/output
git init --initial-branch=main
git config user.email "daveai@localhost"
git config user.name "DaveAI Agent"
git commit --allow-empty -m "🚀 TimeWarp initialized"
echo "✓ TimeWarp git repo ready"

# 5.2 Run TimeWarp indexer test
cd /app
python3 agent-brain/timewarp_indexer.py --test
# Expected: "TimeWarp indexer OK — connected to SQLite"

# 5.3 Take first manual snapshot
curl -X POST http://localhost:8888/api/timewarp/snapshot \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Initial deployment snapshot","branch":"main"}'

# 5.4 Verify thumbnail was generated
ls -la /app/output/thumbnails/
```

### Phase 6 — Nginx Configuration

```bash
# 6.1 Test nginx config
nginx -t

# 6.2 Verify upstream proxy blocks exist
grep -A3 "location /api" /etc/nginx/sites-available/daveai.tech

# 6.3 Reload nginx
systemctl reload nginx

# 6.4 Test HTTPS endpoints
curl -sf https://daveai.tech/api/health | jq .
curl -sf https://daveai.tech/stream -H "Accept: text/event-stream" &
sleep 2 && kill %1
echo "✓ SSE endpoint reachable"

# 6.5 Fix B-002: Verify Next.js uses correct API URL
grep "NEXT_PUBLIC_AGENT_HTTP" /app/agentic-ui/.env.production
# Must be: NEXT_PUBLIC_AGENT_HTTP=https://daveai.tech/api
```

### Phase 7 — Cron Activation

```bash
# 7.1 Verify cron jobs in DB
sqlite3 agent-brain/daveai.db \
  "SELECT job_name, schedule, enabled FROM cron_jobs;"

# 7.2 Enable ZeroClaw cron daemon
curl -X PUT http://localhost:3000/cron/start \
  -H "Content-Type: application/json"

# 7.3 Check next run times
curl -sf http://localhost:3000/cron/status | jq '.jobs[] | {name,next_run}'

# 7.4 Trigger a manual daily gen to verify full pipeline
curl -X POST http://localhost:8888/api/generate/daily \
  -H "Authorization: Bearer $JWT_TOKEN" | jq .
# Watch SSE stream for progress
```

### Phase 8 — Smoke Tests

```bash
# 8.1 Full E2E health check
docker compose ps   # All 4 services must be "Up"

# 8.2 Test site generation end-to-end
curl -X POST https://daveai.tech/api/generate/site \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Modern SaaS landing page for a DevOps tool","pages":3}' \
  | jq .job_id

# 8.3 Run Playwright E2E suite
cd /app
npx playwright test --project=chromium tests/e2e/
# Expected: all tests pass

# 8.4 Validate generated pages render
curl -sf https://daveai.tech/ | grep -c "DaveAI"

# 8.5 Gallery endpoint check
curl -sf https://daveai.tech/api/gallery | jq '.items | length'
```

### Phase 9 — Monitoring Setup

```bash
# 9.1 Enable Langfuse tracing (if configured)
grep "LANGFUSE" .env && echo "✓ Langfuse configured" || echo "⚠ Langfuse keys missing"

# 9.2 Set up log rotation
cat > /etc/logrotate.d/daveai << EOF
/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        docker compose kill -s HUP agent-brain
    endscript
}
EOF

# 9.3 Set up spend alert (fires at 80% of daily cap)
# Configured via admin dashboard → Model Selection → Cost alert threshold

# 9.4 Uptime monitoring
curl -sf https://daveai.tech/api/health | jq .status
# Set up external ping (UptimeRobot / Betterstack) to /api/health
```

### Phase 10 — Backup Configuration

```bash
# 10.1 Configure local backup
mkdir -p /app/backups

# 10.2 Test DB backup skill manually
curl -X POST http://localhost:3000/skills/db_backup/run \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# 10.3 Verify backup file created
ls -lh /app/backups/daveai-*.db.gz | head -3

# 10.4 Test restore procedure (dry run)
echo "SELECT COUNT(*) FROM pages;" | sqlite3 /app/backups/latest.db

# 10.5 Configure git backup of output/
cd /app/output
git remote add backup git@github.com:youruser/daveai-sites-backup.git || true
echo "✓ All 10 deployment phases complete — DaveAI v4 is live 🚀"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# QUICK REFERENCE
# ═══════════════════════════════════════════════════════════════════════════

## Key File Locations

| File | Path | Purpose |
|------|------|---------|
| Brain v4 Part 1 | `agent-brain/brain_v4_part1.py` | FastAPI app, auth, pages, agent routes |
| Brain v4 Part 2 | `agent-brain/brain_v4_part2.py` | TimeWarp, generation, gallery, admin |
| Brain v3 (current) | `agent-brain/brain.py` | ⚠️ Running now — replace with v4 |
| SQLite Schema | `agent-brain/database/schema.sql` | 8-table production schema |
| TimeWarp Indexer | `agent-brain/timewarp_indexer.py` | Git→SQLite snapshot indexer |
| LiteLLM Config | `litellm/config.yaml` | Model routing + OpenRouter setup |
| ZeroClaw Config | `zeroclaw/config.toml` | Daemon + skills + security config |
| Skill Manifest | `zeroclaw/skills/manifest.toml` | All registered agent skills |
| Docker Compose | `docker-compose.yml` | 4-service orchestration |
| Environment | `.env` | All secrets + API keys |
| Nginx Config | `/etc/nginx/sites-available/daveai.tech` | Reverse proxy + TLS |
| Next.js Frontend | `agentic-ui/` | Next.js 15 + Tailwind UI |
| Agent Skills P1 | `agent-brain/agent_skills_p1.py` | Core generation skills |
| Agent Skills P2 | `agent-brain/agent_skills_p2.py` | TimeWarp + notification skills |
| Playwright Tests | `agentic-ui/tests/e2e/` | End-to-end test suite |
| This Document | `zeroclaw/docs/daveai-master-plan.md` | Master plan (you are here) |

## Service Port Map

| Service | Port | Protocol | Notes |
|---------|------|----------|-------|
| ZeroClaw daemon | 3000 | HTTP/WS | Agent runtime + skills |
| Next.js UI | 3001 | HTTP | Dev; Nginx → 443 in prod |
| LiteLLM proxy | 4000 | HTTP | LLM routing gateway |
| Brain v4 FastAPI | 8888 | HTTP | Core API + SSE stream |
| LM Studio PC1 | 1234 | HTTP | RTX 3090 Ti via Tailscale |
| LM Studio PC2 | 1235 | HTTP | AMD 7800 XT via Tailscale |

## Critical Commands

```bash
# Start all services
docker compose up -d

# View live agent logs
docker compose logs -f agent-brain

# Trigger manual site generation
curl -X POST https://daveai.tech/api/generate/daily \
  -H "Authorization: Bearer $JWT_TOKEN"

# Open TimeWarp admin dashboard
open https://daveai.tech/admin/timewarp

# Apply DB schema changes
sqlite3 agent-brain/daveai.db < agent-brain/database/schema.sql

# Restart single service
docker compose restart agent-brain

# Check LiteLLM model health
curl http://localhost:4000/health | jq .

# Run E2E tests
npx playwright test --project=chromium
```

---

*Document generated: 2026-02-19 | DaveAI v4.0 | ZeroClaw + LangGraph + LiteLLM*  
*3-Agent deep audit synthesis: Codebase State (Agent 1) + SOTA Features (Agent 2) + Architecture (Agent 3)*  
*Total scope: 120+ missing skills · 25 TimeWarp features · 6 milestones · 50+ API endpoints · 8-table schema*
