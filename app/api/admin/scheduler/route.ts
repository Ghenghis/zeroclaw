// app/api/admin/scheduler/route.ts
// GET: Get current scheduler config and status.
// PATCH: Update scheduler config (cron, timezone, enabled, etc.)

import { NextRequest, NextResponse } from 'next/server'
import { scheduler } from '@/lib/daily/DailyRecreationScheduler'
import { schedulerLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Validate cron expression (basic 5-field check)
function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  // Each part must be a valid cron field
  const fieldPattern = /^(\*|(\d+(-\d+)?(,\d+(-\d+)?)*)(\/\d+)?|(\d+|\*)\/\d+)$/
  return parts.every(p => fieldPattern.test(p))
}

// GET /api/admin/scheduler
export async function GET(): Promise<NextResponse> {
  try {
    const config = scheduler.getConfig()
    const nextRun = scheduler.getNextRun()
    const isRunning = scheduler.isRunning()
    const history = scheduler.getRunHistory()

    return NextResponse.json({
      config,
      status: {
        jobActive: nextRun !== null,
        currentlyRunning: isRunning,
        nextRun,
      },
      recentRuns: history.slice(0, 10).map(r => ({
        runId: r.runId,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        success: r.success,
        stage: r.stage,
        errorMessage: r.errorMessage,
        durationMs: r.durationMs,
        themeName: r.brief?.themeName,
      })),
    })
  } catch (err) {
    schedulerLogger.error({ err }, 'Failed to get scheduler status')
    return NextResponse.json({ error: 'Failed to get scheduler status' }, { status: 500 })
  }
}

// PATCH /api/admin/scheduler
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Record<string, unknown>

    // Validate cron if provided
    if (typeof body.cronExpression === 'string') {
      if (!isValidCron(body.cronExpression)) {
        return NextResponse.json(
          { error: `Invalid cron expression: "${body.cronExpression}". Expected 5-field format like "0 3 * * *"` },
          { status: 400 }
        )
      }
    }

    // Validate timezone if provided
    if (typeof body.timezone === 'string') {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: body.timezone })
      } catch {
        return NextResponse.json(
          { error: `Invalid timezone: "${body.timezone}"` },
          { status: 400 }
        )
      }
    }

    // Sanitize patch — only allow known config keys
    const patch: Record<string, unknown> = {}
    const allowedKeys = [
      'cronExpression', 'timezone', 'enabled', 'lighthouseMinScore',
      'autoCompress', 'maxArchiveDays', 'buildCommand'
    ]
    for (const key of allowedKeys) {
      if (key in body) patch[key] = body[key]
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    scheduler.updateConfig(patch as Parameters<typeof scheduler.updateConfig>[0])

    schedulerLogger.info({ patch }, 'Scheduler config updated by admin')

    return NextResponse.json({
      success: true,
      config: scheduler.getConfig(),
      nextRun: scheduler.getNextRun(),
    })

  } catch (err) {
    schedulerLogger.error({ err }, 'Failed to update scheduler config')
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
