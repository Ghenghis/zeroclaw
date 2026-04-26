// lib/logger.ts
// Structured pino logger for all DaveAI systems
// Used by: theme engine, backgrounds, scheduler, stats, arcade, agent pipeline

import pino from 'pino'
import { join } from 'path'

const isDev = process.env.NODE_ENV !== 'production'
const LOG_DIR = process.env.LOG_DIR ?? join(process.cwd(), '..', 'logs')
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

function buildTransport() {
  if (isDev) {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '[{system}] {msg}',
      },
    }
  }

  // Production: split to main log + errors log
  return {
    targets: [
      {
        target: 'pino/file',
        level: LOG_LEVEL,
        options: {
          destination: join(LOG_DIR, 'daveai.log'),
          mkdir: true,
        },
      },
      {
        target: 'pino/file',
        level: 'error',
        options: {
          destination: join(LOG_DIR, 'errors.log'),
          mkdir: true,
        },
      },
    ],
  }
}

export const logger = pino({
  level: LOG_LEVEL,
  transport: buildTransport() as any,
  base: { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
})

// ── Subsystem child loggers ─────────────────────────────────────────
// Each major system gets its own child logger with a 'system' field
// This allows filtering logs by system in production

export const themeLogger     = logger.child({ system: 'theme-engine' })
export const bgLogger        = logger.child({ system: 'background' })
export const schedulerLogger = logger.child({ system: 'scheduler' })
export const agentLogger     = logger.child({ system: 'agent-bg' })
export const statsLogger     = logger.child({ system: 'stats' })
export const arcadeLogger    = logger.child({ system: 'arcade' })
export const storageLogger   = logger.child({ system: 'storage' })
export const timeWarpLogger  = logger.child({ system: 'timewarp' })
export const qualityLogger   = logger.child({ system: 'quality' })

// ── Log level helpers ───────────────────────────────────────────────
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// Utility: log with structured context
export function logWithContext(
  log: pino.Logger,
  level: LogLevel,
  msg: string,
  ctx: Record<string, unknown> = {}
) {
  log[level](ctx, msg)
}
