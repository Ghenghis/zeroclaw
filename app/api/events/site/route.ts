// app/api/events/site/route.ts
// SSE endpoint for site-refresh broadcast events.
// The scheduler calls broadcastSiteRefresh() to notify all connected clients.

import { schedulerLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// In-memory client registry
// ---------------------------------------------------------------------------

type SiteEventClient = {
  id: string
  enqueue: (data: string) => void
  close: () => void
}

const clients = new Map<string, SiteEventClient>()

/**
 * Broadcast a site refresh event to all connected SSE clients.
 * Called by DailyRecreationScheduler after atomic swap completes.
 */
export function broadcastSiteRefresh(data: {
  theme?: string
  background?: string
  message?: string
  timestamp?: string
}): void {
  const payload = JSON.stringify({
    ...data,
    timestamp: data.timestamp ?? new Date().toISOString(),
  })

  const event = `data: ${payload}\n\n`
  let sent = 0

  for (const [id, client] of clients.entries()) {
    try {
      client.enqueue(event)
      sent++
    } catch (err) {
      schedulerLogger.warn({ err, clientId: id }, 'Failed to send to SSE client, removing')
      clients.delete(id)
    }
  }

  schedulerLogger.info({ clientCount: sent, event: data.message }, 'Site refresh broadcast sent')
}

// Register the broadcast function with the scheduler
import('@/lib/daily/DailyRecreationScheduler').then(({ registerBroadcastFn }) => {
  registerBroadcastFn(broadcastSiteRefresh)
}).catch(() => { /* ignore in edge cases */ })

// ---------------------------------------------------------------------------
// SSE Route
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder()
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const stream = new ReadableStream({
    start(controller) {
      schedulerLogger.debug({ clientId }, 'Site event SSE client connected')

      // Send initial ping to confirm connection
      controller.enqueue(
        encoder.encode(`: connected\nid: ${clientId}\n\n`)
      )

      // Register client
      clients.set(clientId, {
        id: clientId,
        enqueue: (data: string) => controller.enqueue(encoder.encode(data)),
        close: () => {
          try { controller.close() } catch { /* ignore */ }
        },
      })

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clients.delete(clientId)
        try { controller.close() } catch { /* already closed */ }
        schedulerLogger.debug({ clientId }, 'Site event SSE client disconnected')
      })
    },

    cancel() {
      clients.delete(clientId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Client-Id': clientId,
    },
  })
}
