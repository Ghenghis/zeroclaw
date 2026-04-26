/**
 * AdaptiveDifficultyEngine.ts
 * Skill-based difficulty adjustment for ZeroClaw arcade games.
 * Keeps players in the optimal challenge zone (Flow state).
 */

type SkillLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface DifficultyState {
  level: number;        // 1.0 = baseline
  skillLevel: SkillLevel;
  consecutiveWins: number;
  consecutiveLosses: number;
  sessionDeaths: number;
  sessionScore: number;
  lastAdjustment: number; // timestamp
}

interface DifficultyParams {
  speed:      number;   // multiplier
  spawnRate:  number;   // multiplier (higher = more enemies)
  enemyHP:    number;   // multiplier
  gapSize:    number;   // multiplier (for Flappy-style games — higher = easier)
  pointMult:  number;   // score multiplier
}

export class AdaptiveDifficultyEngine {
  private gameId: string;
  private state: DifficultyState;
  private ADJUST_COOLDOWN = 30_000; // ms between adjustments

  constructor(gameId: string) {
    this.gameId = gameId;
    this.state = this.load();
  }

  private load(): DifficultyState {
    try {
      const raw = localStorage.getItem(`zeroclaw_diff_${this.gameId}`);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      level:            1.0,
      skillLevel:       'beginner',
      consecutiveWins:  0,
      consecutiveLosses: 0,
      sessionDeaths:    0,
      sessionScore:     0,
      lastAdjustment:   0,
    };
  }

  private save() {
    try {
      localStorage.setItem(`zeroclaw_diff_${this.gameId}`, JSON.stringify(this.state));
    } catch { /* ignore */ }
  }

  /** Call this when a game round ends */
  recordRoundEnd(won: boolean, score: number) {
    this.state.sessionScore += score;
    if (won) {
      this.state.consecutiveWins++;
      this.state.consecutiveLosses = 0;
    } else {
      this.state.consecutiveLosses++;
      this.state.consecutiveWins = 0;
      this.state.sessionDeaths++;
    }
    this.maybeAdjust();
    this.save();
  }

  private maybeAdjust() {
    const now = Date.now();
    if (now - this.state.lastAdjustment < this.ADJUST_COOLDOWN) return;

    const { consecutiveWins, consecutiveLosses } = this.state;

    if (consecutiveWins >= 3) {
      // Player is breezing through — increase difficulty
      this.state.level = Math.min(this.state.level * 1.15, 3.0);
      this.state.consecutiveWins = 0;
      this.state.lastAdjustment  = now;
      this.updateSkillLevel();
    } else if (consecutiveLosses >= 3) {
      // Player is struggling — decrease difficulty
      this.state.level = Math.max(this.state.level * 0.88, 0.4);
      this.state.consecutiveLosses = 0;
      this.state.lastAdjustment    = now;
      this.updateSkillLevel();
    }
  }

  private updateSkillLevel() {
    const l = this.state.level;
    if      (l < 0.6)  this.state.skillLevel = 'novice';
    else if (l < 0.9)  this.state.skillLevel = 'beginner';
    else if (l < 1.4)  this.state.skillLevel = 'intermediate';
    else if (l < 2.0)  this.state.skillLevel = 'advanced';
    else               this.state.skillLevel = 'expert';
  }

  /** Returns current difficulty parameters to pass to the game engine */
  getParams(): DifficultyParams {
    const l = this.state.level;
    return {
      speed:     l,
      spawnRate: l,
      enemyHP:   l,
      gapSize:   Math.max(0.5, 1 / l),  // inverse — harder = smaller gaps
      pointMult: l,
    };
  }

  getLevel():      number     { return this.state.level; }
  getSkillLevel(): SkillLevel { return this.state.skillLevel; }
  getState():      DifficultyState { return { ...this.state }; }

  reset() {
    this.state = {
      level: 1.0, skillLevel: 'beginner',
      consecutiveWins: 0, consecutiveLosses: 0,
      sessionDeaths: 0, sessionScore: 0, lastAdjustment: 0,
    };
    this.save();
  }
}
