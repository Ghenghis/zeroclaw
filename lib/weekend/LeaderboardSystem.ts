/**
 * LeaderboardSystem.ts
 * localStorage-backed leaderboard with top-10 scores per game.
 * Designed to be serializable for future DB sync.
 */

export interface LeaderboardEntry {
  rank:      number;
  name:      string;
  score:     number;
  date:      string;  // ISO
  gameId:    string;
  metadata?: Record<string, unknown>;
}

export class LeaderboardSystem {
  private gameId: string;
  private storageKey: string;
  private maxEntries: number;

  constructor(gameId: string, maxEntries = 10) {
    this.gameId     = gameId;
    this.storageKey = `zeroclaw_lb_${gameId}`;
    this.maxEntries = maxEntries;
  }

  getAll(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  isHighScore(score: number): boolean {
    const entries = this.getAll();
    if (entries.length < this.maxEntries) return true;
    return score > (entries[entries.length - 1]?.score ?? 0);
  }

  submit(name: string, score: number, metadata?: Record<string, unknown>): LeaderboardEntry {
    const entries = this.getAll();
    const entry: LeaderboardEntry = {
      rank:     0,
      name:     name.slice(0, 20),
      score,
      date:     new Date().toISOString(),
      gameId:   this.gameId,
      metadata,
    };

    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, this.maxEntries);

    // Re-rank
    trimmed.forEach((e, i) => { e.rank = i + 1; });

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch {
      // Storage quota exceeded — ignore
    }

    return trimmed.find(e => e.score === score && e.date === entry.date) ?? entry;
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }

  /** Returns HTML string for embedding in game-over screens */
  renderHTML(highlightScore?: number): string {
    const entries = this.getAll();
    if (entries.length === 0) return '<p style="color:#888;font-size:12px">No scores yet</p>';

    const rows = entries.map(e => {
      const isHighlight = highlightScore !== undefined && e.score === highlightScore;
      return `<tr style="${isHighlight ? 'color:#ffd700;font-weight:bold' : 'color:#aaa'}">
        <td style="padding:2px 8px;text-align:right">${e.rank}.</td>
        <td style="padding:2px 8px">${e.name}</td>
        <td style="padding:2px 8px;text-align:right">${e.score.toLocaleString()}</td>
      </tr>`;
    }).join('');

    return `<table style="font-family:monospace;font-size:12px;border-collapse:collapse;width:100%">
      <thead><tr style="color:#fff;border-bottom:1px solid #333">
        <th style="padding:4px 8px">#</th>
        <th style="padding:4px 8px">Name</th>
        <th style="padding:4px 8px">Score</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
}
