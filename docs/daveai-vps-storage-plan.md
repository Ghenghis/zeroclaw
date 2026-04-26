# DaveAI VPS Storage & Site Lifecycle Plan
# Version: 1.0 | Date: 2026-02-20
# Author: ZeroClaw Agent System
# Status: PLANNING — For Windsurf/Agent Implementation

---

## Overview

This document covers:
1. Hostinger VPS resource allocation and capacity planning
2. Site compression, archival, and Time-Machine/TimeWarp storage strategy
3. Daily recreation scheduling with zero-downtime background generation
4. 365-day site lifecycle management
5. Storage math: 200 GB NVMe across ~350 generated sites
6. Admin controls for scheduling recreation time
7. All related files, DB tables, and agent instructions

**Target:** Run continuously for 1+ year generating SOTA websites daily,
keeping all sites accessible via TimeWarp, compressed when not live,
never running out of disk, never taking the live site down during regeneration.

---

## Section 1: VPS Specifications & Resource Budget

### 1.1 Hardware Available

```
┌─────────────────────────────────────────┐
│         HOSTINGER VPS SPECS             │
├─────────────────────────────────────────┤
│  CPU:        4 vCPU Cores               │
│  RAM:        16 GB                      │
│  Disk:       200 GB NVMe               │
│  Bandwidth:  16 TB/month               │
│  Snapshots:  1 (Hostinger managed)     │
│  Backups:    Weekly (Hostinger)        │
│  IP:         Dedicated                 │
│  Access:     Full Root                 │
│  Extras:     AI Assistant, Malware Scan│
└─────────────────────────────────────────┘
```

### 1.2 Resource Allocation Plan

```
200 GB NVMe Allocation
═══════════════════════════════════════════════════════
  OS + System                     8 GB    (4%)
  Node.js / Python / Rust tools   4 GB    (2%)
  ZeroClaw core app               2 GB    (1%)
  SQLite database (zeroclaw.db)   4 GB    (2%)
  Logs (pino, nginx, system)      4 GB    (2%)
  Current live site (built)       2 GB    (1%)
  Staging build (in-progress)     3 GB    (1.5%)
  Generated game HTML files       1 GB    (0.5%)
  ─────────────────────────────────────────────────
  RESERVED FOR OS/SYSTEM:        28 GB   (14%)
═══════════════════════════════════════════════════════
  AVAILABLE FOR SITE ARCHIVES:  172 GB   (86%)
═══════════════════════════════════════════════════════
```

### 1.3 CPU & RAM Allocation

```
CPU (4 vCPU) Allocation
─────────────────────────────────────
  Nginx (web server):          0.2 CPU
  Next.js app (live site):     0.5 CPU
  ZeroClaw Rust scheduler:     0.3 CPU
  Background build (staging):  1.5 CPU  (when active)
  Agent API calls:             0.2 CPU  (async, mostly wait)
  SQLite / DB operations:      0.1 CPU
  Log rotation / archiving:    0.2 CPU
  Idle headroom:               1.0 CPU

RAM (16 GB) Allocation
─────────────────────────────────────
  OS + system:                 2.0 GB
  Nginx:                       0.2 GB
  Next.js live server:         1.5 GB
  Next.js build (staging):     4.0 GB  (peak during build)
  ZeroClaw Rust process:       0.5 GB
  SQLite WAL mode:             0.5 GB
  Node.js scripts:             0.5 GB
  Python agents:               1.0 GB
  Redis (stats cache):         0.3 GB
  Available headroom:          5.5 GB
```

---

## Section 2: Storage Math — 365 Days of SOTA Sites

### 2.1 Per-Site Size Estimates

A fully built SOTA Next.js site includes:
- `.next/` build output (JS bundles, CSS, HTML)
- `public/` assets (images, fonts, icons)
- Source files (`app/`, `components/`, `lib/`)

```
Uncompressed site size breakdown:
  .next/ static chunks:         15-25 MB
  .next/ server:                 5-10 MB
  public/ (generated images):   10-30 MB
  Source code:                    2-5 MB
  node_modules/ (NOT archived):      0 MB  ← excluded from archive
  ────────────────────────────────────────
  Total per site (uncompressed): 32-70 MB  average ~50 MB

After zstd compression (level 19, multi-threaded):
  Compression ratio for Next.js builds: ~4:1 to 6:1
  Compressed size per site:        8-15 MB  average ~12 MB
```

### 2.2 Annual Capacity Calculation

```
365 days × 12 MB average = 4,380 MB ≈ 4.3 GB for 365 compressed sites

Available archive space: 172 GB

Headroom factor: 172 GB / 4.3 GB = 40x

This means we can store:
  - 350 daily sites with NO compression:    ~17.5 GB
  - 350 daily sites WITH zstd compression:  ~4.2 GB
  - 1,000+ sites with compression:          ~12 GB
  - 10,000 sites with compression:          ~120 GB (still fits!)

CONCLUSION: 200 GB NVMe is MORE than sufficient for:
  ✅ 1 full year (365 days) of daily SOTA sites
  ✅ 3-5 years of daily sites with compression
  ✅ All TimeWarp snapshots
  ✅ Weekend game HTML files
  ✅ Full database history
  ✅ Logs for entire operation period
```

### 2.3 Compression Strategy — zstd

Using **Zstandard (zstd)** compression — best ratio for text/JS at fastest decompression speeds.

```bash
# Archive a built site (excludes node_modules, .git)
tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  -I 'zstd -T0 -19' \
  -cf /archives/site_2026-02-20_abc12345.tar.zst \
  -C /staging/site_2026-02-20 \
  .

# Decompress for TimeWarp viewing (to temp dir)
tar -I 'zstd -T0' -xf /archives/site_2026-02-20_abc12345.tar.zst \
  -C /tmp/timewarp_preview/

# Get archive size
du -sh /archives/site_2026-02-20_abc12345.tar.zst

# List all archives sorted by date
ls -lht /archives/ | head -20
```

### 2.4 TimeWarp — Decompress On Demand

When a user navigates to a past date in TimeWarp, the archived site is:
1. Decompressed to a temp directory `/tmp/timewarp/{date}/`
2. Served via a dedicated Next.js route or nginx virtual host
3. Auto-deleted from tmp after 30 minutes of inactivity

```typescript
// lib/timewarp/TimeWarpServer.ts
import { execSync, spawn } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logger } from '@/lib/logger'

const ARCHIVE_DIR = process.env.ARCHIVE_DIR ?? '/var/www/zeroclaw/archives'
const TMP_DIR = '/tmp/timewarp'
const PREVIEW_PORT_BASE = 4000  // preview sites on ports 4000-4099

export class TimeWarpServer {
  private activeServers = new Map<string, { port: number; pid: number; lastAccess: number }>()
  private portPool = Array.from({ length: 100 }, (_, i) => PREVIEW_PORT_BASE + i)

  async getOrStartPreview(date: string): Promise<{ url: string }> {
    // Already running?
    const existing = this.activeServers.get(date)
    if (existing) {
      existing.lastAccess = Date.now()
      return { url: `http://localhost:${existing.port}` }
    }

    const archivePath = this.findArchive(date)
    if (!archivePath) throw new Error(`No archive found for date: ${date}`)

    const previewDir = join(TMP_DIR, date)
    mkdirSync(previewDir, { recursive: true })

    logger.info(`[TimeWarp] Decompressing ${date} → ${previewDir}`)
    execSync(`tar -I 'zstd -T0' -xf ${archivePath} -C ${previewDir}`)

    // Start Next.js in preview mode on available port
    const port = this.allocatePort()
    const proc = spawn('node', ['.next/standalone/server.js'], {
      cwd: previewDir,
      env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
      detached: true,
    })

    this.activeServers.set(date, { port, pid: proc.pid!, lastAccess: Date.now() })
    logger.info(`[TimeWarp] Preview started: date=${date} port=${port} pid=${proc.pid}`)

    // Wait for server to be ready
    await this.waitForPort(port, 15000)

    return { url: `http://localhost:${port}` }
  }

  private findArchive(date: string): string | null {
    const pattern = `${ARCHIVE_DIR}/site_${date}_*.tar.zst`
    try {
      const result = execSync(`ls ${pattern} 2>/dev/null | head -1`).toString().trim()
      return result || null
    } catch { return null }
  }

  private allocatePort(): number {
    const used = new Set(Array.from(this.activeServers.values()).map(s => s.port))
    const available = this.portPool.find(p => !used.has(p))
    if (!available) throw new Error('No preview ports available')
    return available
  }

  // Cleanup idle previews every 5 minutes
  startCleanupLoop(): void {
    setInterval(() => {
      const now = Date.now()
      this.activeServers.forEach((server, date) => {
        if (now - server.lastAccess > 30 * 60 * 1000) {
          logger.info(`[TimeWarp] Cleaning up idle preview: ${date}`)
          try { process.kill(server.pid) } catch {}
          execSync(`rm -rf ${join(TMP_DIR, date)}`)
          this.activeServers.delete(date)
        }
      })
    }, 5 * 60 * 1000)
  }

  private waitForPort(port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      const check = () => {
        try {
          execSync(`curl -sf http://localhost:${port} > /dev/null 2>&1`)
          resolve()
        } catch {
          if (Date.now() - start > timeoutMs) reject(new Error(`Port ${port} timeout`))
          else setTimeout(check, 500)
        }
      }
      setTimeout(check, 2000)
    })
  }
}
```

---

## Section 3: Daily Recreation — Zero-Downtime Scheduling

### 3.1 How It Works (User Message Incorporated)

Key behaviors confirmed by user:
- **Changes website daily** ✅
- **Default time: 3:00 AM** (admin-configurable) ✅
- **Admin can change the time** ✅
- **Generates in background** — never affecting live site ✅
- **Refreshes when ready** — browser gets SSE signal, shows toast ✅
- **User decides when to refresh** (or auto-refresh after countdown) ✅

```
TIMELINE OF A DAILY RECREATION
═══════════════════════════════════════════════════════════════════
  2:58 AM  │ Scheduler wakes up (cron: "0 3 * * *")
  3:00 AM  │ DailyBriefGenerator creates today's design brief
  3:01 AM  │ BackgroundBuildWorker starts in /staging/ directory
           │ ┌─ Live site at /current/ is UNTOUCHED ─────────────┐
           │ │  Users browsing see no interruption               │
           │ └───────────────────────────────────────────────────┘
  3:01 AM  │ Agent generates site files (Next.js 15 app)
  3:20 AM  │ npm run build in /staging/ (Next.js production build)
  3:35 AM  │ Lighthouse audit runs against staging preview server
  3:36 AM  │ Score ≥ 90? → Proceed. Score < 90? → Log + skip swap
  3:37 AM  │ ATOMIC SWAP: mv /current/ → /prev/  mv /staging/ → /current/
  3:37 AM  │ Nginx reloads (zero downtime, no socket drop)
  3:37 AM  │ SSE broadcast → all connected browsers: "new site ready"
           │ ┌─ Browser receives SSE event ──────────────────────┐
           │ │  Toast: "✨ New site ready! [Refresh Now]"         │
           │ │  Auto-refresh after 60s if not clicked             │
           │ └───────────────────────────────────────────────────┘
  3:38 AM  │ Compress /prev/ → /archives/site_YYYY-MM-DD.tar.zst
  3:40 AM  │ Update DB: daily_recreation_log, site_archives
  3:41 AM  │ Done. Scheduler sleeps until next day.
═══════════════════════════════════════════════════════════════════
  TOTAL TIME: ~40 minutes background work
  DOWNTIME: 0 seconds
```

### 3.2 Nginx Zero-Downtime Config

```nginx
# /etc/nginx/sites-available/zeroclaw
server {
    listen 80;
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL config (Let's Encrypt / Certbot)
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Proxy to Next.js standalone server
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # TimeWarp previews proxied by date
    # /timewarp/2026-02-15 → internal preview server
    location ~ ^/timewarp/(\d{4}-\d{2}-\d{2}) {
        proxy_pass http://127.0.0.1:3000/api/timewarp/$1;
    }

    # Static assets — long cache
    location /_next/static/ {
        proxy_pass  http://127.0.0.1:3000;
        expires     1y;
        add_header  Cache-Control "public, immutable";
    }
}
```

### 3.3 Admin Scheduler API Routes

```typescript
// app/api/admin/scheduler/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DailyRecreationScheduler } from '@/lib/daily/DailyRecreationScheduler'

// Singleton scheduler (initialized in server startup)
declare global { var scheduler: DailyRecreationScheduler | undefined }
const scheduler = global.scheduler ?? (global.scheduler = new DailyRecreationScheduler())

// GET — return current config
export async function GET() {
  return NextResponse.json(scheduler.getConfig())
}

// PATCH — update config (admin changes the time)
export async function PATCH(req: NextRequest) {
  const patch = await req.json()
  // Validate cron string before accepting
  if (patch.recreationTime && !isValidCron(patch.recreationTime)) {
    return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 })
  }
  scheduler.updateConfig(patch)
  return NextResponse.json({ ok: true, config: scheduler.getConfig() })
}

function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  return parts.length === 5
}

// app/api/admin/scheduler/trigger/route.ts
export async function POST() {
  // Trigger immediately (admin manual trigger)
  scheduler.triggerRecreation('admin')
  return NextResponse.json({ ok: true, message: 'Recreation triggered' })
}
```

### 3.4 Client Auto-Refresh Component (Updated)

Incorporates user requirement: "refresh when ready to switch"

```typescript
// components/SiteRefreshListener.tsx — FULL IMPLEMENTATION
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface RefreshToast {
  theme: string
  background: string
  message: string
}

export function SiteRefreshListener() {
  const router = useRouter()
  const [pending, setPending] = useState<RefreshToast | null>(null)
  const [countdown, setCountdown] = useState(60)

  const doRefresh = useCallback(() => {
    router.refresh()
    setPending(null)
  }, [router])

  // SSE listener
  useEffect(() => {
    const es = new EventSource('/api/events/site')

    es.addEventListener('site_refresh', (e) => {
      const data = JSON.parse(e.data) as RefreshToast
      setPending(data)
      setCountdown(60)
    })

    es.addEventListener('site_incoming', (e) => {
      // Optional: "New site building..." notification
      const data = JSON.parse(e.data)
      console.info('[SiteRefresh] Incoming:', data)
    })

    return () => es.close()
  }, [])

  // Auto-refresh countdown
  useEffect(() => {
    if (!pending) return
    if (countdown <= 0) { doRefresh(); return }

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); doRefresh(); return 0 }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [pending, countdown, doRefresh])

  if (!pending) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-gray-900 border border-green-500/50 rounded-2xl p-4 shadow-2xl max-w-xs animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-2xl">✨</div>
        <div className="flex-1">
          <div className="font-bold text-white text-sm">New site is ready!</div>
          <div className="text-gray-400 text-xs mt-0.5">Theme: {pending.theme}</div>
          <div className="text-gray-400 text-xs">Background: {pending.background}</div>
        </div>
      </div>

      {/* Countdown bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Auto-refresh in</span>
          <span className="font-mono text-green-400">{countdown}s</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div
            className="bg-green-500 h-1 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 60) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={doRefresh}
          className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded-lg font-bold transition-colors"
        >
          Refresh Now
        </button>
        <button
          onClick={() => setPending(null)}
          className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-2 rounded-lg transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  )
}
```

---

## Section 4: Disk Management & Log Rotation

### 4.1 Automated Disk Monitoring

```typescript
// lib/storage/DiskMonitor.ts
import { execSync } from 'child_process'
import { logger } from '@/lib/logger'

export interface DiskStatus {
  totalGB: number
  usedGB: number
  freeGB: number
  usedPercent: number
  archiveCount: number
  archiveSizeGB: number
  oldestArchive: string | null
}

export class DiskMonitor {
  private readonly WARN_THRESHOLD = 0.80   // 80% full → warn
  private readonly DANGER_THRESHOLD = 0.90  // 90% full → emergency cleanup

  getStatus(): DiskStatus {
    const df = execSync("df -BG / | tail -1 | awk '{print $2, $3, $4}'").toString().trim()
    const [total, used, free] = df.split(' ').map(s => parseInt(s))

    const archiveInfo = execSync(
      `ls -la ${process.env.ARCHIVE_DIR}/*.tar.zst 2>/dev/null | wc -l && du -sh ${process.env.ARCHIVE_DIR} 2>/dev/null | cut -f1`
    ).toString().trim().split('\n')

    const oldestArchive = this.getOldestArchive()

    return {
      totalGB: total, usedGB: used, freeGB: free,
      usedPercent: used / total,
      archiveCount: parseInt(archiveInfo[0] ?? '0'),
      archiveSizeGB: parseFloat(archiveInfo[1] ?? '0'),
      oldestArchive,
    }
  }

  async checkAndAlert(): Promise<void> {
    const status = this.getStatus()
    logger.info(`[DiskMonitor] ${status.usedGB}GB/${status.totalGB}GB (${Math.round(status.usedPercent * 100)}%)`)

    if (status.usedPercent >= this.DANGER_THRESHOLD) {
      logger.error(`[DiskMonitor] DANGER: ${Math.round(status.usedPercent * 100)}% full — emergency cleanup`)
      await this.emergencyCleanup()
    } else if (status.usedPercent >= this.WARN_THRESHOLD) {
      logger.warn(`[DiskMonitor] WARNING: ${Math.round(status.usedPercent * 100)}% full`)
      await this.routineCleanup()
    }
  }

  private async routineCleanup(): Promise<void> {
    // Remove archives older than 180 days (keep last 6 months readily accessible)
    // They can be restored from Hostinger weekly backup if needed
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 180)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    execSync(`find ${process.env.ARCHIVE_DIR} -name "site_*.tar.zst" -older ${cutoffStr} -delete 2>/dev/null || true`)
    logger.info(`[DiskMonitor] Routine cleanup: removed archives older than ${cutoffStr}`)
  }

  private async emergencyCleanup(): Promise<void> {
    // Remove all tmp timewarp previews
    execSync('rm -rf /tmp/timewarp/*')
    // Remove old build artifacts
    execSync('rm -rf /var/www/zeroclaw/staging/.next/cache 2>/dev/null || true')
    // Truncate oldest 30 archives
    const archives = execSync(`ls ${process.env.ARCHIVE_DIR}/site_*.tar.zst | sort | head -30`).toString().trim().split('\n')
    archives.forEach(f => { if (f) execSync(`rm -f ${f}`) })
    logger.warn(`[DiskMonitor] Emergency cleanup: removed ${archives.length} old archives + tmp files`)
  }

  private getOldestArchive(): string | null {
    try {
      return execSync(`ls ${process.env.ARCHIVE_DIR}/site_*.tar.zst | sort | head -1`).toString().trim() || null
    } catch { return null }
  }
}
```

### 4.2 Log Rotation Config

```bash
# /etc/logrotate.d/daveai
/var/www/zeroclaw/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        # Signal pino to reopen log files
        kill -USR1 $(cat /var/www/zeroclaw/daveai.pid 2>/dev/null) 2>/dev/null || true
    endscript
}

# Nginx logs
/var/log/nginx/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    sharedscripts
    postrotate
        nginx -s reopen
    endscript
}
```

### 4.3 Systemd Service Files

```ini
# /etc/systemd/system/zeroclaw.service
[Unit]
Description=ZeroClaw DaveAI Website Generator
After=network.target
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/zeroclaw/current
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
PIDFile=/var/www/zeroclaw/daveai.pid

# Logging to file via pino
StandardOutput=append:/var/www/zeroclaw/logs/daveai.log
StandardError=append:/var/www/zeroclaw/logs/errors.log

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/zeroclaw-scheduler.service
[Unit]
Description=ZeroClaw Daily Recreation Scheduler
After=zeroclaw.service
Wants=zeroclaw.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/zeroclaw
ExecStart=/usr/bin/node /var/www/zeroclaw/scripts/scheduler.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

StandardOutput=append:/var/www/zeroclaw/logs/scheduler.log
StandardError=append:/var/www/zeroclaw/logs/scheduler-errors.log

[Install]
WantedBy=multi-user.target
```

---

## Section 5: Debugger & Monitoring Dashboard

### 5.1 Debug Panel (Admin Only)

```typescript
// app/admin/debug/page.tsx
'use client'
import { useState, useEffect } from 'react'

interface DebugInfo {
  disk: { used: number; total: number; percent: number }
  memory: { used: number; total: number }
  cpu: { percent: number; cores: number }
  processes: { name: string; pid: number; memory: number }[]
  recentLogs: { level: string; msg: string; time: string; system: string }[]
  archiveCount: number
  archiveSizeGB: number
  schedulerStatus: 'idle' | 'building' | 'error'
  nextRunAt: string
  lastRunAt: string
  lastRunScore: number
}

export default function DebugPanel() {
  const [info, setInfo] = useState<DebugInfo | null>(null)
  const [logFilter, setLogFilter] = useState<'all'|'error'|'warn'|'info'>('all')

  useEffect(() => {
    const fetchDebug = () => fetch('/api/admin/debug').then(r => r.json()).then(setInfo)
    fetchDebug()
    const interval = setInterval(fetchDebug, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!info) return <div className="p-8 text-white">Loading debug info...</div>

  const diskPercent = Math.round(info.disk.percent * 100)

  return (
    <div className="p-6 bg-gray-950 min-h-screen text-white font-mono text-sm">
      <h1 className="text-2xl font-bold mb-6 text-green-400">🔧 DaveAI Debug Panel</h1>

      {/* Resource bars */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Disk', value: diskPercent, used: `${info.disk.used}GB`, total: `${info.disk.total}GB`,
            color: diskPercent > 85 ? 'red' : diskPercent > 70 ? 'yellow' : 'green' },
          { label: 'RAM', value: Math.round(info.memory.used / info.memory.total * 100),
            used: `${(info.memory.used/1024).toFixed(1)}GB`, total: `${(info.memory.total/1024).toFixed(1)}GB`,
            color: 'blue' },
          { label: 'CPU', value: Math.round(info.cpu.percent),
            used: `${info.cpu.percent.toFixed(1)}%`, total: `${info.cpu.cores} cores`, color: 'purple' },
        ].map(r => (
          <div key={r.label} className="bg-gray-900 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{r.label}</span>
              <span className="text-white">{r.used} / {r.total}</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full bg-${r.color}-500`}
                style={{ width: `${r.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Scheduler status */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <h2 className="text-gray-400 mb-3">📅 Scheduler</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-gray-500 text-xs">Status</div>
            <div className={`font-bold ${
              info.schedulerStatus === 'building' ? 'text-yellow-400 animate-pulse'
              : info.schedulerStatus === 'error' ? 'text-red-400'
              : 'text-green-400'
            }`}>{info.schedulerStatus.toUpperCase()}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Next Run</div>
            <div className="text-white">{info.nextRunAt}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Last Run</div>
            <div className="text-white">{info.lastRunAt}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Last Score</div>
            <div className={info.lastRunScore >= 90 ? 'text-green-400' : 'text-yellow-400'}>
              {info.lastRunScore}/100
            </div>
          </div>
        </div>
      </div>

      {/* Archives */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <h2 className="text-gray-400 mb-2">💾 Site Archives</h2>
        <div className="flex gap-8">
          <div><span className="text-gray-500">Count: </span><span className="text-cyan-400">{info.archiveCount}</span></div>
          <div><span className="text-gray-500">Size: </span><span className="text-cyan-400">{info.archiveSizeGB.toFixed(2)} GB</span></div>
          <div><span className="text-gray-500">Capacity: </span><span className="text-green-400">{(172 - info.archiveSizeGB).toFixed(1)} GB free</span></div>
        </div>
      </div>

      {/* Live logs */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-400">📋 Recent Logs</h2>
          <select
            value={logFilter}
            onChange={e => setLogFilter(e.target.value as any)}
            className="bg-gray-800 rounded px-2 py-1 text-xs"
          >
            <option value="all">All</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {info.recentLogs
            .filter(l => logFilter === 'all' || l.level === logFilter)
            .map((log, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-gray-600 shrink-0">{log.time}</span>
                <span className={`shrink-0 w-12 ${
                  log.level === 'error' ? 'text-red-400'
                  : log.level === 'warn' ? 'text-yellow-400'
                  : 'text-blue-400'
                }`}>[{log.level}]</span>
                <span className="text-gray-500 shrink-0 w-20">{log.system}</span>
                <span className="text-gray-300 truncate">{log.msg}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Section 6: DB Schema — VPS Storage Tables

```sql
-- migrations/005_vps_storage.sql

-- Site archives registry
CREATE TABLE IF NOT EXISTS site_archives (
  id                TEXT PRIMARY KEY,
  run_id            TEXT NOT NULL,
  date              TEXT NOT NULL,
  archive_path      TEXT NOT NULL UNIQUE,
  size_bytes        INTEGER NOT NULL DEFAULT 0,
  uncompressed_bytes INTEGER NOT NULL DEFAULT 0,
  compression_ratio REAL GENERATED ALWAYS AS
    (CASE WHEN size_bytes > 0 THEN CAST(uncompressed_bytes AS REAL)/size_bytes ELSE 1 END) STORED,
  theme             TEXT,
  lighthouse_score  INTEGER,
  archived_at       DATETIME DEFAULT (datetime('now')),
  last_accessed     DATETIME,
  access_count      INTEGER DEFAULT 0
);

-- Disk monitoring log
CREATE TABLE IF NOT EXISTS disk_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  used_gb       REAL NOT NULL,
  total_gb      REAL NOT NULL,
  archive_count INTEGER NOT NULL,
  archive_gb    REAL NOT NULL,
  logged_at     DATETIME DEFAULT (datetime('now'))
);

-- TimeWarp access log
CREATE TABLE IF NOT EXISTS timewarp_access (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  ip_hash     TEXT,
  duration_s  INTEGER,
  accessed_at DATETIME DEFAULT (datetime('now'))
);

-- Scheduler config (key/value)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Insert defaults
INSERT OR IGNORE INTO settings VALUES
  ('scheduler_cron',     '"0 3 * * *"',    datetime('now')),
  ('scheduler_timezone', '"America/New_York"', datetime('now')),
  ('scheduler_enabled',  'true',           datetime('now')),
  ('auto_compress',      'true',           datetime('now')),
  ('lighthouse_min',     '90',             datetime('now')),
  ('refresh_countdown',  '60',             datetime('now'));

CREATE INDEX IF NOT EXISTS idx_archives_date ON site_archives(date);
CREATE INDEX IF NOT EXISTS idx_disk_snapshots_time ON disk_snapshots(logged_at);
CREATE INDEX IF NOT EXISTS idx_timewarp_date ON timewarp_access(date);
```

---

## Section 7: File Map — All Files for This Plan

```
zeroclaw/
├── docs/
│   ├── daveai-vps-storage-plan.md         ← THIS FILE
│   ├── daveai-theme-engine.md             ← Theme/background system
│   └── daveai-master-plan.md              ← Core system plan
│
├── lib/
│   ├── storage/
│   │   └── DiskMonitor.ts                 ← Disk usage monitor + cleanup
│   ├── timewarp/
│   │   └── TimeWarpServer.ts              ← Decompress + preview server
│   └── daily/
│       ├── DailyRecreationScheduler.ts    ← Cron scheduler (updated)
│       └── BackgroundBuildWorker.ts       ← Staging build runner
│
├── components/
│   └── SiteRefreshListener.tsx            ← Client refresh toast + countdown
│
├── app/
│   ├── admin/
│   │   ├── scheduler/page.tsx             ← Scheduler UI (time picker)
│   │   └── debug/page.tsx                 ← Debug/monitoring panel
│   └── api/
│       ├── admin/
│       │   ├── scheduler/route.ts         ← GET/PATCH scheduler config
│       │   ├── scheduler/trigger/route.ts ← POST trigger now
│       │   └── debug/route.ts             ← GET system debug info
│       └── events/site/route.ts           ← SSE: site refresh events
│
├── migrations/
│   ├── 004_theme_engine.sql               ← Theme engine tables
│   └── 005_vps_storage.sql               ← Storage/archive tables
│
├── scripts/
│   └── scheduler.js                       ← Standalone scheduler process
│
└── deploy/
    ├── zeroclaw.service                   ← systemd: main app
    ├── zeroclaw-scheduler.service         ← systemd: scheduler
    └── nginx.conf                         ← Nginx config with TimeWarp
```

---

## Section 8: Capacity Summary for Agents

```
┌─────────────────────────────────────────────────────────────┐
│             STORAGE CAPACITY AT A GLANCE                    │
├─────────────────────────────────────────────────────────────┤
│  VPS Disk:              200 GB NVMe                         │
│  System/OS reserved:     28 GB                              │
│  Available for sites:   172 GB                              │
│                                                             │
│  Per site compressed:    ~12 MB (zstd -19 level)           │
│  Sites per GB:           ~83 sites                          │
│                                                             │
│  365 sites total:        ~4.4 GB (2.2% of available)       │
│  1,000 sites total:      ~12 GB  (7% of available)         │
│  10,000 sites total:     ~120 GB (70% of available)        │
│                                                             │
│  VERDICT: 200 GB easily handles 3-5 YEARS of daily sites   │
│  Even without compression: 350 sites × 50 MB = 17.5 GB     │
│                                                             │
│  Trigger cleanup when:  > 80% disk used (~160 GB)          │
│  Emergency cleanup:     > 90% disk used (~180 GB)          │
│  Cleanup strategy:      Remove archives > 180 days old     │
│                         (Hostinger weekly backup = safety net)│
└─────────────────────────────────────────────────────────────┘

DAILY RECREATION SCHEDULE:
  Default:     3:00 AM server time (cron: "0 3 * * *")
  Admin can:   Change time via /admin/scheduler UI
  Admin can:   Trigger manual regeneration any time
  Process:     Background build → validate → atomic swap → notify
  Downtime:    ZERO — live site runs until atomic swap (~0.01s)
  Client UX:   Toast notification + 60s countdown then auto-refresh

COMPRESSION COMMAND:
  tar -I 'zstd -T0 -19' -cf archive.tar.zst -C /site/dir .
  Decompression: tar -I 'zstd -T0' -xf archive.tar.zst -C /dest/

LOG FILES:
  /var/www/zeroclaw/logs/daveai.log       ← Main app log
  /var/www/zeroclaw/logs/errors.log       ← Errors only
  /var/www/zeroclaw/logs/scheduler.log    ← Daily recreation log
  /var/log/nginx/access.log               ← Nginx access
  /var/log/nginx/error.log                ← Nginx errors
```
