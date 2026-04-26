// app/api/commits/stream/route.ts
// SSE endpoint streaming real git commits as they happen.
// CommitComets.tsx subscribes to this to display vapor-trail commit messages.

import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Commit {
  sha: string
  message: string
  author: string
  timestamp: string
}

function getRecentCommits(since?: string): Commit[] {
  try {
    const sinceArg = since ? `--since="${since}"` : '--max-count=5'
    const output = execSync(
      `git log ${sinceArg} --format="%H|%s|%an|%aI" --no-merges 2>/dev/null || echo ""`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim()

    if (!output) return []

    return output.split('\n')
      .filter(Boolean)
      .map(line => {
        const [sha, message, author, timestamp] = line.split('|')
        return { sha: sha?.slice(0, 8) ?? '', message: message ?? '', author: author ?? '', timestamp: timestamp ?? '' }
      })
      .filter(c => c.sha)
  } catch {
    return []
  }
}

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder()
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastSha = ''

  // Get initial SHA
  try {
    lastSha = execSync('git rev-parse HEAD 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim().slice(0, 8)
  } catch { /* ignore */ }

  const stream = new ReadableStream({
    start(controller) {
      function send(commit: Commit) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(commit)}\n\n`))
      }

      // Send recent commits on connect
      const initial = getRecentCommits()
      for (const commit of initial.slice(0, 3)) {
        send(commit)
      }
      if (initial.length > 0) {
        lastSha = initial[0].sha
      }

      // Poll for new commits every 30s
      pollTimer = setInterval(() => {
        try {
          const current = execSync('git rev-parse HEAD 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim().slice(0, 8)
          if (current && current !== lastSha) {
            const newCommits = getRecentCommits()
            const fresh = newCommits.filter(c => c.sha !== lastSha)
            for (const commit of fresh.reverse()) {
              send(commit)
            }
            if (newCommits.length > 0) lastSha = newCommits[0].sha
          }
        } catch { /* ignore git errors */ }
      }, 30_000)

      // Heartbeat every 25s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        if (pollTimer) clearInterval(pollTimer)
        clearInterval(heartbeat)
        try { controller.close() } catch { /* ignore */ }
      })
    },

    cancel() {
      if (pollTimer) clearInterval(pollTimer)
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
