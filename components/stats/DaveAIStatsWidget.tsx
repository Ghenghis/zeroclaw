'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DaveAIStats } from '@/lib/stats/StatsCollector'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
  return `${(bytes / 1024 ** 3).toFixed(2)}GB`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const MAX_BACKOFF = 30_000

// ── DaveAIStatsWidget ─────────────────────────────────────────────────────────

export default function DaveAIStatsWidget() {
  const [expanded, setExpanded] = useState(false)
  const [stats, setStats] = useState<DaveAIStats | null>(null)
  const [clock, setClock] = useState('')
  const esRef = useRef<EventSource | null>(null)
  const backoffRef = useRef(1000)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // SSE stats stream
  const connect = useCallback(() => {
    esRef.current?.close()
    const es = new EventSource('/api/stats/stream')
    esRef.current = es

    es.addEventListener('stats', (e) => {
      backoffRef.current = 1000
      try { setStats(JSON.parse((e as MessageEvent).data) as DaveAIStats) } catch { /* ignore */ }
    })

    es.onerror = () => {
      es.close()
      esRef.current = null
      const delay = Math.min(backoffRef.current, MAX_BACKOFF)
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      retryRef.current = setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connect])

  const storagePct = stats ? Math.min(100, (stats.storage.used / stats.storage.total) * 100) : 0
  const storageColor = storagePct > 90 ? 'bg-red-500' : storagePct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
  const runningAgents = stats?.agents.filter(a => a.status === 'running').length ?? 0
  const totalAgents = stats?.agents.length ?? 0

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/60 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl select-none transition-all duration-300">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left focus:outline-none"
        aria-label={expanded ? 'Collapse DaveAI stats' : 'Expand DaveAI stats'}
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="font-mono text-sm text-white/90 tabular-nums">{clock}</span>
          <span className="w-px h-4 bg-white/20" />
          {stats ? (
            <>
              <span className="text-xs text-emerald-400">{runningAgents}/{totalAgents} agents</span>
              <span className="w-px h-4 bg-white/20" />
              <span className="text-xs text-blue-400">{stats.timewarp.commitsToday} commits</span>
              <span className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${storageColor}`} style={{ width: `${storagePct}%` }} />
                </div>
                <span className="text-[10px] text-white/40">{storagePct.toFixed(0)}%</span>
              </div>
            </>
          ) : (
            <span className="text-xs text-white/30 animate-pulse">connecting…</span>
          )}
        </div>
      </button>

      {/* Expanded panel */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-white/10" />
        {stats ? (
          <div className="px-3 pb-3 pt-1 space-y-3 min-w-64">
            {/* TimeWarp */}
            <section>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">TimeWarp</p>
              <div className="space-y-0.5">
                <Row label="Total commits" value={stats.timewarp.totalCommits.toLocaleString()} />
                <Row label="Today" value={stats.timewarp.commitsToday} accent="text-blue-300" />
                <Row label="Repo age" value={stats.timewarp.repoAge} />
                <Row label="Peak hour" value={`${stats.timewarp.mostActiveHour}:00 UTC`} />
              </div>
            </section>

            {/* Agents */}
            <section>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Agents</p>
              {stats.agents.map(a => (
                <div key={a.name} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'running' ? 'bg-emerald-400 animate-pulse' : a.status === 'idle' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-white/70">{a.name}</span>
                  </div>
                  <span className={`text-xs font-mono ${a.status === 'running' ? 'text-emerald-400' : a.status === 'idle' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </section>

            {/* Storage */}
            <section>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Storage — {stats.storage.label}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${storageColor}`} style={{ width: `${storagePct}%` }} />
                </div>
                <span className="text-xs text-white/50 font-mono tabular-nums">
                  {formatBytes(stats.storage.used)} / {formatBytes(stats.storage.total)}
                </span>
              </div>
            </section>

            {/* Current task */}
            {stats.currentTask && (
              <section>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Current Task</p>
                <p className="text-xs text-white/70 truncate">{stats.currentTask}</p>
              </section>
            )}

            {/* Theme */}
            <Row label="Theme" value={stats.theme} accent="text-purple-300" />
            <Row label="Uptime" value={formatUptime(stats.uptime)} />
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-xs text-white/30 animate-pulse">Loading stats…</div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, accent = 'text-white' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-white/50 text-xs">{label}</span>
      <span className={`text-xs font-mono font-semibold ${accent}`}>{value}</span>
    </div>
  )
}
