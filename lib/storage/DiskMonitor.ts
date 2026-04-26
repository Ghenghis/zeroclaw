// lib/storage/DiskMonitor.ts
// Monitors disk usage on the VPS and triggers cleanup when thresholds exceeded.

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { storageLogger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WARN_THRESHOLD = 0.80    // 80% used → warn
const DANGER_THRESHOLD = 0.90  // 90% used → emergency cleanup

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiskStatus {
  mountPoint: string
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usedPercent: number
  warningLevel: 'ok' | 'warn' | 'danger'
  archiveCount: number
  oldestArchiveDate: string | null
  archiveDirBytes: number
}

// ---------------------------------------------------------------------------
// DiskMonitor
// ---------------------------------------------------------------------------

export class DiskMonitor {
  private archiveDir: string
  private maxArchiveDays: number

  constructor(options?: { archiveDir?: string; maxArchiveDays?: number }) {
    this.archiveDir = options?.archiveDir ?? process.env.ARCHIVE_DIR ?? '/var/www/archives'
    this.maxArchiveDays = options?.maxArchiveDays ?? 365
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getStatus(): DiskStatus {
    let totalBytes = 200 * 1024 ** 3
    let usedBytes = 0
    let freeBytes = totalBytes

    try {
      const output = execSync("df -B1 / | tail -1").toString().trim()
      const parts = output.split(/\s+/)
      totalBytes = parseInt(parts[1], 10) || totalBytes
      usedBytes = parseInt(parts[2], 10) || 0
      freeBytes = parseInt(parts[3], 10) || (totalBytes - usedBytes)
    } catch {
      // Windows dev: use simulated values
      usedBytes = 10 * 1024 ** 3
      freeBytes = totalBytes - usedBytes
    }

    const usedPercent = totalBytes > 0 ? usedBytes / totalBytes : 0
    const warningLevel: DiskStatus['warningLevel'] =
      usedPercent >= DANGER_THRESHOLD ? 'danger' :
      usedPercent >= WARN_THRESHOLD   ? 'warn'   : 'ok'

    // Archive stats
    const archives = this.listArchives()
    const archiveDirBytes = this.getArchiveDirSize()

    return {
      mountPoint: '/',
      totalBytes,
      usedBytes,
      freeBytes,
      usedPercent,
      warningLevel,
      archiveCount: archives.length,
      oldestArchiveDate: archives.length > 0 ? archives[0].date : null,
      archiveDirBytes,
    }
  }

  // ── Check and alert ───────────────────────────────────────────────────────

  async checkAndAlert(): Promise<void> {
    const status = this.getStatus()

    if (status.warningLevel === 'danger') {
      storageLogger.error({
        usedPercent: (status.usedPercent * 100).toFixed(1),
        freeGB: (status.freeBytes / 1024 ** 3).toFixed(2),
      }, '🚨 EMERGENCY: Disk usage critical — starting emergency cleanup')
      await this.emergencyCleanup()

    } else if (status.warningLevel === 'warn') {
      storageLogger.warn({
        usedPercent: (status.usedPercent * 100).toFixed(1),
        freeGB: (status.freeBytes / 1024 ** 3).toFixed(2),
      }, '⚠️  Disk usage warning — starting routine cleanup')
      await this.routineCleanup()

    } else {
      storageLogger.debug({
        usedPercent: (status.usedPercent * 100).toFixed(1),
        archiveCount: status.archiveCount,
      }, 'Disk OK')
    }
  }

  // ── Routine cleanup: remove archives older than maxArchiveDays ────────────

  async routineCleanup(): Promise<void> {
    const archives = this.listArchives()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - this.maxArchiveDays)

    let removed = 0
    for (const archive of archives) {
      const archiveDate = new Date(archive.date)
      if (archiveDate < cutoff) {
        try {
          fs.unlinkSync(archive.filePath)
          storageLogger.info({ file: archive.filePath, date: archive.date }, 'Removed old archive')
          removed++
        } catch (err) {
          storageLogger.error({ err, file: archive.filePath }, 'Failed to remove archive')
        }
      }
    }

    storageLogger.info({ removed }, 'Routine cleanup complete')
  }

  // ── Emergency cleanup: remove oldest archives until below WARN ────────────

  async emergencyCleanup(): Promise<void> {
    storageLogger.warn('Emergency cleanup started')
    let iterations = 0
    const MAX_ITERATIONS = 50

    while (iterations++ < MAX_ITERATIONS) {
      const status = this.getStatus()
      if (status.usedPercent < WARN_THRESHOLD) {
        storageLogger.info({ iterations }, 'Emergency cleanup: disk usage now safe')
        break
      }

      const oldest = this.getOldestArchive()
      if (!oldest) {
        storageLogger.error('Emergency cleanup: no more archives to remove!')
        break
      }

      try {
        fs.unlinkSync(oldest)
        storageLogger.warn({ file: oldest }, 'Emergency cleanup: removed oldest archive')
      } catch (err) {
        storageLogger.error({ err, file: oldest }, 'Emergency cleanup: failed to remove archive')
        break
      }
    }
  }

  // ── Archive helpers ───────────────────────────────────────────────────────

  listArchives(): Array<{ date: string; filePath: string; sizeBytes: number }> {
    if (!fs.existsSync(this.archiveDir)) return []

    try {
      const files = fs.readdirSync(this.archiveDir)
        .filter(f => f.endsWith('.tar.zst'))
        .map(f => {
          const filePath = path.join(this.archiveDir, f)
          const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/)
          const date = dateMatch?.[1] ?? '1970-01-01'
          let sizeBytes = 0
          try { sizeBytes = fs.statSync(filePath).size } catch { /* ignore */ }
          return { date, filePath, sizeBytes }
        })
        .sort((a, b) => a.date.localeCompare(b.date)) // oldest first

      return files
    } catch {
      return []
    }
  }

  getOldestArchive(): string | null {
    const archives = this.listArchives()
    return archives.length > 0 ? archives[0].filePath : null
  }

  getArchiveDirSize(): number {
    if (!fs.existsSync(this.archiveDir)) return 0
    try {
      const output = execSync(`du -sb ${this.archiveDir} 2>/dev/null || echo "0"`).toString().trim()
      return parseInt(output.split('\t')[0], 10) || 0
    } catch {
      return 0
    }
  }
}

export const diskMonitor = new DiskMonitor()
