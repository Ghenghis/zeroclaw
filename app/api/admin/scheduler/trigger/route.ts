// app/api/admin/scheduler/trigger/route.ts
// POST: Manually trigger the daily recreation pipeline immediately.

import { NextRequest, NextResponse } from 'next/server'
import { scheduler } from '@/lib/daily/DailyRecreationScheduler'
import { schedulerLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({})) as { reason?: string }
    const reason = body?.reason === 'admin' ? 'admin' : 'manual'

    schedulerLogger.info({ reason }, 'Manual recreation trigger requested')

    if (scheduler.isRunning()) {
      return NextResponse.json(
        { error: 'Recreation is already in progress. Please wait for it to complete.' },
        { status: 409 }
      )
    }

    // Run async but return immediately with a run ID
    const runPromise = scheduler.triggerRecreation(reason as 'manual' | 'admin')

    // Return 202 Accepted with a polling hint
    const startTime = new Date().toISOString()

    // Wait briefly to see if it fails immediately
    const result = await Promise.race([
      runPromise,
      new Promise<null>(r => setTimeout(() => r(null), 3000))
    ])

    if (result === null) {
      // Still running after 3s — return accepted
      return NextResponse.json({
        accepted: true,
        message: 'Recreation pipeline started. Check /api/admin/scheduler for status.',
        startedAt: startTime,
        statusUrl: '/api/admin/scheduler',
      }, { status: 202 })
    }

    // Completed within 3s (unlikely but possible for quick failures)
    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      durationMs: result.durationMs,
      themeName: result.brief?.themeName,
      errorMessage: result.errorMessage,
    }, { status: result.success ? 200 : 500 })

  } catch (err) {
    schedulerLogger.error({ err }, 'Failed to trigger recreation')
    return NextResponse.json(
      { error: 'Failed to trigger recreation', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
