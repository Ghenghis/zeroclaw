// lib/timewarp/TimeWarpServer.ts
// Manages on-demand decompression and preview serving of archived sites.
// Each date gets its own port in pool 4000-4099.

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import net from 'net'
import { timeWarpLogger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PreviewSession {
  date: string
  port: number
  dir: string
  pid: number | null
  lastAccess: number
  ready: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT_POOL_START = 4000
const PORT_POOL_END = 4099
const MAX_PREVIEWS = 10
const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const TIMEWARP_BASE_DIR = process.env.TIMEWARP_DIR ?? '/tmp/timewarp'
const ARCHIVE_DIR = process.env.ARCHIVE_DIR ?? '/var/www/archives'

// ---------------------------------------------------------------------------
// TimeWarpServer
// ---------------------------------------------------------------------------

export class TimeWarpServer {
  private static instance: TimeWarpServer
  private sessions: Map<string, PreviewSession> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  static getInstance(): TimeWarpServer {
    if (!this.instance) {
      this.instance = new TimeWarpServer()
      this.instance.startCleanupLoop()
    }
    return this.instance
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getOrStartPreview(date: string): Promise<{ url: string; port: number; fromCache: boolean }> {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid date format: ${date} (expected YYYY-MM-DD)`)
    }

    // Return existing session if available
    const existing = this.sessions.get(date)
    if (existing && existing.ready) {
      existing.lastAccess = Date.now()
      timeWarpLogger.debug({ date, port: existing.port }, 'TimeWarp cache hit')
      return { url: `http://localhost:${existing.port}`, port: existing.port, fromCache: true }
    }

    // Find the archive
    const archivePath = this.findArchive(date)
    if (!archivePath) {
      throw new Error(`No archive found for date: ${date}`)
    }

    // Enforce max concurrent previews
    if (this.sessions.size >= MAX_PREVIEWS) {
      this.evictOldestSession()
    }

    // Allocate port
    const port = await this.allocatePort()

    // Create preview directory
    const previewDir = path.join(TIMEWARP_BASE_DIR, date)
    fs.mkdirSync(previewDir, { recursive: true })

    const session: PreviewSession = {
      date,
      port,
      dir: previewDir,
      pid: null,
      lastAccess: Date.now(),
      ready: false,
    }
    this.sessions.set(date, session)

    // Decompress archive
    timeWarpLogger.info({ date, port, archivePath }, 'Starting TimeWarp preview')
    await this.decompressArchive(archivePath, previewDir)

    // Start static file server
    const pid = await this.startStaticServer(previewDir, port)
    session.pid = pid
    session.ready = true

    // Wait for server to be ready
    await this.waitForPort(port, 10_000)

    timeWarpLogger.info({ date, port, pid }, 'TimeWarp preview ready')
    return { url: `http://localhost:${port}`, port, fromCache: false }
  }

  async stopPreview(date: string): Promise<void> {
    const session = this.sessions.get(date)
    if (!session) return

    this.killSession(session)
    this.sessions.delete(date)
    timeWarpLogger.info({ date }, 'TimeWarp preview stopped')
  }

  listActivePreviews(): Array<{ date: string; port: number; idleSec: number }> {
    const now = Date.now()
    return Array.from(this.sessions.values()).map(s => ({
      date: s.date,
      port: s.port,
      idleSec: Math.floor((now - s.lastAccess) / 1000),
    }))
  }

  // ── Archive helpers ───────────────────────────────────────────────────────

  findArchive(date: string): string | null {
    const archivePath = path.join(ARCHIVE_DIR, `${date}.tar.zst`)
    if (fs.existsSync(archivePath)) return archivePath

    // Also check .tar.gz as fallback
    const gzPath = path.join(ARCHIVE_DIR, `${date}.tar.gz`)
    if (fs.existsSync(gzPath)) return gzPath

    return null
  }

  listAvailableDates(): string[] {
    if (!fs.existsSync(ARCHIVE_DIR)) return []
    return fs.readdirSync(ARCHIVE_DIR)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.(tar\.zst|tar\.gz)$/))
      .map(f => f.replace(/\.(tar\.zst|tar\.gz)$/, ''))
      .sort()
      .reverse() // newest first
  }

  // ── Port management ───────────────────────────────────────────────────────

  async allocatePort(): Promise<number> {
    const usedPorts = new Set(Array.from(this.sessions.values()).map(s => s.port))

    for (let port = PORT_POOL_START; port <= PORT_POOL_END; port++) {
      if (usedPorts.has(port)) continue
      if (await this.isPortFree(port)) return port
    }

    throw new Error('No ports available in TimeWarp pool (4000-4099)')
  }

  private isPortFree(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = net.createServer()
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true))
      })
      server.on('error', () => resolve(false))
    })
  }

  // ── Decompression ─────────────────────────────────────────────────────────

  private async decompressArchive(archivePath: string, targetDir: string): Promise<void> {
    timeWarpLogger.info({ archivePath, targetDir }, 'Decompressing archive')

    if (archivePath.endsWith('.tar.zst')) {
      execSync(`tar -I 'zstd -d' -xf ${archivePath} -C ${targetDir}`)
    } else if (archivePath.endsWith('.tar.gz')) {
      execSync(`tar -xzf ${archivePath} -C ${targetDir}`)
    } else {
      throw new Error(`Unknown archive format: ${archivePath}`)
    }
  }

  // ── Static server ─────────────────────────────────────────────────────────

  private startStaticServer(dir: string, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      // Serve the .next/static output or fallback to out/ directory
      const serveDir = fs.existsSync(path.join(dir, 'out'))
        ? path.join(dir, 'out')
        : dir

      // Use npx serve (simple static server)
      const child = spawn('npx', ['serve', '-l', String(port), serveDir], {
        detached: true,
        stdio: 'ignore',
      })

      child.on('error', reject)
      child.on('spawn', () => {
        child.unref()
        resolve(child.pid ?? -1)
      })
    })
  }

  // ── Wait for port ─────────────────────────────────────────────────────────

  async waitForPort(port: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const ready = await new Promise<boolean>(resolve => {
        const socket = net.createConnection({ port, host: '127.0.0.1' })
        socket.on('connect', () => { socket.destroy(); resolve(true) })
        socket.on('error', () => { socket.destroy(); resolve(false) })
      })
      if (ready) return
      await new Promise(r => setTimeout(r, 200))
    }
    throw new Error(`Port ${port} not ready after ${timeoutMs}ms`)
  }

  // ── Cleanup loop ──────────────────────────────────────────────────────────

  startCleanupLoop(): void {
    if (this.cleanupInterval) return
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [date, session] of this.sessions.entries()) {
        if (now - session.lastAccess > IDLE_TIMEOUT_MS) {
          timeWarpLogger.info({ date, port: session.port }, 'Evicting idle TimeWarp session')
          this.killSession(session)
          this.sessions.delete(date)
        }
      }
    }, 60_000) // check every minute
  }

  private killSession(session: PreviewSession): void {
    if (session.pid) {
      try { process.kill(session.pid, 'SIGTERM') } catch { /* already dead */ }
    }
    try {
      if (fs.existsSync(session.dir)) {
        execSync(`rm -rf ${session.dir}`)
      }
    } catch { /* ignore */ }
  }

  private evictOldestSession(): void {
    let oldest: PreviewSession | null = null
    for (const session of this.sessions.values()) {
      if (!oldest || session.lastAccess < oldest.lastAccess) {
        oldest = session
      }
    }
    if (oldest) {
      this.killSession(oldest)
      this.sessions.delete(oldest.date)
    }
  }

  stopCleanupLoop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export const timeWarpServer = TimeWarpServer.getInstance()
