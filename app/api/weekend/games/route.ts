// app/api/weekend/games/route.ts
// GET: List all available generated games with metadata.
// POST: Record a play or update high score.

import { NextRequest, NextResponse } from 'next/server'
import { weekendEngine } from '@/lib/weekend/WeekendModeEngine'
import { arcadeLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/weekend/games — list all games
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const genre = searchParams.get('genre')
    const mode = weekendEngine.detectMode()

    let games = await weekendEngine.loadGames()

    // Filter by genre if requested
    if (genre) {
      games = games.filter(g => g.genre === genre)
    }

    return NextResponse.json({
      success: true,
      mode,
      count: games.length,
      games: games.map(g => ({
        id: g.id,
        genre: g.genre,
        title: g.title,
        description: g.description,
        htmlPath: g.htmlPath,
        ticketCost: g.ticketCost,
        estimatedPlayMinutes: g.estimatedPlayMinutes,
        playCount: g.playCount,
        highScore: g.highScore,
        highScoreBy: g.highScoreBy,
        generatedAt: g.generatedAt,
      }))
    })
  } catch (err) {
    arcadeLogger.error({ err }, 'Failed to list games')
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 })
  }
}

// POST /api/weekend/games — record play or update high score
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      gameId: string
      action: 'record_play' | 'update_score'
      score?: number
      playerName?: string
    }

    const { gameId, action, score, playerName } = body

    if (!gameId || !action) {
      return NextResponse.json({ error: 'gameId and action are required' }, { status: 400 })
    }

    if (action === 'record_play') {
      await weekendEngine.recordPlay(gameId)
      arcadeLogger.debug({ gameId }, 'Play recorded')
      return NextResponse.json({ success: true, action: 'recorded' })
    }

    if (action === 'update_score') {
      if (typeof score !== 'number') {
        return NextResponse.json({ error: 'score must be a number' }, { status: 400 })
      }
      const isNewHighScore = await weekendEngine.updateHighScore(gameId, score, playerName)
      arcadeLogger.debug({ gameId, score, isNewHighScore }, 'Score submitted')
      return NextResponse.json({ success: true, isNewHighScore })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })

  } catch (err) {
    arcadeLogger.error({ err }, 'Game action failed')
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
