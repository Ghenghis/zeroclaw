/**
 * GameTemplateRegistry.ts
 * Manages HTML scaffold templates and canvas configs for all ZeroClaw arcade games.
 * AI-generated games use these as base scaffolds via string interpolation.
 */

export type GameType =
  | 'snake' | 'tetris' | 'pacman' | 'space_invaders' | 'breakout'
  | 'flappy' | 'connect_four' | 'whack_a_mole' | '2048' | 'simon'
  | 'solitaire' | 'blackjack' | 'poker' | 'minesweeper' | 'sudoku'
  | 'slot_machine' | 'chess' | 'flappy_bird' | 'asteroids';

export interface CanvasConfig {
  width: number;
  height: number;
  controlType: 'SWIPE' | 'DPAD' | 'JOYSTICK' | 'TAP' | 'CANVAS_TAP';
}

export interface GameTemplate {
  scaffold: string;
  config: CanvasConfig;
}

const CANVAS_CONFIGS: Record<GameType, CanvasConfig> = {
  snake:          { width: 600, height: 600, controlType: 'SWIPE' },
  tetris:         { width: 300, height: 600, controlType: 'SWIPE' },
  pacman:         { width: 560, height: 620, controlType: 'DPAD' },
  space_invaders: { width: 600, height: 700, controlType: 'JOYSTICK' },
  breakout:       { width: 600, height: 500, controlType: 'CANVAS_TAP' },
  flappy:         { width: 400, height: 600, controlType: 'TAP' },
  flappy_bird:    { width: 400, height: 600, controlType: 'TAP' },
  connect_four:   { width: 420, height: 380, controlType: 'TAP' },
  whack_a_mole:   { width: 500, height: 500, controlType: 'CANVAS_TAP' },
  '2048':         { width: 400, height: 500, controlType: 'SWIPE' },
  simon:          { width: 400, height: 400, controlType: 'TAP' },
  solitaire:      { width: 800, height: 600, controlType: 'CANVAS_TAP' },
  blackjack:      { width: 600, height: 500, controlType: 'TAP' },
  poker:          { width: 800, height: 600, controlType: 'TAP' },
  minesweeper:    { width: 480, height: 520, controlType: 'CANVAS_TAP' },
  sudoku:         { width: 480, height: 560, controlType: 'TAP' },
  slot_machine:   { width: 400, height: 500, controlType: 'TAP' },
  chess:          { width: 560, height: 560, controlType: 'CANVAS_TAP' },
  asteroids:      { width: 600, height: 600, controlType: 'JOYSTICK' },
};

const BASE_SCAFFOLD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>{{GAME_TITLE}}</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#050510;color:#fff;font-family:'Orbitron',sans-serif;overflow:hidden;width:100vw;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
    #game-container{position:relative;display:flex;flex-direction:column;align-items:center}
    #game-canvas{display:block;border-radius:4px}
    #score-display{font-family:'Orbitron',monospace;font-size:clamp(12px,2vw,20px);color:#ff0080;text-shadow:0 0 10px #ff0080;letter-spacing:3px;padding:8px 0}
    #start-screen,#gameover-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,5,16,0.92);border-radius:4px;z-index:10}
    .screen-title{font-family:'Press Start 2P',monospace;font-size:clamp(16px,3vw,28px);color:#ff0080;text-shadow:0 0 20px #ff0080,0 0 40px #ff0080;margin-bottom:24px;letter-spacing:4px}
    .blink{animation:blink 1s step-end infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    .game-btn{background:transparent;border:2px solid #00ffff;color:#00ffff;font-family:'Press Start 2P',monospace;font-size:10px;padding:12px 24px;cursor:pointer;letter-spacing:2px;transition:all 0.2s;text-shadow:0 0 8px #00ffff;box-shadow:0 0 10px rgba(0,255,255,0.3)}
    .game-btn:hover{background:#00ffff;color:#000;box-shadow:0 0 20px #00ffff}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important}}
    {{GAME_SPECIFIC_STYLES}}
  </style>
</head>
<body>
  <div id="game-container">
    <div id="score-display">SCORE: <span id="score-value">0</span></div>
    <canvas id="game-canvas" width="{{CANVAS_WIDTH}}" height="{{CANVAS_HEIGHT}}"></canvas>
    <div id="start-screen">
      <div class="screen-title">{{GAME_TITLE}}</div>
      <p class="blink" style="font-family:'Press Start 2P';font-size:9px;color:#fff;letter-spacing:3px;">PRESS ANY KEY</p>
    </div>
    <div id="gameover-screen" style="display:none">
      <div class="screen-title">GAME OVER</div>
      <div id="final-score" style="font-size:14px;margin-bottom:20px;color:#ffff00"></div>
      <div id="high-score-display" style="font-size:10px;margin-bottom:24px;color:#00ffff"></div>
      <button class="game-btn" id="restart-btn">PLAY AGAIN</button>
    </div>
    {{GAME_SPECIFIC_HTML}}
  </div>
  <script>
    const canvas=document.getElementById('game-canvas');
    const ctx=canvas.getContext('2d');
    const scoreEl=document.getElementById('score-value');
    const startScreen=document.getElementById('start-screen');
    const gameOverScreen=document.getElementById('gameover-screen');
    let score=0,highScore=parseInt(localStorage.getItem('{{GAME_ID}}_hs')||'0');
    let gameState='START';
    function updateScore(pts){score+=pts;scoreEl.textContent=score;if(score>highScore){highScore=score;localStorage.setItem('{{GAME_ID}}_hs',highScore)}}
    function showGameOver(){gameState='GAMEOVER';document.getElementById('final-score').textContent='SCORE: '+score;document.getElementById('high-score-display').textContent='BEST: '+highScore;gameOverScreen.style.display='flex';gsap.fromTo(gameOverScreen,{opacity:0},{opacity:1,duration:0.5})}
    document.getElementById('restart-btn').addEventListener('click',restartGame);
    document.addEventListener('keydown',e=>{if(gameState==='START'){gameState='PLAYING';gsap.to(startScreen,{opacity:0,duration:0.3,onComplete:()=>startScreen.style.display='none'});initGame()}});
    {{GAME_SPECIFIC_JAVASCRIPT}}
  </script>
</body>
</html>`;

export class GameTemplateRegistry {
  private templates = new Map<GameType, GameTemplate>();

  constructor() {
    this.registerAll();
  }

  private registerAll() {
    for (const [type, cfg] of Object.entries(CANVAS_CONFIGS) as [GameType, CanvasConfig][]) {
      const scaffold = BASE_SCAFFOLD
        .replace(/\{\{CANVAS_WIDTH\}\}/g, String(cfg.width))
        .replace(/\{\{CANVAS_HEIGHT\}\}/g, String(cfg.height));
      this.templates.set(type, { scaffold, config: cfg });
    }
  }

  get(gameType: GameType): GameTemplate {
    return this.templates.get(gameType) ?? this.templates.get('snake')!;
  }

  fill(gameType: GameType, vars: Record<string, string>): string {
    let html = this.get(gameType).scaffold;
    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return html;
  }

  listTypes(): GameType[] {
    return Array.from(this.templates.keys());
  }
}
