const MAZE_LAYOUT = [
  '###################',
  '#S....#.....#....o#',
  '#.###.#.###.#.###.#',
  '#...#.#...#.#...#.#',
  '###.#.###.#.###.#.#',
  '#...#.....#.....#.#',
  '#.#####.#####.###.#',
  '#.....#...#...#...#',
  '#.###.###.#.###.###',
  '#.#...#...#...#..A#',
  '#.#.###.#####.##..#',
  '#o#.....#.....#..C#',
  '###################',
];

const TILE = 28;
const PLAYER_STEP_SEC = 0.11;
const ENEMY_STEP_SEC = 0.15;
const POWER_DURATION_SEC = 6;

function dirs() {
  return {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };
}

function vecKey(x, y) {
  return `${x},${y}`;
}

function parseMaze() {
  const walls = new Set();
  const fruits = new Set();
  const powerUps = new Set();
  let playerStart = { x: 1, y: 1 };
  const enemies = [];

  for (let y = 0; y < MAZE_LAYOUT.length; y += 1) {
    for (let x = 0; x < MAZE_LAYOUT[y].length; x += 1) {
      const cell = MAZE_LAYOUT[y][x];
      const key = vecKey(x, y);
      if (cell === '#') walls.add(key);
      if (cell === '.') fruits.add(key);
      if (cell === 'o') powerUps.add(key);
      if (cell === 'S') playerStart = { x, y };
      if (cell === 'A') enemies.push({ type: 'alien', start: { x, y } });
      if (cell === 'C') enemies.push({ type: 'cow', start: { x, y } });
    }
  }

  return { walls, fruits, powerUps, playerStart, enemies };
}

function chooseInputDir(input) {
  const moveX = input.getMoveX();
  const moveY = input.getMoveY();
  if (moveX > 0) return dirs().right;
  if (moveX < 0) return dirs().left;
  if (moveY > 0) return dirs().up;
  if (moveY < 0) return dirs().down;
  return null;
}

function validDirs(agent, walls) {
  return Object.values(dirs()).filter((dir) => !walls.has(vecKey(agent.x + dir.x, agent.y + dir.y)));
}

function clampChoice(currentDir, choices) {
  if (!currentDir) return null;
  return choices.find((dir) => dir.x === currentDir.x && dir.y === currentDir.y) || null;
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export class FruitMazeMinigame {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'dada-fruit-maze';
    this.root.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at center, rgba(36,30,24,0.82), rgba(10,8,8,0.94))',
      'z-index:2200',
      'pointer-events:none',
    ].join(';');

    this.panel = document.createElement('div');
    this.panel.style.cssText = [
      'padding:18px 20px 16px',
      'border-radius:18px',
      'border:2px solid rgba(255,214,142,0.44)',
      'background:linear-gradient(180deg, rgba(28,18,34,0.96), rgba(18,12,22,0.98))',
      'box-shadow:0 18px 58px rgba(0,0,0,0.42)',
      'transform:scale(0.8) rotate(-14deg)',
      'transition:transform 0.32s ease, opacity 0.32s ease',
      'opacity:0',
    ].join(';');
    this.root.appendChild(this.panel);

    this.title = document.createElement('div');
    this.title.textContent = 'FRUIT MAZE';
    this.title.style.cssText = 'font:900 28px/1.1 Avenir Next, Trebuchet MS, sans-serif;color:#ffe9a8;letter-spacing:0.08em;text-align:center;text-shadow:0 2px 0 rgba(0,0,0,0.4);';
    this.panel.appendChild(this.title);

    this.sub = document.createElement('div');
    this.sub.textContent = 'Collect fruit, dodge aliens and cows, grab the power snack.';
    this.sub.style.cssText = 'margin-top:6px;font:700 13px/1.35 Avenir Next, Trebuchet MS, sans-serif;color:#d7d8ff;text-align:center;letter-spacing:0.02em;';
    this.panel.appendChild(this.sub);

    this.canvas = document.createElement('canvas');
    this.canvas.width = MAZE_LAYOUT[0].length * TILE;
    this.canvas.height = MAZE_LAYOUT.length * TILE;
    this.canvas.style.cssText = 'display:block;margin-top:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.14);background:#151019;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);';
    this.panel.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.footer = document.createElement('div');
    this.footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:12px;font:700 12px/1.35 Avenir Next, Trebuchet MS, sans-serif;color:#f3efe4;';
    this.panel.appendChild(this.footer);

    this.statusEl = document.createElement('div');
    this.statusEl.textContent = 'FRUIT 0 / 0';
    this.footer.appendChild(this.statusEl);

    this.powerEl = document.createElement('div');
    this.powerEl.textContent = 'POWER READY';
    this.footer.appendChild(this.powerEl);

    document.body.appendChild(this.root);

    this.base = parseMaze();
    this.active = false;
    this.onWin = null;
    this.onAbort = null;
    this.resetState();
  }

  resetState() {
    this.player = {
      ...this.base.playerStart,
      dir: dirs().right,
      desiredDir: dirs().right,
    };
    this.enemyStates = this.base.enemies.map((enemy, index) => ({
      type: enemy.type,
      x: enemy.start.x,
      y: enemy.start.y,
      start: { ...enemy.start },
      dir: index % 2 === 0 ? dirs().left : dirs().up,
    }));
    this.fruits = new Set(this.base.fruits);
    this.powerUps = new Set(this.base.powerUps);
    this.powerTimer = 0;
    this.playerStepAccum = 0;
    this.enemyStepAccum = 0;
    this.message = '';
    this.render();
  }

  start({ onWin, onAbort } = {}) {
    this.onWin = onWin || null;
    this.onAbort = onAbort || null;
    this.active = true;
    this.resetState();
    this.root.style.display = 'flex';
    requestAnimationFrame(() => {
      this.panel.style.transform = 'scale(1) rotate(0deg)';
      this.panel.style.opacity = '1';
    });
  }

  stop() {
    this.active = false;
    this.panel.style.transform = 'scale(0.84) rotate(10deg)';
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

  moveAgent(agent, dir) {
    const nextX = agent.x + dir.x;
    const nextY = agent.y + dir.y;
    if (this.base.walls.has(vecKey(nextX, nextY))) return false;
    agent.x = nextX;
    agent.y = nextY;
    agent.dir = dir;
    return true;
  }

  chooseEnemyDir(enemy) {
    const choices = validDirs(enemy, this.base.walls);
    if (!choices.length) return enemy.dir;
    const playerDist = (dir) => manhattan(enemy.x + dir.x, enemy.y + dir.y, this.player.x, this.player.y);
    if (this.powerTimer > 0) {
      return choices.sort((a, b) => playerDist(b) - playerDist(a))[0];
    }
    const chaseBias = enemy.type === 'alien' ? 0.72 : 0.52;
    if (Math.random() < chaseBias) {
      return choices.sort((a, b) => playerDist(a) - playerDist(b))[0];
    }
    return clampChoice(enemy.dir, choices) || choices[(enemy.x + enemy.y + (enemy.type === 'cow' ? 1 : 0)) % choices.length];
  }

  checkPickup() {
    const key = vecKey(this.player.x, this.player.y);
    if (this.fruits.has(key)) {
      this.fruits.delete(key);
    }
    if (this.powerUps.has(key)) {
      this.powerUps.delete(key);
      this.powerTimer = POWER_DURATION_SEC;
      this.message = 'POWER SNACK!';
    }
    if (this.fruits.size === 0) {
      this.stop();
      this.onWin?.();
    }
  }

  checkEnemyHit() {
    for (const enemy of this.enemyStates) {
      if (enemy.x !== this.player.x || enemy.y !== this.player.y) continue;
      if (this.powerTimer > 0) {
        enemy.x = enemy.start.x;
        enemy.y = enemy.start.y;
        enemy.dir = dirs().left;
        this.message = 'CHOMP!';
      } else {
        this.message = 'BONK! TRY AGAIN';
        this.resetState();
      }
      break;
    }
  }

  update(dt, input) {
    if (!this.active) return;
    this.powerTimer = Math.max(0, this.powerTimer - dt);
    this.playerStepAccum += dt;
    this.enemyStepAccum += dt;

    const desiredDir = chooseInputDir(input);
    if (desiredDir) this.player.desiredDir = desiredDir;

    while (this.playerStepAccum >= PLAYER_STEP_SEC) {
      this.playerStepAccum -= PLAYER_STEP_SEC;
      if (!this.moveAgent(this.player, this.player.desiredDir)) {
        this.moveAgent(this.player, this.player.dir);
      }
      this.checkPickup();
      this.checkEnemyHit();
      if (!this.active) return;
    }

    while (this.enemyStepAccum >= ENEMY_STEP_SEC) {
      this.enemyStepAccum -= ENEMY_STEP_SEC;
      for (const enemy of this.enemyStates) {
        const dir = this.chooseEnemyDir(enemy);
        this.moveAgent(enemy, dir);
      }
      this.checkEnemyHit();
      if (!this.active) return;
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#120d18';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < MAZE_LAYOUT.length; y += 1) {
      for (let x = 0; x < MAZE_LAYOUT[y].length; x += 1) {
        const key = vecKey(x, y);
        const px = x * TILE;
        const py = y * TILE;
        if (this.base.walls.has(key)) {
          ctx.fillStyle = '#40305a';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#5e4b7d';
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          continue;
        }
        ctx.fillStyle = '#19131f';
        ctx.fillRect(px, py, TILE, TILE);
        if (this.fruits.has(key)) {
          ctx.fillStyle = '#f7b55d';
          ctx.beginPath();
          ctx.arc(px + TILE * 0.5, py + TILE * 0.5, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (this.powerUps.has(key)) {
          ctx.fillStyle = '#7cf3ff';
          ctx.beginPath();
          ctx.arc(px + TILE * 0.5, py + TILE * 0.5, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const enemy of this.enemyStates) {
      const px = enemy.x * TILE;
      const py = enemy.y * TILE;
      ctx.fillStyle = enemy.type === 'alien'
        ? (this.powerTimer > 0 ? '#4ff7b4' : '#e96aa6')
        : (this.powerTimer > 0 ? '#6be3ff' : '#e9f0f4');
      ctx.beginPath();
      ctx.roundRect(px + 4, py + 6, TILE - 8, TILE - 12, 10);
      ctx.fill();
      ctx.fillStyle = '#1b1320';
      ctx.fillRect(px + 9, py + 12, 4, 4);
      ctx.fillRect(px + TILE - 13, py + 12, 4, 4);
    }

    const playerPx = this.player.x * TILE;
    const playerPy = this.player.y * TILE;
    ctx.fillStyle = '#ffdf8f';
    ctx.beginPath();
    ctx.arc(playerPx + TILE * 0.5, playerPy + TILE * 0.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#402b2d';
    ctx.fillRect(playerPx + 9, playerPy + 10, 4, 4);
    ctx.fillRect(playerPx + TILE - 13, playerPy + 10, 4, 4);
    ctx.beginPath();
    ctx.arc(playerPx + TILE * 0.5, playerPy + 17, 5, 0, Math.PI);
    ctx.strokeStyle = '#402b2d';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.statusEl.textContent = `FRUIT ${this.base.fruits.size - this.fruits.size} / ${this.base.fruits.size}`;
    this.powerEl.textContent = this.powerTimer > 0 ? `POWER ${this.powerTimer.toFixed(1)}s` : (this.message || 'POWER READY');
    if (this.powerTimer <= 0 && this.message) {
      this.message = '';
    }
  }
}
