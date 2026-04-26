// app/api/admin/debug/route.ts
// GET: Full system debug snapshot — disk, scheduler, timewarp, games, config.

import { NextResponse } from 'next/server'
import { diskMonitor } from '@/lib/storage/DiskMonitor'
import { scheduler } from '@/lib/daily/DailyRecreationScheduler'
import { timeWarpServer } from '@/lib/timewarp/TimeWarpServer'
import { weekendEngine } from '@/lib/weekend/WeekendModeEngine'
import { collectStats } from '@/lib/stats/StatsCollector'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const startMs = Date.now()

  try {
    const [diskStatus, stats, games] = await Promise.all([
      Promise.resolve(diskMonitor.getStatus()),
      collectStats().catch(err => ({ error: String(err) })),
      weekendEngine.loadGames().catch(() => []),
    ])

    const activePreviews = timeWarpServer.listActivePreviews()
    const availableDates = timeWarpServer.listAvailableDates()
    const schedulerConfig = scheduler.getConfig()
    const schedulerHistory = scheduler.getRunHistory().slice(0, 5)
    const weekendMode = weekendEngine.detectMode()

    const debugPayload = {
      timestamp: new Date().toISOString(),
      queryMs: Date.now() - startMs,

      disk: {
        totalGB: (diskStatus.totalBytes / 1024 ** 3).toFixed(2),
        usedGB: (diskStatus.usedBytes / 1024 ** 3).toFixed(2),
        freeGB: (diskStatus.freeBytes / 1024 ** 3).toFixed(2),
        usedPercent: (diskStatus.usedPercent * 100).toFixed(1),
        warningLevel: diskStatus.warningLevel,
        archiveCount: diskStatus.archiveCount,
        oldestArchiveDate: diskStatus.oldestArchiveDate,
        archiveDirGB: (diskStatus.archiveDirBytes / 1024 ** 3).toFixed(2),
      },

      scheduler: {
        config: {
          cronExpression: schedulerConfig.cronExpression,
          timezone: schedulerConfig.timezone,
          enabled: schedulerConfig.enabled,
          autoCompress: schedulerConfig.autoCompress,
          maxArchiveDays: schedulerConfig.maxArchiveDays,
          lighthouseMinScore: schedulerConfig.lighthouseMinScore,
        },
        status: {
          nextRun: scheduler.getNextRun(),
          isRunning: scheduler.isRunning(),
        },
        recentRuns: schedulerHistory.map(r => ({
          runId: r.runId,
          success: r.success,
          durationMs: r.durationMs,
          stage: r.stage,
          themeName: r.brief?.themeName,
          error: r.errorMessage,
        })),
      },

      timewarp: {
        availableDates: availableDates.slice(0, 30),
        totalArchives: availableDates.length,
        activePreviews,
      },

      weekend: {
        currentMode: weekendMode,
        nextModeChange: weekendEngine.getNextModeChange().toISOString(),
        availableGames: games.length,
        gameGenres: [...new Set(games.map(g => g.genre))],
      },

      stats: 'error' in (stats as Record<string, unknown>)
        ? { error: (stats as Record<string, unknown>).error }
        : stats,

      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryMB: {
          rss: (process.memoryUsage().rss / 1024 ** 2).toFixed(1),
          heapUsed: (process.memoryUsage().heapUsed / 1024 ** 2).toFixed(1),
          heapTotal: (process.memoryUsage().heapTotal / 1024 ** 2).toFixed(1),
        },
      },
    }

    return NextResponse.json(debugPayload)

  } catch (err) {
    return NextResponse.json(
      { error: 'Debug snapshot failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
