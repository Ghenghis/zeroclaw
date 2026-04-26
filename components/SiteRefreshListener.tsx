'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

interface SiteEvent {
  theme?: string
  background?: string
  message?: string
  timestamp?: string
}

const COUNTDOWN_SECONDS = 60
const MAX_BACKOFF = 30_000

// ── Component ─────────────────────────────────────────────────────────────────

export default function SiteRefreshListener() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [event, setEvent] = useState<SiteEvent | null>(null)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const esRef = useRef<EventSource | null>(null)
  const backoffRef = useRef<number>(1000)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownValueRef = useRef<number>(COUNTDOWN_SECONDS)

  const doRefresh = useCallback(() => {
    setVisible(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
    router.refresh()
  }, [router])

  const dismiss = useCallback(() => {
    setVisible(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const showToast = useCallback((siteEvent: SiteEvent) => {
    setEvent(siteEvent)
    setVisible(true)
    countdownValueRef.current = COUNTDOWN_SECONDS
    setCountdown(COUNTDOWN_SECONDS)
    if (countdownRef.current) clearInterval(countdownRef.current)

    countdownRef.current = setInterval(() => {
      countdownValueRef.current -= 1
      setCountdown(countdownValueRef.current)
      if (countdownValueRef.current <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        doRefresh()
      }
    }, 1000)
  }, [doRefresh])

  const connect = useCallback(() => {
    esRef.current?.close()
    const es = new EventSource('/api/events/site')
    esRef.current = es

    es.onmessage = (e) => {
      backoffRef.current = 1000
      try { showToast(JSON.parse(e.data) as SiteEvent) } catch { /* malformed */ }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      const delay = Math.min(backoffRef.current, MAX_BACKOFF)
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      retryRef.current = setTimeout(connect, delay)
    }
  }, [showToast])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [connect])

  if (!visible || !event) return null

  const pct = (countdown / COUNTDOWN_SECONDS) * 100
  const barColor = countdown <= 10 ? 'bg-red-500' : countdown <= 30 ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-black/80 border border-white/20 rounded-xl backdrop-blur-md shadow-2xl w-full max-w-sm px-4 pt-4 pb-3"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Site update available</p>
          {event.message && <p className="text-xs text-white/60 mt-0.5 truncate">{event.message}</p>}
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {event.theme && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 rounded-full px-2 py-0.5">
                Theme: {event.theme}
              </span>
            )}
            {event.background && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 rounded-full px-2 py-0.5">
                BG: {event.background}
              </span>
            )}
          </div>
        </div>
        <button onClick={dismiss} className="text-white/30 hover:text-white/70 transition-colors" aria-label="Dismiss">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-3">
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-white/30 mt-1 text-right">Auto-refresh in {countdown}s</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={doRefresh}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
        >
          Refresh Now
        </button>
        <button
          onClick={dismiss}
          className="px-3 py-2 text-xs text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/5"
        >
          Later
        </button>
      </div>
    </div>
  )
}
