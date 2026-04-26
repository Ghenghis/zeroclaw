// lib/weekend/GameGenerator.ts
// Agent-powered HTML game generator using Claude claude-opus-4-5.
// Each game is a fully self-contained single HTML file with embedded CSS + JS.

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { arcadeLogger } from '@/lib/logger'
import type { GameGenre, GeneratedGame } from './WeekendModeEngine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameSpec {
  genre: GameGenre
  theme?: string           // optional visual theme overlay e.g. "space", "halloween"
  difficulty?: 'easy' | 'medium' | 'hard'
  colorPalette?: string[]  // optional hex palette override
  specialRules?: string    // extra rules to inject into prompt
}

// ---------------------------------------------------------------------------
// Ticket costs per genre
// ---------------------------------------------------------------------------

export const TICKET_COSTS: Record<GameGenre, number> = {
  snake:       5,
  tetris:      8,
  blackjack:   6,
  flappy:      5,
  whack:       4,
  connect4:    5,
  solitaire:  10,
  slots:       3,
  pong:        4,
  breakout:    6,
  memory:      4,
  minesweeper: 5,
  sudoku:      7,
  wordle:      6,
  tictactoe:   2,
  asteroids:   8,
  platformer: 12,
  puzzle:      6,
  trivia:      5,
}

export const ESTIMATED_PLAY_MINUTES: Record<GameGenre, number> = {
  snake:        5,
  tetris:      10,
  blackjack:    8,
  flappy:       5,
  whack:        3,
  connect4:     5,
  solitaire:   15,
  slots:        2,
  pong:         5,
  breakout:     8,
  memory:       6,
  minesweeper: 10,
  sudoku:      20,
  wordle:       5,
  tictactoe:    3,
  asteroids:    8,
  platformer:  15,
  puzzle:      10,
  trivia:       8,
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

export function buildGamePrompt(spec: GameSpec): string {
  const { genre, theme = 'retro arcade', difficulty = 'medium', colorPalette, specialRules } = spec

  const paletteNote = colorPalette?.length
    ? `Use this exact color palette: ${colorPalette.join(', ')}.`
    : 'Use a vibrant, high-contrast color scheme appropriate for the theme.'

  const genreInstructions: Record<GameGenre, string> = {
    snake: `Classic Snake game. Grid-based movement. Arrow keys to steer. Grows on food. Game over on wall/self collision. Show score. Increase speed as snake grows.`,
    tetris: `Classic Tetris. 7 tetrominoes with standard rotation. Line clears score points. Level increases every 10 lines. Speed increases with level. Show next piece preview. Hold piece feature.`,
    blackjack: `Casino Blackjack. Player vs dealer. Standard card rules: ace = 1 or 11. Bet system with starting chips (1000). Options: Hit, Stand, Double Down, Split pairs. Dealer hits on soft 17. Show win/loss/push outcomes.`,
    flappy: `Flappy Bird clone. Space/click to flap. Infinite scrolling pipes. Gaps get smaller over time. Particle trail on the bird. High score tracking. Night/day cycle background.`,
    whack: `Whack-a-Mole. 9-hole grid. Moles appear randomly. Click to whack. 60-second timer. Combo multiplier for quick successive hits. Golden mole for bonus points. Score display.`,
    connect4: `Connect Four. 7x6 grid. Two players (red vs yellow) or vs AI. Drop discs from top. First to connect 4 wins. AI uses minimax with alpha-beta pruning for depth 5.`,
    solitaire: `Klondike Solitaire. Full 52-card deck. 7 tableau columns. 4 foundation piles. Stock and waste piles. Drag-and-drop cards. Auto-complete when all face-up. Timer and move counter.`,
    slots: `3-reel slot machine. 5 symbols: cherry, lemon, orange, bell, seven. Bet 1-5 tokens per spin. Payout table displayed. Spinning animation. Win celebration with particles. Balance tracker.`,
    pong: `Classic Pong. Two paddles. Ball physics with slight randomness. Score to 11. Paddle AI or two-player mode. Ball speeds up each rally. Sound effects via AudioContext.`,
    breakout: `Breakout/Arkanoid. 8 rows of bricks. Power-ups: multi-ball, wide paddle, laser, slow. Lives system. Level progression. Brick colors indicate hit points.`,
    memory: `Memory card matching game. 4x4 grid (8 pairs). Cards flip with CSS 3D animation. Move counter. Timer. Difficulty: 4x4 easy, 5x6 medium, 6x6 hard. Best score saved to localStorage.`,
    minesweeper: `Classic Minesweeper. 9x9 (beginner), 16x16 (intermediate), 30x16 (expert). Left-click reveal, right-click flag. First click always safe. Auto-reveal empty cells. Timer and mine counter.`,
    sudoku: `9x9 Sudoku. Generate valid puzzles for chosen difficulty. Number input 1-9. Highlight row/col/box on selection. Pencil marks feature. Validate button. Hint system (3 per game).`,
    wordle: `Wordle clone. 5-letter words. 6 guesses. Color feedback: green=correct, yellow=wrong position, gray=absent. On-screen keyboard with letter states. Daily word (seeded by date). Share result emoji grid.`,
    tictactoe: `Tic-Tac-Toe. X vs O. Click grid squares. Highlight winning line. vs AI option using minimax. Win/draw/loss counter. Animated X and O drawing.`,
    asteroids: `Classic Asteroids. Ship with thrust and rotation. Bullets destroy asteroids that split. Shield ability with cooldown. Screen wrapping. Particle explosions. Lives system. Level progression.`,
    platformer: `2D side-scrolling platformer. Controllable character with run/jump. Platform collision. Collectible coins. Enemies that patrol. Level complete condition. Double-jump power-up. Pixel art style.`,
    puzzle: `15-puzzle sliding tile. 4x4 grid (15 tiles + blank). Shuffle on start. Move counter. Timer. Solve detection. Optionally use an image split into tiles. Hint: show solved state briefly.`,
    trivia: `Trivia quiz game. 10 questions, multiple choice (4 options). Categories: science, history, pop culture, tech, geography. 15-second timer per question. Score at end. Correct answer reveal animation.`,
  }

  return `You are an expert game developer. Create a complete, fully-playable ${genre} game as a single self-contained HTML file.

THEME: ${theme}
DIFFICULTY: ${difficulty}
${paletteNote}
${specialRules ? `SPECIAL RULES: ${specialRules}` : ''}

GAME REQUIREMENTS:
${genreInstructions[genre]}

TECHNICAL REQUIREMENTS:
1. Single HTML file with all CSS and JavaScript inline
2. No external dependencies or CDN links — everything self-contained
3. Responsive canvas or DOM layout that works at 800x600 minimum
4. Keyboard + mouse/touch controls
5. Game loop using requestAnimationFrame
6. Smooth 60fps rendering
7. Score/progress displayed prominently
8. Game over / win screen with restart button
9. Sound effects using the Web Audio API (synthesized, no audio files)
10. Particle effects for key events (death, score, win)
11. localStorage for high score persistence
12. ARIA labels on interactive elements for accessibility
13. No alerts() — use styled in-game UI for messages

VISUAL REQUIREMENTS:
- Pixel-perfect rendering on canvas (use integer coordinates)
- Consistent visual theme throughout
- Loading screen or splash screen
- Animated title/logo
- Smooth transitions between game states

Return ONLY the complete HTML file content, starting with <!DOCTYPE html> and ending with </html>. No explanation, no markdown fences, just the raw HTML.`
}

// ---------------------------------------------------------------------------
// Title / description extraction
// ---------------------------------------------------------------------------

export function extractTitle(html: string, genre: GameGenre): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch?.[1]) return titleMatch[1].trim()

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match?.[1]) return h1Match[1].trim()

  return `${genre.charAt(0).toUpperCase() + genre.slice(1)} – Weekend Edition`
}

export function extractDescription(html: string, genre: GameGenre): string {
  const descMatch = html.match(/<!--\s*DESC:\s*(.+?)\s*-->/i)
  if (descMatch?.[1]) return descMatch[1].trim()

  const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
  if (metaMatch?.[1]) return metaMatch[1].trim()

  const descriptions: Record<GameGenre, string> = {
    snake: 'Guide the snake to eat food and grow. Avoid hitting walls or yourself!',
    tetris: 'Stack falling tetrominoes and clear lines to score points.',
    blackjack: 'Beat the dealer to 21 without going bust.',
    flappy: 'Tap to keep the bird flying between pipes.',
    whack: 'Whack moles as fast as you can before time runs out!',
    connect4: 'Drop discs to connect four in a row before your opponent.',
    solitaire: 'Sort all cards to the foundation piles to win.',
    slots: 'Spin the reels and match symbols to win tokens.',
    pong: 'Classic paddle game — first to 11 wins.',
    breakout: 'Break all the bricks with your bouncing ball.',
    memory: 'Find matching pairs by flipping cards.',
    minesweeper: 'Clear the minefield without triggering a bomb.',
    sudoku: 'Fill the grid so every row, column, and box has 1–9.',
    wordle: 'Guess the 5-letter word in 6 tries.',
    tictactoe: 'Get three in a row before your opponent.',
    asteroids: 'Destroy asteroids and survive as long as possible.',
    platformer: 'Run, jump, and collect coins across the level.',
    puzzle: 'Slide the tiles into the correct order.',
    trivia: 'Answer trivia questions correctly to score points.',
  }

  return descriptions[genre]
}

// ---------------------------------------------------------------------------
// estimatePlayTime
// ---------------------------------------------------------------------------

export function estimatePlayTime(genre: GameGenre): number {
  return ESTIMATED_PLAY_MINUTES[genre]
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateGame(spec: GameSpec): Promise<GeneratedGame> {
  const client = new Anthropic()

  arcadeLogger.info({ genre: spec.genre, theme: spec.theme }, 'Generating game')

  const prompt = buildGamePrompt(spec)
  const startMs = Date.now()

  let html: string

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in response')
    }

    html = textBlock.text.trim()

    // Strip markdown code fences if agent wrapped it
    if (html.startsWith('```')) {
      html = html.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
    }
  } catch (err) {
    arcadeLogger.error({ err, genre: spec.genre }, 'Game generation failed')
    throw err
  }

  const genMs = Date.now() - startMs
  arcadeLogger.info({ genre: spec.genre, genMs }, 'Game generated')

  // Save HTML file
  const gamesDir = path.join(process.cwd(), 'public', 'games', 'generated')
  fs.mkdirSync(gamesDir, { recursive: true })

  const id = crypto.randomUUID()
  const filename = `${spec.genre}-${id.slice(0, 8)}.html`
  const filePath = path.join(gamesDir, filename)
  fs.writeFileSync(filePath, html, 'utf-8')

  const game: GeneratedGame = {
    id,
    genre: spec.genre,
    title: extractTitle(html, spec.genre),
    description: extractDescription(html, spec.genre),
    htmlPath: `/games/generated/${filename}`,
    ticketCost: TICKET_COSTS[spec.genre],
    estimatedPlayMinutes: estimatePlayTime(spec.genre),
    generatedAt: new Date(),
    playCount: 0,
    highScore: 0,
  }

  return game
}
