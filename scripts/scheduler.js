#!/usr/bin/env node
// scripts/scheduler.js
// Standalone Node.js process that runs the DailyRecreationScheduler.
// Start with: node scripts/scheduler.js
// Or via systemd: zeroclaw-scheduler.service

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ── Environment setup ─────────────────────────────────────────────────────────

process.chdir(ROOT)

// Load .env.local if present (dev)
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

// ── PID file ──────────────────────────────────────────────────────────────────

const PID_FILE = process.env.SCHEDULER_PID_FILE ?? '/var/www/zeroclaw/scheduler.pid'

function writePid() {
  try {
    const pidDir = path.dirname(PID_FILE)
    fs.mkdirSync(pidDir, { recursive: true })
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8')
    console.log(`[scheduler] PID ${process.pid} written to ${PID_FILE}`)
  } catch (err) {
    console.warn(`[scheduler] Could not write PID file: ${err.message}`)
  }
}

function removePid() {
  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE)
  } catch { /* ignore */ }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[scheduler] Starting DaveAI Scheduler — PID ${process.pid}`)
  console.log(`[scheduler] Node ${process.version} | CWD: ${process.cwd()}`)
  console.log(`[scheduler] ${new Date().toISOString()}`)

  writePid()

  // Import scheduler (uses ts-node or compiled JS)
  let schedulerModule
  try {
    schedulerModule = await import('../lib/daily/DailyRecreationScheduler.js')
  } catch {
    // Try TypeScript path (when using ts-node or tsx)
    schedulerModule = await import('../lib/daily/DailyRecreationScheduler.ts')
  }

  const { scheduler } = schedulerModule

  // Also register broadcast function from events route
  try {
    const { broadcastSiteRefresh } = await import('../app/api/events/site/route.js')
      .catch(() => import('../app/api/events/site/route.ts'))
    const { registerBroadcastFn } = schedulerModule
    if (registerBroadcastFn && broadcastSiteRefresh) {
      registerBroadcastFn(broadcastSiteRefresh)
      console.log('[scheduler] Broadcast function registered')
    }
  } catch (err) {
    console.warn('[scheduler] Could not register broadcast function:', err.message)
  }

  scheduler.start()

  const nextRun = scheduler.getNextRun()
  console.log(`[scheduler] Started. Next run: ${nextRun ?? 'unknown'}`)
  console.log(`[scheduler] Cron: ${scheduler.getConfig().cronExpression} (${scheduler.getConfig().timezone})`)

  // ── Signal handlers ──────────────────────────────────────────────────────────

  async function gracefulShutdown(signal) {
    console.log(`\n[scheduler] Received ${signal} — shutting down gracefully`)
    scheduler.stop()
    removePid()
    console.log('[scheduler] Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

  process.on('uncaughtException', (err) => {
    console.error('[scheduler] Uncaught exception:', err)
    // Don't crash — log and continue
  })

  process.on('unhandledRejection', (reason) => {
    console.error('[scheduler] Unhandled rejection:', reason)
  })

  // Keep process alive
  console.log('[scheduler] Running… (Ctrl+C to stop)')
}

main().catch(err => {
  console.error('[scheduler] Fatal startup error:', err)
  removePid()
  process.exit(1)
})
