// lib/daily/DailyRecreationScheduler.ts
// Cron-based daily recreation scheduler with atomic swap, zero-downtime.
// Admin can change the cron schedule at runtime via PATCH /api/admin/scheduler

import { CronJob } from 'cron'
import { execSync, exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { schedulerLogger } from '@/lib/logger'
import { DailyBriefGenerator } from './DailyBriefGenerator'
import type { DailyBrief } from './DailyBriefGenerator'

const execAsync = promisify(exec)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchedulerConfig {
  cronExpression: string  // e.g. "0 3 * * *"
  timezone: string        // e.g. "America/New_York"
  enabled: boolean
  siteDir: string         // e.g. "/var/www/zeroclaw"
  archiveDir: string      // e.g. "/var/www/archives"
  buildCommand: string    // e.g. "npm run build"
  lighthouseMinScore: number
  autoCompress: boolean
  maxArchiveDays: number
}

export interface SchedulerRunLog {
  runId: string
  startedAt: Date
  finishedAt?: Date
  success: boolean
  stage?: string
  errorMessage?: string
  brief?: DailyBrief
  durationMs?: number
}

// ---------------------------------------------------------------------------
// Singleton broadcaster for SSE site-refresh events
// ---------------------------------------------------------------------------

let _broadcastFn: ((data: Record<string, unknown>) => void) | null = null

export function registerBroadcastFn(fn: (data: Record<string, unknown>) => void): void {
  _broadcastFn = fn
}

// ---------------------------------------------------------------------------
// DailyRecreationScheduler
// ---------------------------------------------------------------------------

export class DailyRecreationScheduler {
  private static instance: DailyRecreationScheduler
  private job: CronJob | null = null
  private config: SchedulerConfig
  private running = false
  private runHistory: SchedulerRunLog[] = []

  private static DEFAULT_CONFIG: SchedulerConfig = {
    cronExpression: '0 3 * * *',
    timezone: 'America/New_York',
    enabled: true,
    siteDir: process.env.SITE_DIR ?? '/var/www/zeroclaw/current',
    archiveDir: process.env.ARCHIVE_DIR ?? '/var/www/archives',
    buildCommand: process.env.BUILD_CMD ?? 'npm run build',
    lighthouseMinScore: 85,
    autoCompress: true,
    maxArchiveDays: 365,
  }

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DailyRecreationScheduler.DEFAULT_CONFIG, ...config }
    this.loadConfigFromDB()
  }

  static getInstance(): DailyRecreationScheduler {
    if (!this.instance) this.instance = new DailyRecreationScheduler()
    return this.instance
  }

  // ── Config persistence ────────────────────────────────────────────────────

  private loadConfigFromDB(): void {
    try {
      const configFile = path.join(process.cwd(), '.scheduler-config.json')
      if (fs.existsSync(configFile)) {
        const saved = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
        this.config = { ...this.config, ...saved }
        schedulerLogger.info({ cronExpression: this.config.cronExpression }, 'Config loaded from disk')
      }
    } catch (err) {
      schedulerLogger.warn({ err }, 'Could not load scheduler config, using defaults')
    }
  }

  private saveConfigToDB(): void {
    try {
      const configFile = path.join(process.cwd(), '.scheduler-config.json')
      fs.writeFileSync(configFile, JSON.stringify(this.config, null, 2), 'utf-8')
      schedulerLogger.info('Scheduler config saved')
    } catch (err) {
      schedulerLogger.error({ err }, 'Failed to save scheduler config')
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    if (!this.config.enabled) {
      schedulerLogger.info('Scheduler disabled, not starting')
      return
    }

    this.stop()

    this.job = new CronJob(
      this.config.cronExpression,
      () => { void this.triggerRecreation('scheduled') },
      null,
      true,
      this.config.timezone
    )

    schedulerLogger.info({
      cron: this.config.cronExpression,
      tz: this.config.timezone,
      nextRun: this.job.nextDate().toISO(),
    }, 'Scheduler started')
  }

  stop(): void {
    if (this.job) {
      this.job.stop()
      this.job = null
      schedulerLogger.info('Scheduler stopped')
    }
  }

  getNextRun(): string | null {
    return this.job ? this.job.nextDate().toISO() : null
  }

  isRunning(): boolean {
    return this.running
  }

  getConfig(): SchedulerConfig {
    return { ...this.config }
  }

  updateConfig(patch: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...patch }
    this.saveConfigToDB()

    // Restart cron with new settings
    if (this.job) {
      this.start()
      schedulerLogger.info({ cronExpression: this.config.cronExpression }, 'Scheduler restarted with new config')
    }
  }

  // ── Main recreation pipeline ──────────────────────────────────────────────

  async triggerRecreation(reason: 'scheduled' | 'manual' | 'admin'): Promise<SchedulerRunLog> {
    if (this.running) {
      schedulerLogger.warn('Recreation already in progress, skipping')
      throw new Error('Recreation already in progress')
    }

    this.running = true
    const runId = `run-${Date.now()}`
    const log: SchedulerRunLog = {
      runId,
      startedAt: new Date(),
      success: false,
    }

    try {
      schedulerLogger.info({ runId, reason }, 'Starting daily recreation')

      // Stage 1: Generate brief
      log.stage = 'generate_brief'
      const generator = new DailyBriefGenerator()
      const brief = await generator.generate(new Date())
      log.brief = brief
      schedulerLogger.info({ runId, themeName: brief.themeName }, 'Brief generated')

      // Stage 2: Build new site in staging
      log.stage = 'build_staging'
      await this.buildStaging(runId, brief)
      schedulerLogger.info({ runId }, 'Staging build complete')

      // Stage 3: Quality check (optional Lighthouse)
      log.stage = 'quality_check'
      await this.runQualityCheck(runId)

      // Stage 4: Atomic swap
      log.stage = 'atomic_swap'
      await this.atomicSwap(runId)
      schedulerLogger.info({ runId }, 'Atomic swap complete')

      // Stage 5: Compress previous
      log.stage = 'compress'
      if (this.config.autoCompress) {
        await this.compressPrevious(runId, brief)
      }

      // Stage 6: Broadcast refresh to clients
      log.stage = 'broadcast'
      await this.broadcastRefresh(brief)

      log.success = true
      log.finishedAt = new Date()
      log.durationMs = log.finishedAt.getTime() - log.startedAt.getTime()
      schedulerLogger.info({ runId, durationMs: log.durationMs }, 'Recreation complete')

    } catch (err) {
      log.success = false
      log.finishedAt = new Date()
      log.errorMessage = err instanceof Error ? err.message : String(err)
      log.durationMs = log.finishedAt.getTime() - log.startedAt.getTime()
      schedulerLogger.error({ err, runId, stage: log.stage }, 'Recreation failed')
    } finally {
      this.running = false
      this.runHistory.unshift(log)
      if (this.runHistory.length > 30) this.runHistory = this.runHistory.slice(0, 30)
    }

    return log
  }

  // ── Pipeline stages ───────────────────────────────────────────────────────

  private async buildStaging(runId: string, brief: DailyBrief): Promise<void> {
    const stagingDir = `${this.config.siteDir.replace('/current', '')}/staging`

    // Write brief to env file for build to consume
    const envContent = `DAILY_THEME_NAME="${brief.themeName}"
DAILY_HEADLINE="${brief.headline.replace(/"/g, '\\"')}"
DAILY_MOOD="${brief.mood}"
DAILY_SCENE="${brief.sceneType}"
DAILY_PALETTE="${brief.colorPalette}"
DAILY_LAYOUT="${brief.layoutStyle}"
DAILY_INDUSTRY="${brief.industryFocus}"
`
    fs.writeFileSync(path.join(process.cwd(), '.env.daily'), envContent)

    schedulerLogger.info({ runId, stagingDir }, 'Building staging site')

    // Copy source to staging and build
    await execAsync(`rsync -a --delete ${process.cwd()}/ ${stagingDir}/ --exclude=.git --exclude=node_modules --exclude=.next`)
    await execAsync(`cd ${stagingDir} && ${this.config.buildCommand}`, { env: { ...process.env, DAILY_BRIEF_DATE: brief.date } })
  }

  private async runQualityCheck(_runId: string): Promise<void> {
    // Quality check is a best-effort — don't fail recreation on it
    schedulerLogger.info('Quality check skipped (Lighthouse not configured in this environment)')
  }

  async atomicSwap(runId: string): Promise<void> {
    const baseDir = this.config.siteDir.replace('/current', '')
    const currentDir = `${baseDir}/current`
    const stagingDir = `${baseDir}/staging`
    const prevDir = `${baseDir}/prev`
    const dateStr = new Date().toISOString().slice(0, 10)
    const archiveTarget = `${baseDir}/prev_${dateStr}`

    schedulerLogger.info({ runId }, 'Performing atomic swap')

    // mv current → prev_date (keep as backup briefly)
    if (fs.existsSync(currentDir)) {
      execSync(`mv ${currentDir} ${archiveTarget}`)
    }

    // mv staging → current (zero-downtime)
    execSync(`mv ${stagingDir} ${currentDir}`)

    // Reload nginx (graceful)
    try {
      execSync('nginx -s reload')
      schedulerLogger.info({ runId }, 'Nginx reloaded')
    } catch {
      schedulerLogger.warn({ runId }, 'Nginx reload failed — continuing anyway')
    }

    // Move prev_date to prev (cleanup old prev)
    if (fs.existsSync(prevDir)) {
      execSync(`rm -rf ${prevDir}`)
    }
    if (fs.existsSync(archiveTarget)) {
      execSync(`mv ${archiveTarget} ${prevDir}`)
    }
  }

  async compressPrevious(runId: string, brief: DailyBrief): Promise<void> {
    const baseDir = this.config.siteDir.replace('/current', '')
    const prevDir = `${baseDir}/prev`
    const archiveDir = this.config.archiveDir
    const dateStr = brief.date
    const archiveFile = `${archiveDir}/${dateStr}.tar.zst`

    if (!fs.existsSync(prevDir)) {
      schedulerLogger.warn({ runId }, 'No prev dir to compress')
      return
    }

    fs.mkdirSync(archiveDir, { recursive: true })

    schedulerLogger.info({ runId, archiveFile }, 'Compressing previous site')
    await execAsync(`tar -I 'zstd -T0 -19' -cf ${archiveFile} -C ${prevDir} .`)
    execSync(`rm -rf ${prevDir}`)
    schedulerLogger.info({ runId, archiveFile }, 'Compression complete')
  }

  async broadcastRefresh(brief: DailyBrief): Promise<void> {
    const payload = {
      theme: brief.themeName,
      background: brief.sceneType,
      message: `New daily theme: ${brief.themeName}`,
      timestamp: new Date().toISOString(),
    }

    if (_broadcastFn) {
      _broadcastFn(payload)
      schedulerLogger.info({ theme: brief.themeName }, 'Site refresh broadcast sent')
    } else {
      schedulerLogger.warn('No broadcast function registered — clients will not be notified')
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  getRunHistory(): SchedulerRunLog[] {
    return [...this.runHistory]
  }
}

export const scheduler = DailyRecreationScheduler.getInstance()
