// lib/stats/StatsCollector.ts
// Collects live stats for DaveAIStatsWidget SSE stream.

import fs from 'fs'
import path from 'path'
import { statsLogger } from '@/lib/logger'
import { execSync } from 'child_process'

// ---------------------------------------------------------------------------
// Types (must match DaveAIStatsWidget)
// ---------------------------------------------------------------------------

export interface AgentStats {
  name: string
  status: 'running' | 'idle' | 'error'
  tasksCompleted: number
  uptime: number // seconds
}

export interface TimeWarpStats {
  totalCommits: number
  commitsToday: number
  repoAge: string
  mostActiveHour: number
}

export interface StorageStats {
  used: number  // bytes
  total: number // bytes
  label: string
}

export interface DaveAIStats {
  agents: AgentStats[]
  timewarp: TimeWarpStats
  storage: StorageStats
  currentTask: string | null
  theme: string
  background: string
  uptime: number // seconds
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROCESS_START = Date.now()

function getUptimeSeconds(): number {
  return Math.floor((Date.now() - PROCESS_START) / 1000)
}

function getDiskUsage(): { used: number; total: number } {
  try {
    // Works on Linux VPS
    const output = execSync("df -B1 / | tail -1").toString().trim()
    const parts = output.split(/\s+/)
    return {
      total: parseInt(parts[1], 10) || 200 * 1024 ** 3,
      used: parseInt(parts[2], 10) || 0,
    }
  } catch {
    // Fallback for Windows dev
    return { total: 200 * 1024 ** 3, used: 10 * 1024 ** 3 }
  }
}

function getGitStats(): Pick<TimeWarpStats, 'totalCommits' | 'commitsToday' | 'repoAge' | 'mostActiveHour'> {
  try {
    const totalCommits = parseInt(
      execSync('git rev-list --count HEAD 2>/dev/null || echo 0').toString().trim(),
      10
    ) || 0

    const today = new Date().toISOString().slice(0, 10)
    const commitsToday = parseInt(
      execSync(`git log --oneline --after="${today} 00:00" 2>/dev/null | wc -l || echo 0`).toString().trim(),
      10
    ) || 0

    const firstCommit = execSync('git log --reverse --format="%ar" | head -1 2>/dev/null || echo "just now"')
      .toString().trim()

    // Most active hour from git log
    const hourCounts: Record<number, number> = {}
    try {
      const hours = execSync('git log --format="%H" --date=format:"%H" | head -1000 2>/dev/null || echo ""')
        .toString().split('\n').filter(Boolean)
      hours.forEach(h => {
        const hour = parseInt(h, 10)
        if (!isNaN(hour)) hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })
    } catch { /* ignore */ }

    const mostActiveHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '14'

    return {
      totalCommits,
      commitsToday,
      repoAge: firstCommit || 'unknown',
      mostActiveHour: parseInt(mostActiveHour, 10),
    }
  } catch {
    return { totalCommits: 0, commitsToday: 0, repoAge: 'unknown', mostActiveHour: 14 }
  }
}

function getAgentStats(): AgentStats[] {
  // Read agent status from PID files or status directory
  const statusDir = path.join(process.cwd(), '.agent-status')
  const agents: AgentStats[] = []

  // Default agents in the system
  const knownAgents = ['theme-engine', 'scheduler', 'bg-pipeline', 'stats-collector', 'arcade']

  for (const name of knownAgents) {
    const statusFile = path.join(statusDir, `${name}.json`)
    if (fs.existsSync(statusFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
        agents.push({
          name,
          status: data.status ?? 'idle',
          tasksCompleted: data.tasksCompleted ?? 0,
          uptime: data.uptime ?? 0,
        })
      } catch {
        agents.push({ name, status: 'idle', tasksCompleted: 0, uptime: 0 })
      }
    } else {
      agents.push({ name, status: 'idle', tasksCompleted: 0, uptime: 0 })
    }
  }

  // Mark scheduler as running if its PID file exists
  const schedulerPid = '/var/www/zeroclaw/scheduler.pid'
  if (fs.existsSync(schedulerPid)) {
    const schedulerAgent = agents.find(a => a.name === 'scheduler')
    if (schedulerAgent) schedulerAgent.status = 'running'
  }

  return agents
}

function getCurrentTask(): string | null {
  const taskFile = path.join(process.cwd(), '.current-task')
  if (fs.existsSync(taskFile)) {
    return fs.readFileSync(taskFile, 'utf-8').trim() || null
  }
  return null
}

function getCurrentTheme(): { theme: string; background: string } {
  try {
    const envDaily = path.join(process.cwd(), '.env.daily')
    if (fs.existsSync(envDaily)) {
      const content = fs.readFileSync(envDaily, 'utf-8')
      const themeMatch = content.match(/DAILY_THEME_NAME="([^"]+)"/)
      const sceneMatch = content.match(/DAILY_SCENE="([^"]+)"/)
      return {
        theme: themeMatch?.[1] ?? 'default',
        background: sceneMatch?.[1] ?? 'starfield_parallax',
      }
    }
  } catch { /* ignore */ }
  return { theme: 'default', background: 'starfield_parallax' }
}

function estimateArchivesSize(): number {
  const archiveDir = process.env.ARCHIVE_DIR ?? '/var/www/archives'
  if (!fs.existsSync(archiveDir)) return 0
  try {
    const output = execSync(`du -sb ${archiveDir} 2>/dev/null || echo "0"`)
      .toString().trim().split('\t')[0]
    return parseInt(output, 10) || 0
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function collectStats(): Promise<DaveAIStats> {
  try {
    const disk = getDiskUsage()
    const gitStats = getGitStats()
    const agents = getAgentStats()
    const currentTask = getCurrentTask()
    const { theme, background } = getCurrentTheme()

    const stats: DaveAIStats = {
      agents,
      timewarp: gitStats,
      storage: {
        used: disk.used,
        total: disk.total,
        label: `${Math.round(disk.used / 1024 ** 3)}GB / ${Math.round(disk.total / 1024 ** 3)}GB`,
      },
      currentTask,
      theme,
      background,
      uptime: getUptimeSeconds(),
    }

    return stats
  } catch (err) {
    statsLogger.error({ err }, 'Failed to collect stats')
    throw err
  }
}
