// lib/weekend/WeekendModeEngine.ts
// Detects weekend mode (Saturday arcade / Sunday relaxation) and manages
// agent-generated HTML games.

import path from 'path'
import fs from 'fs'
import { arcadeLogger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeekendMode = 'saturday_arcade' | 'sunday_relaxation' | 'weekday'

export type GameGenre =
  | 'snake'
  | 'tetris'
  | 'blackjack'
  | 'flappy'
  | 'whack'
  | 'connect4'
  | 'solitaire'
  | 'slots'
  | 'pong'
  | 'breakout'
  | 'memory'
  | 'minesweeper'
  | 'sudoku'
  | 'wordle'
  | 'tictactoe'
  | 'asteroids'
  | 'platformer'
  | 'puzzle'
  | 'trivia'

export interface GeneratedGame {
  id: string
  genre: GameGenre
  title: string
  description: string
  htmlPath: string
  thumbnailUrl?: string
  ticketCost: number
  estimatedPlayMinutes: number
  generatedAt: Date
  playCount: number
  highScore: number
  highScoreBy?: string
}

export interface WeekendStatus {
  mode: WeekendMode
  games: GeneratedGame[]
  currentScene: string
  ticketBalance: number
  nextModeChange: Date
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAMES_DIR = path.join(process.cwd(), 'public', 'games', 'generated')
const GAMES_META_FILE = path.join(process.cwd(), 'public', 'games', 'meta.json')

// ---------------------------------------------------------------------------
// WeekendModeEngine
// ---------------------------------------------------------------------------

export class WeekendModeEngine {
  private static instance: WeekendModeEngine
  private cachedGames: GeneratedGame[] = []
  private lastLoad = 0
  private CACHE_TTL = 60_000 // 1 minute

  static getInstance(): WeekendModeEngine {
    if (!this.instance) this.instance = new WeekendModeEngine()
    return this.instance
  }

  // ── Mode detection ────────────────────────────────────────────────────────

  detectMode(date: Date = new Date()): WeekendMode {
    const day = date.getDay() // 0=Sun, 6=Sat
    if (day === 6) return 'saturday_arcade'
    if (day === 0) return 'sunday_relaxation'
    return 'weekday'
  }

  getNextModeChange(date: Date = new Date()): Date {
    const mode = this.detectMode(date)
    const next = new Date(date)

    if (mode === 'weekday') {
      // Next Saturday midnight
      const daysUntilSat = (6 - date.getDay() + 7) % 7 || 7
      next.setDate(date.getDate() + daysUntilSat)
      next.setHours(0, 0, 0, 0)
    } else if (mode === 'saturday_arcade') {
      // Midnight Sunday
      next.setDate(date.getDate() + 1)
      next.setHours(0, 0, 0, 0)
    } else {
      // Midnight Monday
      next.setDate(date.getDate() + 1)
      next.setHours(0, 0, 0, 0)
    }

    return next
  }

  // ── Game loading ──────────────────────────────────────────────────────────

  async loadGames(): Promise<GeneratedGame[]> {
    const now = Date.now()
    if (now - this.lastLoad < this.CACHE_TTL && this.cachedGames.length > 0) {
      return this.cachedGames
    }

    try {
      // Ensure games dir exists
      if (!fs.existsSync(GAMES_DIR)) {
        fs.mkdirSync(GAMES_DIR, { recursive: true })
      }

      // Load metadata file if it exists
      if (fs.existsSync(GAMES_META_FILE)) {
        const raw = fs.readFileSync(GAMES_META_FILE, 'utf-8')
        const meta = JSON.parse(raw) as GeneratedGame[]
        // Filter to games that actually have their HTML file
        this.cachedGames = meta.filter(g =>
          fs.existsSync(path.join(process.cwd(), 'public', g.htmlPath.replace(/^\//, '')))
        )
      } else {
        this.cachedGames = []
      }

      this.lastLoad = now
      arcadeLogger.info({ count: this.cachedGames.length }, 'Games loaded')
      return this.cachedGames
    } catch (err) {
      arcadeLogger.error({ err }, 'Failed to load games')
      return []
    }
  }

  async saveGameMeta(game: GeneratedGame): Promise<void> {
    const games = await this.loadGames()
    const idx = games.findIndex(g => g.id === game.id)
    if (idx >= 0) {
      games[idx] = game
    } else {
      games.push(game)
    }
    fs.writeFileSync(GAMES_META_FILE, JSON.stringify(games, null, 2), 'utf-8')
    this.cachedGames = games
    this.lastLoad = Date.now()
  }

  async recordPlay(gameId: string): Promise<void> {
    const games = await this.loadGames()
    const game = games.find(g => g.id === gameId)
    if (game) {
      game.playCount++
      await this.saveGameMeta(game)
    }
  }

  async updateHighScore(gameId: string, score: number, playerName?: string): Promise<boolean> {
    const games = await this.loadGames()
    const game = games.find(g => g.id === gameId)
    if (!game || score <= game.highScore) return false
    game.highScore = score
    game.highScoreBy = playerName
    await this.saveGameMeta(game)
    return true
  }

  // ── Status ────────────────────────────────────────────────────────────────

  async getStatus(ticketBalance: number, date?: Date): Promise<WeekendStatus> {
    const now = date ?? new Date()
    const mode = this.detectMode(now)
    const games = await this.loadGames()

    const { getSundayScene } = await import('./SundayRelaxation')
    const currentScene = mode === 'sunday_relaxation'
      ? getSundayScene(now)
      : mode === 'saturday_arcade'
        ? 'arcade_neon'
        : 'default'

    return {
      mode,
      games,
      currentScene,
      ticketBalance,
      nextModeChange: this.getNextModeChange(now),
    }
  }
}

export const weekendEngine = WeekendModeEngine.getInstance()
