const WIDTH = 760;
const HEIGHT = 420;
const WIN_SCORE = 5;
const PADDLE_W = 14;
const PADDLE_H = 92;
const BALL_SIZE = 14;
const PLAYER_X = 42;
const CPU_X = WIDTH - 42 - PADDLE_W;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makePanelText(el, text, style) {
  el.textContent = text;
  el.style.cssText = style;
}

export class PongMinigame {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'dada-pong';
    this.root.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at center, rgba(8,14,24,0.82), rgba(6,8,14,0.96))',
      'z-index:2200',
      'pointer-events:none',
    ].join(';');

    this.panel = document.createElement('div');
    this.panel.style.cssText = [
      'padding:18px 20px 16px',
      'border-radius:18px',
      'border:2px solid rgba(122, 233, 255, 0.34)',
      'background:linear-gradient(180deg, rgba(10,16,24,0.96), rgba(6,10,18,0.99))',
      'box-shadow:0 18px 58px rgba(0,0,0,0.42)',
      'transform:scale(1) translateY(0)',
      'transition:transform 0.28s ease, opacity 0.28s ease',
      'opacity:1',
    ].join(';');
    this.root.appendChild(this.panel);

    this.title = document.createElement('div');
    this.title.id = 'pongTitle';
    makePanelText(
      this.title,
      'PONG PANIC',
      'font:900 28px/1.1 Avenir Next, Trebuchet MS, sans-serif;color:#b8fbff;letter-spacing:0.08em;text-align:center;text-shadow:0 2px 0 rgba(0,0,0,0.45);'
    );
    this.panel.appendChild(this.title);

    this.sub = document.createElement('div');
    makePanelText(
      this.sub,
      'Win 5 points to bounce back into the condo.',
      'margin-top:6px;font:700 13px/1.35 Avenir Next, Trebuchet MS, sans-serif;color:#d7f4ff;text-align:center;letter-spacing:0.02em;'
    );
    this.panel.appendChild(this.sub);

    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.cssText = [
      'display:block',
      'width:min(86vw, 760px)',
      'height:auto',
      'margin-top:14px',
      'border-radius:12px',
      'border:1px solid rgba(255,255,255,0.14)',
      'background:#09111b',
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)',
    ].join(';');
    this.panel.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.footer = document.createElement('div');
    this.footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:12px;font:700 12px/1.35 Avenir Next, Trebuchet MS, sans-serif;color:#eaf9ff;';
    this.panel.appendChild(this.footer);

    this.scoreEl = document.createElement('div');
    this.footer.appendChild(this.scoreEl);

    this.helpEl = document.createElement('div');
    this.footer.appendChild(this.helpEl);

    document.body.appendChild(this.root);

    this.active = false;
    this.onWin = null;
    this.onAbort = null;
    this.resetState();
  }

  resetState() {
    this.playerScore = 0;
    this.cpuScore = 0;
    this.playerY = (HEIGHT * 0.5) - (PADDLE_H * 0.5);
    this.cpuY = this.playerY;
    this.ballX = WIDTH * 0.5;
    this.ballY = HEIGHT * 0.5;
    this.ballVx = -290;
    this.ballVy = 120;
    this.serveTimer = 0.7;
    this.flashTimer = 0;
    this.message = 'First to 5';
    this._winPending = false;
    this.render();
  }

  start({ onWin, onAbort } = {}) {
    this.onWin = onWin || null;
    this.onAbort = onAbort || null;
    this.active = true;
    this.resetState();
    this.root.style.display = 'flex';
    // Force a layout flush so the entrance transition consistently runs in preview/headless.
    void this.panel.getBoundingClientRect();
    this.panel.style.transform = 'scale(1) translateY(0)';
    this.panel.style.opacity = '1';
  }

  stop() {
    this.active = false;
    this.panel.style.transform = 'scale(0.86) translateY(10px)';
    this.panel.style.opacity = '0';
    setTimeout(() => {
      if (!this.active) {
        this.root.style.display = 'none';
      }
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

  scorePoint(playerWon) {
    if (playerWon) {
      this.playerScore += 1;
      this.message = 'Nice return!';
    } else {
      this.cpuScore += 1;
      this.message = 'Keep paddling!';
    }
    this.flashTimer = 0.28;
    if (this.playerScore >= WIN_SCORE) {
      this._winPending = true;
      this.title.textContent = 'YOU WON!';
      this.sub.textContent = 'Bouncing back into the condo...';
      this.title.style.color = '#ffd700';
      this._drawWinOverlay();
      setTimeout(() => {
        if (this._winPending) {
          this._winPending = false;
          this.stop();
          this.onWin?.();
        }
      }, 1500);
      return;
    }
    this.ballX = WIDTH * 0.5;
    this.ballY = HEIGHT * 0.5;
    this.ballVx = playerWon ? -300 : 300;
    this.ballVy = playerWon ? -110 : 110;
    this.serveTimer = 0.7;
  }

  _drawWinOverlay() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 68px Avenir Next, Trebuchet MS, sans-serif';
    ctx.fillText('YOU WON!', WIDTH * 0.5, HEIGHT * 0.44);
    ctx.fillStyle = '#b8fbff';
    ctx.font = '700 22px Avenir Next, Trebuchet MS, sans-serif';
    ctx.fillText('Returning to the condo...', WIDTH * 0.5, HEIGHT * 0.58);
  }

  update(dt, input) {
    if (!this.active || this._winPending) return;

    this.flashTimer = Math.max(0, this.flashTimer - dt);
    const playerMove = input.getMoveY();
    const playerSpeed = 380;
    this.playerY = clamp(this.playerY - (playerMove * playerSpeed * dt), 16, HEIGHT - PADDLE_H - 16);

    const cpuCenter = this.cpuY + (PADDLE_H * 0.5);
    const chase = clamp((this.ballY - cpuCenter) * 2.1, -320, 320);
    this.cpuY = clamp(this.cpuY + (chase * dt), 16, HEIGHT - PADDLE_H - 16);

    if (this.serveTimer > 0) {
      this.serveTimer = Math.max(0, this.serveTimer - dt);
      this.render();
      return;
    }

    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    if (this.ballY <= 16 || this.ballY >= HEIGHT - 16) {
      this.ballY = clamp(this.ballY, 16, HEIGHT - 16);
      this.ballVy *= -1;
    }

    const playerHit = this.ballX <= (PLAYER_X + PADDLE_W)
      && this.ballX >= PLAYER_X
      && this.ballY >= this.playerY - 6
      && this.ballY <= this.playerY + PADDLE_H + 6
      && this.ballVx < 0;
    if (playerHit) {
      const offset = ((this.ballY - (this.playerY + (PADDLE_H * 0.5))) / (PADDLE_H * 0.5));
      this.ballX = PLAYER_X + PADDLE_W + 2;
      this.ballVx = 300 + (Math.abs(offset) * 68);
      this.ballVy = offset * 260;
      this.message = 'Return!';
      this.flashTimer = 0.12;
    }

    const cpuHit = this.ballX >= CPU_X - BALL_SIZE
      && this.ballX <= CPU_X + PADDLE_W
      && this.ballY >= this.cpuY - 6
      && this.ballY <= this.cpuY + PADDLE_H + 6
      && this.ballVx > 0;
    if (cpuHit) {
      const offset = ((this.ballY - (this.cpuY + (PADDLE_H * 0.5))) / (PADDLE_H * 0.5));
      this.ballX = CPU_X - 2;
      this.ballVx = -(300 + (Math.abs(offset) * 64));
      this.ballVy = offset * 240;
      this.message = 'Stay with it!';
      this.flashTimer = 0.12;
    }

    if (this.ballX < -40) {
      this.scorePoint(false);
    } else if (this.ballX > WIDTH + 40) {
      this.scorePoint(true);
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, '#0a1824');
    bg.addColorStop(1, '#09111b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(184, 251, 255, 0.26)';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(WIDTH * 0.5, 20);
    ctx.lineTo(WIDTH * 0.5, HEIGHT - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = this.flashTimer > 0 ? '#cfffff' : '#b8fbff';
    ctx.fillRect(PLAYER_X, this.playerY, PADDLE_W, PADDLE_H);
    ctx.fillRect(CPU_X, this.cpuY, PADDLE_W, PADDLE_H);

    ctx.fillStyle = '#ffd970';
    ctx.fillRect(this.ballX - (BALL_SIZE * 0.5), this.ballY - (BALL_SIZE * 0.5), BALL_SIZE, BALL_SIZE);

    ctx.fillStyle = 'rgba(240, 248, 252, 0.9)';
    ctx.font = '700 52px Avenir Next, Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.playerScore), WIDTH * 0.5 - 54, 72);
    ctx.fillText(String(this.cpuScore), WIDTH * 0.5 + 54, 72);

    this.scoreEl.textContent = `PONG ${this.playerScore} - ${this.cpuScore}`;
    this.helpEl.textContent = this.serveTimer > 0 ? 'W/S or ↑/↓ to move' : this.message;
  }
}
