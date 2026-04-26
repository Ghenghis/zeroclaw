// app/api/stats/stream/route.ts
// SSE endpoint streaming DaveAI live stats every 5 seconds.

import { collectStats } from '@/lib/stats/StatsCollector'
import { statsLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATS_INTERVAL_MS = 5_000
const HEARTBEAT_INTERVAL_MS = 30_000

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder()
  let statsTimer: ReturnType<typeof setInterval> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      statsLogger.debug('Stats SSE client connected')

      function send(event: string, data: unknown): void {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // Send initial stats immediately
      try {
        const stats = await collectStats()
        send('stats', stats)
      } catch (err) {
        statsLogger.error({ err }, 'Failed to collect initial stats')
        send('error', { message: 'Failed to load stats' })
      }

      // Stats every 5s
      statsTimer = setInterval(async () => {
        try {
          const stats = await collectStats()
          send('stats', stats)
        } catch (err) {
          statsLogger.warn({ err }, 'Stats collection error')
        }
      }, STATS_INTERVAL_MS)

      // Heartbeat every 30s to keep connection alive
      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`))
      }, HEARTBEAT_INTERVAL_MS)

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        if (statsTimer) clearInterval(statsTimer)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        try { controller.close() } catch { /* already closed */ }
        statsLogger.debug('Stats SSE client disconnected')
      })
    },

    cancel() {
      if (statsTimer) clearInterval(statsTimer)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
