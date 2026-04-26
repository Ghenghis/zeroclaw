// app/api/weekend/generate/route.ts
// POST: Generate a new agent-created HTML game via Claude claude-opus-4-5.
// Requires: weekend mode is active (Saturday or Sunday)

import { NextRequest, NextResponse } from 'next/server'
import { generateGame } from '@/lib/weekend/GameGenerator'
import { weekendEngine } from '@/lib/weekend/WeekendModeEngine'
import { weekendEngine as engine } from '@/lib/weekend/WeekendModeEngine'
import { arcadeLogger } from '@/lib/logger'
import type { GameGenre } from '@/lib/weekend/WeekendModeEngine'
import type { GameSpec } from '@/lib/weekend/GameGenerator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 min timeout for AI generation

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate weekend mode
    const mode = weekendEngine.detectMode()
    if (mode === 'weekday') {
      return NextResponse.json(
        { error: 'Game generation is only available on weekends (Saturday & Sunday)' },
        { status: 403 }
      )
    }

    // Parse request body
    let body: Partial<GameSpec>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { genre, theme, difficulty, colorPalette, specialRules } = body

    // Validate genre
    const validGenres: GameGenre[] = [
      'snake', 'tetris', 'blackjack', 'flappy', 'whack', 'connect4',
      'solitaire', 'slots', 'pong', 'breakout', 'memory', 'minesweeper',
      'sudoku', 'wordle', 'tictactoe', 'asteroids', 'platformer', 'puzzle', 'trivia'
    ]

    if (!genre || !validGenres.includes(genre)) {
      return NextResponse.json(
        { error: `Invalid genre. Must be one of: ${validGenres.join(', ')}` },
        { status: 400 }
      )
    }

    arcadeLogger.info({ genre, theme, difficulty }, 'Game generation requested')

    const spec: GameSpec = {
      genre,
      theme: theme ?? 'retro arcade',
      difficulty: difficulty ?? 'medium',
      colorPalette: Array.isArray(colorPalette) ? colorPalette : undefined,
      specialRules: typeof specialRules === 'string' ? specialRules : undefined,
    }

    const game = await generateGame(spec)

    // Save to game registry
    await engine.saveGameMeta(game)

    arcadeLogger.info({ gameId: game.id, genre, title: game.title }, 'Game generated and saved')

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        genre: game.genre,
        title: game.title,
        description: game.description,
        htmlPath: game.htmlPath,
        ticketCost: game.ticketCost,
        estimatedPlayMinutes: game.estimatedPlayMinutes,
        generatedAt: game.generatedAt,
      }
    }, { status: 201 })

  } catch (err) {
    arcadeLogger.error({ err }, 'Game generation failed')
    return NextResponse.json(
      { error: 'Game generation failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
