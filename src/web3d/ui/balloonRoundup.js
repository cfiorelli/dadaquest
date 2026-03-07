const WIDTH = 680;
const HEIGHT = 400;
const BALLOON_COUNT = 12;
const BEE_COUNT = 3;
const TIMER_SEC = 30;
const MAX_HITS = 3;
const BABY_R = 16;
const BALLOON_R = 11;
const BEE_R = 13;
const BABY_SPEED = 220;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const BALLOON_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#f77f00', '#c77dff', '#ff9ff3', '#48dbfb'];

export class BalloonRoundup {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'dada-balloon';
    this.root.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at center, rgba(14,22,48,0.84), rgba(6,10,24,0.97))',
      'z-index:2200',
      'pointer-events:none',
    ].join(';');

    this.panel = document.createElement('div');
    this.panel.style.cssText = [
      'padding:16px 18px 14px',
      'border-radius:18px',
      'border:2px solid rgba(100, 200, 255, 0.32)',
      'background:linear-gradient(180deg, rgba(10,18,36,0.96), rgba(6,12,28,0.99))',
      'box-shadow:0 18px 58px rgba(0,0,0,0.42)',
      'transform:scale(1) translateY(0)',
      'transition:transform 0.28s ease, opacity 0.28s ease',
      'opacity:1',
    ].join(';');
    this.root.appendChild(this.panel);

    this.title = document.createElement('div');
    this.title.textContent = 'BALLOON ROUNDUP';
    this.title.style.cssText = 'font:900 26px/1.1 Avenir Next,Trebuchet MS,sans-serif;color:#ffd93d;letter-spacing:0.08em;text-align:center;text-shadow:0 2px 0 rgba(0,0,0,0.45);';
    this.panel.appendChild(this.title);

    this.sub = document.createElement('div');
    this.sub.textContent = 'Float up and collect all 12 balloons! Dodge the bees.';
    this.sub.style.cssText = 'margin-top:5px;font:700 12px/1.35 Avenir Next,Trebuchet MS,sans-serif;color:#d7f4ff;text-align:center;letter-spacing:0.02em;';
    this.panel.appendChild(this.sub);

    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.cssText = [
      'display:block',
      'width:min(82vw, 680px)',
      'height:auto',
      'margin-top:12px',
      'border-radius:12px',
      'border:1px solid rgba(255,255,255,0.12)',
      'background:#080e1c',
    ].join(';');
    this.panel.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.footer = document.createElement('div');
    this.footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:10px;font:700 12px/1.35 Avenir Next,Trebuchet MS,sans-serif;color:#eaf9ff;';
    this.panel.appendChild(this.footer);

    this.statusEl = document.createElement('div');
    this.footer.appendChild(this.statusEl);

    this.helpEl = document.createElement('div');
    this.helpEl.textContent = 'WASD / Arrow keys to float';
    this.footer.appendChild(this.helpEl);

    document.body.appendChild(this.root);

    this.active = false;
    this.onWin = null;
    this.onAbort = null;
    this._winPending = false;
    this._endPending = false;
    this.resetState();
  }

  resetState() {
    const rand = seededRand(Date.now() & 0xffff);
    this.babyX = WIDTH * 0.5;
    this.babyY = HEIGHT * 0.5;
    this.babyVx = 0;
    this.babyVy = 0;
    this.hitsLeft = MAX_HITS;
    this.timerSec = TIMER_SEC;
    this.invulnSec = 0;

    this.balloons = Array.from({ length: BALLOON_COUNT }, (_, i) => ({
      x: 60 + rand() * (WIDTH - 120),
      y: 40 + rand() * (HEIGHT - 80),
      r: BALLOON_R,
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      collected: false,
      bobPhase: rand() * Math.PI * 2,
    }));

    this.bees = Array.from({ length: BEE_COUNT }, (_, i) => {
      const angle = (i / BEE_COUNT) * Math.PI * 2;
      const speed = 60 + rand() * 50;
      return {
        x: WIDTH * 0.5 + Math.cos(angle) * 180,
        y: HEIGHT * 0.5 + Math.sin(angle) * 100,
        vx: Math.cos(angle + Math.PI * 0.5) * speed,
        vy: Math.sin(angle + Math.PI * 0.5) * speed,
        phase: rand() * Math.PI * 2,
      };
    });

    this._winPending = false;
    this._endPending = false;
    this.render(0);
  }

  start({ onWin, onAbort } = {}) {
    this.onWin = onWin || null;
    this.onAbort = onAbort || null;
    this.active = true;
    this.resetState();
    this.root.style.display = 'flex';
    void this.panel.getBoundingClientRect();
    this.panel.style.transform = 'scale(1) translateY(0)';
    this.panel.style.opacity = '1';
  }

  stop() {
    this.active = false;
    this.panel.style.transform = 'scale(0.86) translateY(10px)';
    this.panel.style.opacity = '0';
    setTimeout(() => {
      if (!this.active) this.root.style.display = 'none';
    }, 220);
  }

  isActive() {
    return this.active;
  }

  handleEscape() {
    if (!this.active) return false;
    this.stop();
    this.onAbort?.();
    return true;
  }

  _triggerEnd(won) {
    if (this._winPending || this._endPending) return;
    if (won) {
      this._winPending = true;
    } else {
      this._endPending = true;
    }
    this._drawEndOverlay(won);
    setTimeout(() => {
      this.stop();
      if (won) {
        this.onWin?.();
      } else {
        this.onAbort?.();
      }
    }, 1500);
  }

  _drawEndOverlay(won) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.render(0);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = '#ffd93d';
      ctx.font = '900 62px Avenir Next,Trebuchet MS,sans-serif';
      ctx.fillText('YOU WON!', WIDTH * 0.5, HEIGHT * 0.44);
      ctx.fillStyle = '#6bcb77';
      ctx.font = '700 20px Avenir Next,Trebuchet MS,sans-serif';
      ctx.fillText('All balloons collected!', WIDTH * 0.5, HEIGHT * 0.58);
    } else {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '900 54px Avenir Next,Trebuchet MS,sans-serif';
      ctx.fillText(this.hitsLeft <= 0 ? 'STUNG OUT!' : "TIME'S UP!", WIDTH * 0.5, HEIGHT * 0.44);
      ctx.fillStyle = '#d7f4ff';
      ctx.font = '700 20px Avenir Next,Trebuchet MS,sans-serif';
      ctx.fillText('Returning to Grandma\'s House...', WIDTH * 0.5, HEIGHT * 0.58);
    }
  }

  update(dt, input) {
    if (!this.active || this._winPending || this._endPending) return;

    this.timerSec = Math.max(0, this.timerSec - dt);
    if (this.invulnSec > 0) this.invulnSec = Math.max(0, this.invulnSec - dt);

    // Baby movement (free float, no gravity)
    const mx = input.getMoveX();
    const my = input.getMoveY();
    this.babyVx = mx * BABY_SPEED;
    this.babyVy = -my * BABY_SPEED;
    this.babyX = clamp(this.babyX + this.babyVx * dt, BABY_R, WIDTH - BABY_R);
    this.babyY = clamp(this.babyY + this.babyVy * dt, BABY_R, HEIGHT - BABY_R);

    // Balloon collection
    let collected = 0;
    for (const b of this.balloons) {
      if (b.collected) { collected++; continue; }
      const dx = this.babyX - b.x;
      const dy = this.babyY - b.y;
      if (dx * dx + dy * dy < (BABY_R + b.r) ** 2) {
        b.collected = true;
        collected++;
      }
    }

    // Bee movement — wander with sine offset
    for (const bee of this.bees) {
      bee.phase += dt * 1.6;
      bee.x += (bee.vx + Math.sin(bee.phase * 0.7) * 30) * dt;
      bee.y += (bee.vy + Math.cos(bee.phase * 0.9) * 30) * dt;
      // Bounce off walls
      if (bee.x < BEE_R || bee.x > WIDTH - BEE_R) { bee.vx *= -1; bee.x = clamp(bee.x, BEE_R, WIDTH - BEE_R); }
      if (bee.y < BEE_R || bee.y > HEIGHT - BEE_R) { bee.vy *= -1; bee.y = clamp(bee.y, BEE_R, HEIGHT - BEE_R); }

      // Bee hit
      if (this.invulnSec <= 0) {
        const dx = this.babyX - bee.x;
        const dy = this.babyY - bee.y;
        if (dx * dx + dy * dy < (BABY_R + BEE_R) ** 2) {
          this.hitsLeft--;
          this.invulnSec = 1.8;
          if (this.hitsLeft <= 0) {
            this._triggerEnd(false);
            return;
          }
        }
      }
    }

    if (collected >= BALLOON_COUNT) {
      this._triggerEnd(true);
      return;
    }
    if (this.timerSec <= 0) {
      this._triggerEnd(false);
      return;
    }

    this.render(collected);
  }

  render(collected = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = Date.now() / 1000;

    // Sky gradient background
    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, '#0d1b3e');
    bg.addColorStop(1, '#1a3a6e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Clouds (decorative)
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 5; i++) {
      const cx = (i * 157 + t * 8) % (WIDTH + 80) - 40;
      const cy = 40 + i * 52;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 48, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Balloons
    for (const b of this.balloons) {
      if (b.collected) continue;
      const bobY = b.y + Math.sin(t * 1.4 + b.bobPhase) * 4;
      // String
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, bobY + b.r);
      ctx.lineTo(b.x, bobY + b.r + 12);
      ctx.stroke();
      // Balloon body
      ctx.beginPath();
      ctx.arc(b.x, bobY, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, bobY - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fill();
    }

    // Bees
    for (const bee of this.bees) {
      ctx.save();
      ctx.translate(bee.x, bee.y);
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, BEE_R, BEE_R * 0.72, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd93d';
      ctx.fill();
      ctx.strokeStyle = '#2d2100';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Stripes
      ctx.fillStyle = '#2d2100';
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(i * BEE_R * 0.45 - 2, -BEE_R * 0.65, 4, BEE_R * 1.3);
      }
      // Clip to body
      ctx.beginPath();
      ctx.ellipse(0, 0, BEE_R, BEE_R * 0.72, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.clearRect(-BEE_R, -BEE_R, BEE_R * 2, BEE_R * 2);
      ctx.fillStyle = '#ffd93d';
      ctx.ellipse(0, 0, BEE_R, BEE_R * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wing
      ctx.restore();
      ctx.save();
      ctx.translate(bee.x, bee.y - BEE_R * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, -7, 9, 5, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,230,255,0.55)';
      ctx.fill();
      ctx.restore();
    }

    // Baby (player)
    const invulnBlink = this.invulnSec > 0 && Math.floor(this.invulnSec * 8) % 2 === 0;
    if (!invulnBlink) {
      // Body
      ctx.beginPath();
      ctx.arc(this.babyX, this.babyY, BABY_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcba4';
      ctx.fill();
      ctx.strokeStyle = '#c47a5a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Face
      ctx.fillStyle = '#3a2c1f';
      ctx.beginPath();
      ctx.arc(this.babyX - 5, this.babyY - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(this.babyX + 5, this.babyY - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.babyX, this.babyY + 4, 4, 0, Math.PI);
      ctx.strokeStyle = '#3a2c1f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // HUD: status bar
    const remaining = this.balloons.filter(b => !b.collected).length;
    const timerPct = this.timerSec / TIMER_SEC;
    const timerColor = timerPct > 0.4 ? '#6bcb77' : timerPct > 0.2 ? '#ffd93d' : '#ff6b6b';

    // Timer bar across top
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, WIDTH, 18);
    ctx.fillStyle = timerColor;
    ctx.fillRect(0, 0, WIDTH * timerPct, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '700 12px Avenir Next,Trebuchet MS,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.timerSec)}s`, WIDTH * 0.5, 13);

    // Status footer
    this.statusEl.textContent = `Balloons: ${BALLOON_COUNT - remaining}/${BALLOON_COUNT}  |  Hits left: ${this.hitsLeft}`;
  }
}
