/**
 * TicketEconomy.ts
 * localStorage-based ticket system for the ZeroClaw weekend arcade.
 * Tickets are earned by playing and spent to unlock premium games.
 */

type RewardReason =
  | 'new_highscore' | 'first_play' | 'score_milestone_100'
  | 'score_milestone_500' | 'score_milestone_1000'
  | 'daily_login' | 'achievement_unlocked';

const GAME_COSTS: Record<string, number> = {
  snake: 0, tetris: 0, '2048': 0, chess: 0,
  flappy: 1, pacman: 2, space_invaders: 2,
  poker: 5, blackjack: 3, slot_machine: 2,
};

const REWARDS: Record<RewardReason, number> = {
  new_highscore:         5,
  first_play:            2,
  score_milestone_100:   1,
  score_milestone_500:   3,
  score_milestone_1000: 10,
  daily_login:          10,
  achievement_unlocked:  5,
};

export class TicketEconomy {
  private readonly STORAGE_KEY = 'zeroclaw_tickets';
  private readonly LOGIN_KEY   = 'zeroclaw_last_login';
  private tickets: number;

  constructor() {
    this.tickets = parseInt(localStorage.getItem(this.STORAGE_KEY) ?? '50', 10);
    this.dailyLoginCheck();
  }

  get balance(): number { return this.tickets; }

  spend(gameId: string): boolean {
    const cost = GAME_COSTS[gameId] ?? 1;
    if (this.tickets < cost) {
      this.showMessage(`Need ${cost} 🎟️ to play — earn more by playing free games!`, 'warn');
      return false;
    }
    this.tickets -= cost;
    this.persist();
    if (cost > 0) this.showTransaction(-cost, gameId);
    return true;
  }

  earn(reason: RewardReason): number {
    const amount = REWARDS[reason] ?? 1;
    this.tickets += amount;
    this.persist();
    this.showTransaction(+amount, reason);
    return this.tickets;
  }

  earnAmount(amount: number, label: string): number {
    this.tickets += amount;
    this.persist();
    this.showTransaction(+amount, label);
    return this.tickets;
  }

  private persist() {
    localStorage.setItem(this.STORAGE_KEY, String(this.tickets));
    document.querySelectorAll('[data-ticket-balance]').forEach(el => {
      el.textContent = String(this.tickets);
    });
  }

  private dailyLoginCheck() {
    const today = new Date().toDateString();
    if (localStorage.getItem(this.LOGIN_KEY) !== today) {
      localStorage.setItem(this.LOGIN_KEY, today);
      setTimeout(() => this.earn('daily_login'), 1500);
    }
  }

  private showTransaction(amount: number, label: string) {
    const el = document.createElement('div');
    el.textContent = `${amount > 0 ? '+' : ''}${amount} 🎟️`;
    Object.assign(el.style, {
      position: 'fixed', top: '64px', right: '24px',
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '11px',
      color: amount > 0 ? '#ffaa00' : '#ff4444',
      textShadow: '0 0 10px currentColor',
      zIndex: '99998', pointerEvents: 'none',
      transition: 'opacity 0.3s, transform 0.3s',
    });
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-40px)';
    }, 1200);
    setTimeout(() => el.remove(), 1600);
    void label; // used for future analytics
  }

  private showMessage(msg: string, _type: 'warn' | 'info') {
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.92)', border: '2px solid #ff0080',
      borderRadius: '8px', padding: '20px 28px',
      fontFamily: 'system-ui, sans-serif', fontSize: '13px',
      color: '#ff0080', textAlign: 'center', zIndex: '99999',
      boxShadow: '0 0 30px rgba(255,0,128,0.4)',
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
}
