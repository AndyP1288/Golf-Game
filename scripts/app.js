/* =========================================================================
   Golf Worlds - scripts/app.js
   Contains five playable 2D worlds (all canvas-based):
     1) Pro Golfer World - realistic timing/angle/power + follow-through + par/strokes
     2) Greenskeeper World - timed "water patches" drying mechanic & repair tasks
     3) Course Designer World - paintbrush tool to paint sand, water, grass, green
     4) Caddy / Carrying World - move golf bags between points with physics & stamina
     5) Club Manager World - manage event logistics, schedule, budget mini-game
   Features:
     - Main menu with clickable world thumbnails
     - Back-to-menu and Play-again UI
     - Polished visuals with transitions & easing
     - Clear comments and modular structure for future extension
   Notes:
     - This is pure JS/Canvas (no external libs), runs offline
     - Tune constants (gravity, friction) near top of each world
   ========================================================================= */

/* ============================
   Utility / Polyfills & Setup
   ============================ */

(() => {
  'use strict';

  // Create root element if not already present
  const existingRoot = document.getElementById('app-root');
  const root = existingRoot || (function () {
    const r = document.createElement('div');
    r.id = 'app-root';
    document.body.appendChild(r);
    return r;
  })();

  // Basic stylesheet injection for overlay UI
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#e7f4f2;--panel:#ffffffcc;--accent:#00695c;--muted:#6b6b6b}
    body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial}
    #app-root{position:fixed;left:0;top:0;right:0;bottom:0;background:linear-gradient(180deg,var(--bg),#d2f0ea);display:flex;align-items:center;justify-content:center}
    .panel{background:var(--panel);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:18px;max-width:1200px;width:95%;max-height:90vh;overflow:hidden;display:flex;flex-direction:row;gap:16px}
    .menu-col{width:340px;display:flex;flex-direction:column;gap:12px}
    .title{font-size:20px;font-weight:700;color:var(--accent);margin-bottom:4px}
    .subtitle{font-size:13px;color:var(--muted);margin-bottom:8px}
    .world-tile{display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;cursor:pointer;border:1px solid rgba(0,0,0,.04);transition:transform .12s ease, box-shadow .12s ease}
    .world-tile:hover{transform:translateY(-4px);box-shadow:0 8px 18px rgba(0,0,0,.08)}
    .world-thumb{width:64px;height:48px;border-radius:6px;flex-shrink:0;background:linear-gradient(90deg,#fff,#eee);display:flex;align-items:center;justify-content:center;font-weight:700;color:#333}
    .world-info{flex:1}
    .play-btn{background:var(--accent);color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer}
    .canvas-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
    .hud{position:absolute;left:20px;top:20px;background:#ffffffaa;padding:8px 10px;border-radius:8px;backdrop-filter:blur(4px)}
    .bottom-bar{position:absolute;left:50%;transform:translateX(-50%);bottom:18px;background:#00000011;padding:8px 12px;border-radius:999px}
    .small{font-size:12px;color:#222}
    .btn-secondary{background:transparent;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:8px;cursor:pointer}
    .center-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%}
    .overlay-win{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.5));color:white;font-size:20px;flex-direction:column;gap:12px}
    .input{padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.08)}
    .pill{background:#fff;padding:6px 10px;border-radius:999px;border:1px solid rgba(0,0,0,.06)}
    .muted{color:#666;font-size:12px}
  `;
  document.head.appendChild(style);

/* =========================
   Global Canvas & Systems
   ========================= */

// Create canvas area inside panel
const panel = document.createElement('div');
panel.className = 'panel';

// Left column: menu / world list
const left = document.createElement('div');
left.className = 'menu-col'; // <-- scrollable now
left.style.overflowY = 'auto'; // Added scroll

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'Golf Worlds — Careers on the Green';

const subtitle = document.createElement('div');
subtitle.className = 'subtitle';
subtitle.textContent = 'Jump into immersive mini-worlds that demonstrate 5 different golf careers. Play and learn.';

left.appendChild(title);
left.appendChild(subtitle);

// world definitions (id, name, summary, color)
const worlds = [
  { id: 'pro', name: 'Pro Golfer', summary: 'Power, angle, and course strategy. Play par-3 course. Realistic ball flight and putts.', color: '#a6f0c6' },
  { id: 'designer', name: 'Course Designer', summary: 'Paint terrain, place hazards, test play lines and difficulty.', color: '#ffe9a3' },
  { id: 'greens', name: 'Greenskeeper', summary: 'Repair damage, manage irrigation, and keep turf healthy under time pressure.', color: '#c8e7ff' },
  { id: 'caddy', name: 'Caddy (Carrying)', summary: 'Carry gear, manage stamina, accurately place the bag and clubs under constraints.', color: '#ffd6da' },
  { id: 'manager', name: 'Club Manager', summary: 'Plan events, manage budget & logistics — keep players happy.', color: '#e6d1ff' }
];

// Tile factory
const tiles = {};
worlds.forEach(w => {
  const tile = document.createElement('div');
  tile.className = 'world-tile';
  tile.dataset.world = w.id;
  tile.innerHTML = `<div class="world-thumb" style="background:linear-gradient(90deg,${w.color},#fff)">${w.name.split(' ').map(s => s[0]).join('')}</div>
                    <div class="world-info">
                      <div style="font-weight:600">${w.name}</div>
                      <div class="muted">${w.summary}</div>
                    </div>
                    <div><button class="play-btn">Play</button></div>`;
  left.appendChild(tile);
  tiles[w.id] = tile;
});

// Right column: canvas + HUD
const right = document.createElement('div');
right.className = 'canvas-wrap';

// Canvas setup
const canvas = document.createElement('canvas');
canvas.id = 'gw-canvas';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.tabIndex = 0; // to capture keys
right.appendChild(canvas);

// HUD (top-left)
const hud = document.createElement('div');
hud.className = 'hud small';
hud.innerHTML = `<div id="hud-world">Select a world</div><div id="hud-sub" class="muted">Click a tile to begin</div>`;
right.appendChild(hud);

// bottom bar
const bottom = document.createElement('div');
bottom.className = 'bottom-bar small';
bottom.innerHTML = `<button id="btn-back" class="btn-secondary">Back to Menu</button> <span id="status-pill" class="pill">Idle</span>`;
right.appendChild(bottom);

panel.appendChild(left);
panel.appendChild(right);
root.appendChild(panel);

// Responsive canvas sizing logic
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  // physical size equals container size for crisp drawing
  const rect = right.getBoundingClientRect();
  canvas.width = Math.max(800, Math.floor(rect.width));
  canvas.height = Math.max(480, Math.floor(rect.height));
}
window.addEventListener('resize', () => {
  resizeCanvas();
  if (currentWorld && currentWorld.onResize) currentWorld.onResize();
});

resizeCanvas();

// Global game state
let currentWorld = null;
let animationFrameId = null;
let mouse = { x: 0, y: 0, down: false };
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (currentWorld && currentWorld.onMouseMove) currentWorld.onMouseMove(mouse);
});
canvas.addEventListener('mousedown', e => { mouse.down = true; if (currentWorld && currentWorld.onMouseDown) currentWorld.onMouseDown(mouse); });
canvas.addEventListener('mouseup', e => { mouse.down = false; if (currentWorld && currentWorld.onMouseUp) currentWorld.onMouseUp(mouse); });
canvas.addEventListener('mouseleave', e => { mouse.down = false; if (currentWorld && currentWorld.onMouseLeave) currentWorld.onMouseLeave(mouse); });

// Keyboard handling (space, arrows)
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; if (currentWorld && currentWorld.onKeyDown) currentWorld.onKeyDown(e.code); });
window.addEventListener('keyup', e => { keys[e.code] = false; if (currentWorld && currentWorld.onKeyUp) currentWorld.onKeyUp(e.code); });

// Small UI functions
const hudWorld = document.getElementById('hud-world');
const hudSub = document.getElementById('hud-sub');
const btnBack = document.getElementById('btn-back');
const statusPill = document.getElementById('status-pill');

btnBack.addEventListener('click', () => {
  stopCurrentWorld();
  showMenu();
});

// Menu handlers
function showMenu() {
  // highlight none
  Object.values(tiles).forEach(t => t.style.opacity = '1');
  hudWorld.textContent = 'Select a world';
  hudSub.textContent = 'Click a tile to begin.';
  statusPill.textContent = 'Idle';
  // stop any world
  stopCurrentWorld();
}

Object.values(tiles).forEach(tile => {
  tile.addEventListener('click', () => {
    const w = tile.dataset.world;
    startWorld(w);
  });
  const btn = tile.querySelector('button.play-btn');
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const w = tile.dataset.world;
    startWorld(w);
  });
});

// Stopping current world (cleanup)
function stopCurrentWorld() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (currentWorld && currentWorld.onStop) currentWorld.onStop();
  currentWorld = null;
  // clear canvas
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

  /* ===========================
     Shared drawing utilities
     =========================== */
  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ===========================
     World: Pro Golfer (realistic 2D)
     =========================== */
function createProGolferWorld() {
  // Configuration
  const groundH = Math.floor(canvas.height * 0.20);
  const teeX = Math.floor(canvas.width * 0.12);
  const holeX = Math.floor(canvas.width * 0.82);
  const holeY = canvas.height - groundH - 6;
  const ballRadius = 8;
  const gravity = 0.45; // pixels/frame^2
  const friction = 0.995;
  const wind = () => (Math.random() * 2 - 1) * 0.1; // small random drift applied per frame

  let par = 3;
  let strokes = 0;
  let ball = null; // {x,y,vx,vy,onGround}
  let charging = false;
  let power = 0; // 0..100
  let angle = Math.PI / 4; // radians
  let lastShotTime = 0;
  let windStrength = (Math.random() * 1.2 - .6);
  let showWinOverlay = false;
  let overlayText = '';

  // Reset ball to tee
  function resetBall() {
    ball = { x: teeX, y: canvas.height - groundH - ballRadius, vx: 0, vy: 0, onGround: true };
    strokes = 0;
    charging = false;
    power = 0;
    showWinOverlay = false;
    overlayText = '';
    statusPill.textContent = `Par ${par} — Strokes ${strokes}/${par}`;
  }

  resetBall();

  // Physics update
  function physicsStep() {
    if (!ball.onGround) {
      ball.vy += gravity;
      ball.vx *= friction;
      ball.vx += windStrength * 0.01;
      ball.x += ball.vx;
      ball.y += ball.vy;

      const groundY = canvas.height - groundH - ballRadius;
      if (ball.y >= groundY) {
        ball.y = groundY;
        ball.onGround = true;
        if (Math.abs(ball.vy) > 1.5) {
          ball.vy *= -0.2;
          ball.vx *= 0.8;
          ball.onGround = false;
        } else {
          ball.vy = 0;
          ball.vx *= 0.9;
        }
      }
      if (ball.x < -50 || ball.x > canvas.width + 50 || ball.y > canvas.height + 200) {
        overlayText = 'Ball out of bounds — Reset to tee';
        showWinOverlay = true;
      }
    }
  }

  // Check for hole-in
  function checkHoleIn() {
    const dx = ball.x - holeX;
    const dy = ball.y - holeY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
    const thresholdSpeed = 1.6;
    if (dist < ballRadius + 10) {
      if (speed <= thresholdSpeed) {
        overlayText = `Hole in ${strokes} stroke${strokes===1?'':'s'}!`;
        showWinOverlay = true;
        statusPill.textContent = 'Hole!';
      } else {
        ball.vx += (dx / (dist||1)) * 0.8;
        ball.vy -= 0.8;
      }
    }
  }

  // Draw function
  function drawScene() {
    // sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    skyGrad.addColorStop(0, '#bfefff');
    skyGrad.addColorStop(1, '#8ed09b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // distant hills
    ctx.fillStyle = '#6dbb7b';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.3, canvas.height * 0.55, canvas.width * 0.4, canvas.height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a9b66';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.85, canvas.height * 0.6, canvas.width * 0.3, canvas.height * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // ground
    ctx.fillStyle = '#1e7b4a';
    ctx.fillRect(0, canvas.height - groundH, canvas.width, groundH);

    // tee area
    ctx.fillStyle = '#0c5c38';
    ctx.fillRect(teeX - 20, canvas.height - groundH - 6, 44, 10);

    // flag & hole
    ctx.beginPath();
    ctx.fillStyle = 'black';
    ctx.arc(holeX, holeY, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(holeX - 2, holeY - 60, 4, 60);
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.moveTo(holeX + 2, holeY - 60);
    ctx.lineTo(holeX + 28, holeY - 48);
    ctx.lineTo(holeX + 2, holeY - 36);
    ctx.closePath();
    ctx.fill();

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.stroke();

    // swing UI
    if (ball.onGround) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      const len = 60 + (power * 0.6);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y - 2);
      ctx.lineTo(ball.x + Math.cos(angle) * len, ball.y - Math.sin(angle) * len);
      ctx.stroke();

      const barWidth = 220;
      const barX = canvas.width / 2 - barWidth/2;
      const barY = canvas.height - 44;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      drawRoundedRect(ctx, barX, barY, barWidth, 12, 6);
      ctx.fillStyle = '#00c853';
      const pw = clamp(power/100, 0, 1) * (barWidth - 2);
      drawRoundedRect(ctx, barX+1, barY+1, pw, 10, 6);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter';
      ctx.fillText(`Power: ${Math.round(power)}%`, barX + barWidth + 10, barY + 10);
    }

    // heads-up
    ctx.font = '14px Inter';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Par ${par} • Strokes ${strokes}/${par}`, 18, 26);
    ctx.fillText(`Wind: ${windStrength.toFixed(2)}`, 18, 46);
  }

  // Input handling
  function onKeyDown(code) {
    if (code === 'Space' && ball.onGround && !charging) {
      charging = true;
      power = 0;
    }
    if (code === 'ArrowUp') angle = clamp(angle + 0.04, 0.12, Math.PI*0.75);
    if (code === 'ArrowDown') angle = clamp(angle - 0.04, 0.12, Math.PI*0.75);
  }
  function onKeyUp(code) {
    if (code === 'Space' && charging && ball.onGround) {
      charging = false;
      const shotPower = clamp(power, 2, 100);
      const speed = shotPower / 3.5;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = -Math.sin(angle) * speed;
      ball.onGround = false;
      strokes += 1;
      lastShotTime = performance.now();
      statusPill.textContent = `Strokes ${strokes}/${par}`;
      if (strokes > par) {
        overlayText = 'Par exceeded. Resetting...';
        showWinOverlay = true;
      }
    }
  }

  function onMouseMove(m) {
    if (ball.onGround && !charging) {
      const dx = m.x - ball.x;
      const dy = ball.y - m.y;
      angle = clamp(Math.atan2(dy, dx), 0.12, Math.PI*0.75);
    }
  }
  function onMouseDown(m) {
    const dx = m.x - ball.x;
    const dy = m.y - ball.y;
    if (Math.sqrt(dx*dx + dy*dy) < 40 && ball.onGround) {
      charging = true; power = 0;
    }
  }
  function onMouseUp(m) {
    if (charging && ball.onGround) {
      charging = false;
      const shotPower = clamp(power, 2, 100);
      const speed = shotPower / 3.5;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = -Math.sin(angle) * speed;
      ball.onGround = false;
      strokes += 1;
      statusPill.textContent = `Strokes ${strokes}/${par}`;
      if (strokes > par) {
        overlayText = 'Par exceeded. Resetting...';
        showWinOverlay = true;
      }
    }
  }

  function onResize() {}
  function onStart() {
    hudWorld.textContent = 'Pro Golfer';
    hudSub.textContent = 'Hold Space or click+hold near ball to charge power. Use Up/Down to adjust aim.';
    statusPill.textContent = `Par ${par} • Strokes ${strokes}/${par}`;
    windStrength = (Math.random() * 1.6 - 0.8);
  }
  function onStop() {}

  // Render/Update loop
  function loop() {
    if (!currentWorld || currentWorld.id !== 'pro') return;

    if (charging && ball.onGround) {
      power += 1.6;
      if (power > 100) power = 100;
    }

    physicsStep();
    if (ball) checkHoleIn();
    drawScene();

    // overlay with Play Again & Menu
    if (showWinOverlay) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(overlayText, canvas.width/2, canvas.height/2 - 20);


      // Play Again button (center)
      const playBtn = { x: canvas.width/2 - 80, y: canvas.height/2 + 8, w: 160, h: 40 };
      ctx.fillStyle = '#fff';
      ctx.fillRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h);
      ctx.fillStyle = '#003b2e';
      ctx.fillText('Play Again', canvas.width/2, canvas.height/2 + 36);

      canvas.onclick = (e) => {
        const mx = e.offsetX;
        const my = e.offsetY;

        if (mx >= menuBtn.x && mx <= menuBtn.x + menuBtn.w &&
            my >= menuBtn.y && my <= menuBtn.y + menuBtn.h) {
          showWinOverlay = false;
          currentWorld = null;
        }

        if (mx >= playBtn.x && mx <= playBtn.x + playBtn.w &&
            my >= playBtn.y && my <= playBtn.y + playBtn.h) {
          resetBall();
        }
      };
    } else {
      canvas.onclick = null;
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  return {
    id: 'pro',
    onStart,
    onStop,
    onKeyDown,
    onKeyUp,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onResize,
    loop
  };
}









/* ===========================
   World: Course Designer + Play Mode
=========================== */
function createDesignerWorld() {
  const cols = 80;
  const rows = Math.round((canvas.height / canvas.width) * cols);
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;
  const grid = new Array(rows).fill(null).map(() => new Array(cols).fill(0)); // default grass

  let brush = 'sand';
  let placingHole = false;
  let placingTee = false;
  let holeCell = null;
  let teeCell = null;
  let hoverCell = null;
  let inPlayMode = false;

  // Play mode variables
  let ball = { x: 0, y: 0, vx: 0, vy: 0, moving: false };
  let arrow = { angle: 0 };
  let power = 0;
  let strokes = 0;
  let powerCharging = false;
  let rotatingLeft = false;
  let rotatingRight = false;

  function onStart() {
    console.log("Designer mode started");
    hudWorld.textContent = 'Course Designer';
    hudSub.textContent = 'Use mouse drag to paint. Click toolbar to change brush. Place a hole and tee to test play.';
    statusPill.textContent = 'Designer mode';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = 0;
    holeCell = null;
    teeCell = null;
    inPlayMode = false;
  }

  function worldToCell(mx, my) {
    const c = clamp(Math.floor(mx / cellW), 0, cols - 1);
    const r = clamp(Math.floor(my / cellH), 0, rows - 1);
    return { r, c };
  }

  function paintAt(mx, my) {
    if (inPlayMode) return;

    const { r, c } = worldToCell(mx, my);
    if (placingHole) { holeCell = { r, c }; placingHole = false; return; }
    if (placingTee) { teeCell = { r, c }; placingTee = false; return; }

    if (brush === 'eraser') {
      if (holeCell && holeCell.r === r && holeCell.c === c) holeCell = null;
      if (teeCell && teeCell.r === r && teeCell.c === c) teeCell = null;
      grid[r][c] = 0;
      return;
    }

    const map = { grass: 0, sand: 1, water: 2, green: 3, tee: 4 };
    grid[r][c] = map[brush] || 0;
  }

  function drawDesigner() {
    ctx.fillStyle = '#a7d39a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW, y = r * cellH;
        switch (grid[r][c]) {
          case 0: ctx.fillStyle = '#2fa14a'; break;
          case 1: ctx.fillStyle = '#e6d4a6'; break;
          case 2: ctx.fillStyle = '#8fbbe6'; break;
          case 3: ctx.fillStyle = '#76d27e'; break;
          case 4: ctx.fillStyle = '#6aa84f'; break;
        }
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    if (holeCell) {
      const cx = holeCell.c * cellW + cellW / 2;
      const cy = holeCell.r * cellH + cellH / 2;
      ctx.beginPath();
      ctx.fillStyle = 'black';
      ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }

    if (teeCell) {
      const cx = teeCell.c * cellW + cellW / 2;
      const cy = teeCell.r * cellH + cellH / 2;
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buttons
    const btnX = canvas.width - 280;
    const btnY = canvas.height - 60;

    // Play button (always solid white with black text)
    ctx.fillStyle = 'white';
    drawRoundedRect(ctx, btnX, btnY, 120, 36, 8);
    ctx.fillStyle = 'black';
    ctx.font = '16px Inter';
    ctx.fillText('Play', btnX + 45, btnY + 24);

    // Eraser button (always white background, red text)
    ctx.fillStyle = 'white';
    drawRoundedRect(ctx, btnX + 140, btnY, 120, 36, 8);
    ctx.fillStyle = 'red';
    ctx.fillText('Eraser', btnX + 175, btnY + 24);

    ctx.fillStyle = '#111';
    ctx.font = '14px Inter';
    ctx.fillText('Brush: ' + brush, btnX + 10, btnY - 35);
  }

  function drawPlayMode() {
    ctx.fillStyle = '#a7d39a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW, y = r * cellH;
        switch (grid[r][c]) {
          case 0: ctx.fillStyle = '#2fa14a'; break;
          case 1: ctx.fillStyle = '#e6d4a6'; break;
          case 2: ctx.fillStyle = '#8fbbe6'; break;
          case 3: ctx.fillStyle = '#76d27e'; break;
        }
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    if (holeCell) {
      const cx = holeCell.c * cellW + cellW / 2;
      const cy = holeCell.r * cellH + cellH / 2;
      ctx.beginPath();
      ctx.fillStyle = 'black';
      ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ball
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.arc(ball.x, ball.y, Math.min(cellW, cellH) * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Arrow (bigger and smoother)
    if (!ball.moving) {
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(arrow.angle);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.min(cellW, cellH) * 3.2, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Power bar
    ctx.fillStyle = 'white';
    ctx.fillRect(10, 40, 200, 16);
    ctx.fillStyle = 'green';
    ctx.fillRect(10, 40, Math.min(power, 200), 16);

    // Back button
    drawRoundedRect(ctx, canvas.width - 140, 10, 120, 36, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Inter';
    ctx.fillText('Back', canvas.width - 90, 32);
  }

  function onMouseMove(m) {
    if (!inPlayMode && mouse.down) paintAt(m.x, m.y);
  }

  function onMouseDown(m) {
    if (!inPlayMode) {
      const btnX = canvas.width - 280;
      const btnY = canvas.height - 60;
      if (m.x >= btnX && m.x <= btnX + 120 && m.y >= btnY && m.y <= btnY + 36) {
        startPlayMode();
        return;
      }
      if (m.x >= btnX + 140 && m.x <= btnX + 260 && m.y >= btnY && m.y <= btnY + 36) {
        brush = 'eraser';
        return;
      }
      paintAt(m.x, m.y);
    } else {
      if (m.x >= canvas.width - 140 && m.x <= canvas.width - 20 && m.y >= 10 && m.y <= 46) {
        inPlayMode = false;
        onStart();
      }
    }
  }

  function onKeyDown(code) {
    if (!inPlayMode) {
      if (code === 'Digit1') brush = 'grass';
      if (code === 'Digit2') brush = 'sand';
      if (code === 'Digit3') brush = 'water';
      if (code === 'Digit4') brush = 'green';
      if (code === 'Digit5') brush = 'eraser';
      if (code === 'KeyH') placingHole = true;
      if (code === 'KeyT') placingTee = true;
    } else {
      if (!ball.moving) {
        if (code === 'ArrowLeft') rotatingLeft = true;
        if (code === 'ArrowRight') rotatingRight = true;
        if (code === 'Space') powerCharging = true;
      }
    }
  }

  function onKeyUp(code) {
    if (inPlayMode) {
      if (code === 'ArrowLeft') rotatingLeft = false;
      if (code === 'ArrowRight') rotatingRight = false;
      if (code === 'Space' && powerCharging) {
        powerCharging = false;
        ball.vx = Math.cos(arrow.angle) * (power * 0.05);
        ball.vy = Math.sin(arrow.angle) * (power * 0.05);
        ball.moving = true;
        strokes++;
        power = 0;
      }
    }
  }

  function startPlayMode() {
    if (!teeCell || !holeCell) {
      alert("Place both tee and hole first!");
      return;
    }
    inPlayMode = true;
    ball.x = teeCell.c * cellW + cellW / 2;
    ball.y = teeCell.r * cellH + cellH / 2;
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    arrow.angle = 0;
    power = 0;
    strokes = 0;
  }

  function updatePlay() {
    if (!ball.moving) {
      if (rotatingLeft) arrow.angle -= 0.05;
      if (rotatingRight) arrow.angle += 0.05;
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    const cell = worldToCell(ball.x, ball.y);
    let friction = 0.98;
    if (grid[cell.r][cell.c] === 1) friction = 0.9;
    if (grid[cell.r][cell.c] === 2) friction = 0.85;
    if (grid[cell.r][cell.c] === 3) friction = 0.95;
    ball.vx *= friction;
    ball.vy *= friction;

    if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
      ball.moving = false;
      ball.vx = 0;
      ball.vy = 0;
    }

    const dx = ball.x - (holeCell.c * cellW + cellW / 2);
    const dy = ball.y - (holeCell.r * cellH + cellH / 2);
    if (Math.sqrt(dx * dx + dy * dy) < Math.min(cellW, cellH) * 0.36) {
      alert(`Hole completed in ${strokes} strokes!`);
      inPlayMode = false;
      onStart();
    }
  }

  function loop() {
    if (!currentWorld || currentWorld.id !== 'designer') return;
    if (inPlayMode) {
      if (powerCharging) power = Math.min(power + 2, 200);
      updatePlay();
      drawPlayMode();
    } else drawDesigner();
    animationFrameId = requestAnimationFrame(loop);
  }

  return {
    id: 'designer',
    onStart,
    onStop() {},
    onKeyDown,
    onKeyUp,
    onMouseMove,
    onMouseDown,
    onMouseUp() {},
    onResize() {},
    loop
  };
}









































































/* ===========================
   World: Greenskeeper (easy + relaxing + sprinkler power-up)
   =========================== */
function createGreenskeeperWorld() {
  const cols = 22;
  const rows = 10;
  const pad = 12;
  const cellW = (canvas.width - pad*2) / cols;
  const cellH = (canvas.height - pad*2) / rows;
  const patches = [];
  const splashes = []; // sparkle effect
  let lastTick = performance.now();
  let score = 0;
  let tasksDone = 0;
  let gameTime = 60 * 1.5; // 90 seconds
  let started = false;
  let gameOver = false;

  // --- Sprinkler Power-Up ---
  let sprinklerActive = false;
  let sprinklerTimer = 0;
  const SPRINKLER_RADIUS = 75; // much bigger radius
  const SPRINKLER_DURATION = 3000; // milliseconds
  const SPRINKLER_UNLOCK = 10; // tasksDone to unlock
  let mousePos = null;

  function init() {
    patches.length = 0;
    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        patches.push({
          r,
          c,
          moisture: Math.random()*0.7 + 0.2,
          // Extremely slow drying for relaxed gameplay
          dryingRate: 0.00001 + Math.random() * 0.00002,
          flagged:false
        });
      }
    }
    score = 0; tasksDone = 0;
    lastTick = performance.now();
    started = true; gameOver = false;
    hudWorld.textContent = 'Greenskeeper';
    hudSub.textContent = 'Click dry patches to water them. Keep moisture above critical level to score.';
    statusPill.textContent = `Time ${Math.ceil(gameTime)}s`;
    sprinklerActive = false;
    sprinklerTimer = 0;
  }

  function draw() {
    ctx.fillStyle = '#dff5e7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const instructionBarHeight = 60; // Skip drawing patches under top HUD
    patches.forEach(p => {
      const x = pad + p.c * cellW;
      const y = pad + p.r * cellH;
      if (y < instructionBarHeight) return; // skip patches under HUD

      const m = clamp(p.moisture, 0, 1);
      const rVal = Math.floor(140 + (80 * (1 - m)));
      const gVal = Math.floor(200 + (30 * m));
      const bVal = Math.floor(100 + (60*m));
      ctx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      ctx.fillRect(x+2, y+2, cellW-4, cellH-4);

      if (m < 0.25) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(x + cellW/2, y + cellH/2, 6, 0, Math.PI*2);
        ctx.fill();
      }
    });

    // draw splashes
    splashes.forEach((s, i) => {
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      s.alpha -= 0.04;
      s.size += 0.6;
      if (s.alpha <= 0) splashes.splice(i, 1);
    });

    // draw sprinkler radius if active
    if (sprinklerActive && mousePos) {
      ctx.fillStyle = 'rgba(0,200,255,0.2)';
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, SPRINKLER_RADIUS, 0, Math.PI*2);
      ctx.fill();
    }

    // overlay
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    drawRoundedRect(ctx, 10, 10, 220, 40, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Inter';
    ctx.fillText(`Score: ${score} • Tasks: ${tasksDone}`, 26, 36);
  }

  function update(dt) {
    if (!started || gameOver) return;

    patches.forEach(p => {
      p.moisture -= p.dryingRate * dt;
      if (p.moisture < 0) p.moisture = 0;
    });

    if (sprinklerActive) {
      sprinklerTimer -= dt;
      if (sprinklerTimer <= 0) {
        sprinklerActive = false;
      }
    }

    gameTime -= dt/1000;
    statusPill.textContent = `Time ${Math.ceil(gameTime)}s`;
    if (gameTime <= 0) {
      gameOver = true;
      hudSub.textContent = 'Time up — results finalized';
      overlayWin(`Game Over • Score: ${score}`);
    }
  }

  function overlayWin(text) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '26px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width/2, canvas.height/2 - 10);
    ctx.font = '14px Inter';
    ctx.fillText('Play again or return to menu', canvas.width/2, canvas.height/2 + 22);
    gameOver = true;
  }

  function cellAt(m) {
    const c = clamp(Math.floor((m.x - pad) / cellW), 0, cols-1);
    const r = clamp(Math.floor((m.y - pad) / cellH), 0, rows-1);
    return patches.find(p => p.r === r && p.c === c);
  }

  function onMouseDown(m) {
    mousePos = { x: m.x, y: m.y };

    if (sprinklerActive) {
      patches.forEach(patch => {
        const px = pad + patch.c * cellW + cellW/2;
        const py = pad + patch.r * cellH + cellH/2;
        const dx = px - m.x;
        const dy = py - m.y;
        if (dx*dx + dy*dy <= SPRINKLER_RADIUS*SPRINKLER_RADIUS) {
          patch.moisture = 1;
          score += 20; // more points
        }
      });
    } else {
      const p = cellAt(m);
      if (!p) return;
      p.moisture = 1;
      score += 20; // more points
      tasksDone++;

      if (tasksDone % SPRINKLER_UNLOCK === 0) {
        sprinklerActive = true;
        sprinklerTimer = SPRINKLER_DURATION;
      }
    }

    splashes.push({ x: m.x, y: m.y, alpha: 0.8, size: 4 });
  }

  function onMouseMove(m) {
    mousePos = { x: m.x, y: m.y };
  }

  function onStart() { init(); }
  function onStop() {}
  function onKeyDown() {}
  function onKeyUp() {}
  function onMouseUp() {}
  function onResize() {}

  function loop() {
    if (!currentWorld || currentWorld.id !== 'greens') return;
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;
    update(dt);
    draw();
    if (!gameOver) animationFrameId = requestAnimationFrame(loop);
  }

  return {
    id: 'greens', onStart, onStop, onKeyDown, onKeyUp, onMouseMove, onMouseDown, onMouseUp, onResize, loop
  };
}











/* ===========================
     World: Multi-Round Caddy Challenge (Game Over Added)
     =========================== */
function createCaddyWorld() {
  const caddy = { x: 60, y: 0, vx: 0, vy: 0, speed: 2.2, stamina: 100 };
  let bags = [];
  let traps = [];
  let golfers = [];
  let score = 0;
  let started = false;
  let showingQuestion = false;
  let currentQuestion = null;
  let selected = null;
  let questionAnswered = false;
  let round = 1;
  let roundMessage = "";
  let roundMessageAlpha = 0;
  let fadingIn = false;
  let animationFrameId;

  const questions = [
    {
      q: "Ball is in a bunker near the green. What club do you use?",
      options: ["Driver", "Sand Wedge", "Putter"],
      answer: 1,
    },
    {
      q: "You’re 150 yards from the hole on the fairway. What do you use?",
      options: ["7 Iron", "Putter", "Wedge"],
      answer: 0,
    },
    {
      q: "You’re on the green, 20 feet from the hole. What club?",
      options: ["Putter", "9 Iron", "Driver"],
      answer: 0,
    },
    {
      q: "Ball stuck in rough grass, close to green. What should you use?",
      options: ["Pitching Wedge", "Driver", "Putter"],
      answer: 0,
    },
    {
      q: "You’re teeing off on a long par 5. What club do you start with?",
      options: ["Driver", "9 Iron", "Putter"],
      answer: 0,
    },
  ];

  function initGame() {
    traps = [];
    bags = [];
    golfers = [];

    const trapCount = Math.min(3 + round, 10);
    const bagCount = 2 + Math.floor(round / 2);
    const courseLength = canvas.width * (0.4 + round * 0.1);

    caddy.x = 60;
    caddy.y = canvas.height - 140;
    caddy.stamina = 100;
    caddy.vx = 0;
    caddy.vy = 0;

    // Generate traps
    for (let i = 0; i < trapCount; i++) {
      traps.push({
        x: 150 + Math.random() * (courseLength - 200),
        y: canvas.height - 160 + Math.random() * 20,
        r: 12 + Math.random() * 4,
      });
    }

    // Generate bags (not overlapping traps)
    for (let i = 0; i < bagCount; i++) {
      let x, y, valid = false;
      while (!valid) {
        x = 120 + Math.random() * (courseLength - 150);
        y = canvas.height - 140;
        valid = !traps.some((t) => Math.hypot(x - t.x, y - t.y) < t.r + 20);
      }
      bags.push({ x, y, carried: false, delivered: false });
    }

    // Golfer target
    golfers.push({
      x: courseLength,
      y: canvas.height - 150,
      reached: false,
    });

    started = true;
    hudWorld.textContent = "Caddy Challenge";
    hudSub.textContent = `Round ${round}: Carry all bags to the golfer without hitting traps.`;
    statusPill.textContent = `Round ${round}`;
  }

  function update(dt) {
    if (!started || showingQuestion) return;

    caddy.x += caddy.vx;
    caddy.y += caddy.vy;
    caddy.x = clamp(caddy.x, 16, canvas.width - 16);
    caddy.y = clamp(caddy.y, 50, canvas.height - 50);

    // stamina logic
    if (caddy.vx === 0 && caddy.vy === 0) {
      caddy.stamina += 0.05 * dt;
      if (caddy.stamina > 100) caddy.stamina = 100;
    }

    bags.forEach((bag) => {
      if (!bag.carried && !bag.delivered && Math.hypot(caddy.x - bag.x, caddy.y - bag.y) < 20) {
        bag.carried = true;
        statusPill.textContent = "Picked up bag!";
      }
      if (bag.carried) {
        bag.x = caddy.x + 10;
        bag.y = caddy.y;
        caddy.stamina -= 0.02 * dt * (1 + (round - 1) * 0.2);
        if (caddy.stamina <= 0) {
          caddy.stamina = 0;
          gameOverScreen("You collapsed from exhaustion!");
        }
      }
    });

    traps.forEach((t) => {
      if (Math.hypot(caddy.x - t.x, caddy.y - t.y) < t.r + 10) {
        gameOverScreen("You got caught in a trap! Game Over.");
      }
    });

    golfers.forEach((g) => {
      if (!g.reached && Math.hypot(caddy.x - g.x, caddy.y - g.y) < 30) {
        g.reached = true;
        startQuestionRound();
      }
    });
  }

  function draw() {
    ctx.fillStyle = "#cfeee6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#3a7e52";
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);

    // traps
    traps.forEach((t) => {
      ctx.fillStyle = "#a33";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // bags
    ctx.fillStyle = "#b5651d";
    bags.forEach((b) => {
      if (!b.delivered) ctx.fillRect(b.x - 8, b.y - 8, 16, 16);
    });

    // golfers
    ctx.fillStyle = "#ffd54f";
    golfers.forEach((g) => {
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, 0, Math.PI * 2);
      ctx.fill();
    });

    // caddy
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(caddy.x, caddy.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // stamina bar (top-right)
    ctx.fillStyle = "#0008";
    drawRoundedRect(ctx, canvas.width - 160, 20, 140, 12, 6);
    ctx.fillStyle = "#ff7043";
    drawRoundedRect(ctx, canvas.width - 159, 21, (caddy.stamina / 100) * 138, 10, 6);

    if (roundMessageAlpha > 0) drawRoundMessage();

    if (showingQuestion) drawQuestion();
  }

  function drawQuestion() {
    const q = currentQuestion;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "22px Inter";
    ctx.textAlign = "center";
    ctx.fillText("Golf Situation!", canvas.width / 2, canvas.height / 2 - 80);
    ctx.fillText(q.q, canvas.width / 2, canvas.height / 2 - 40);

    q.options.forEach((opt, i) => {
      const y = canvas.height / 2 + i * 45;
      let fillColor = "#fff";
      if (questionAnswered) {
        if (i === q.answer) fillColor = "#4caf50";
        else if (selected === i && i !== q.answer) fillColor = "#f44336";
      }
      drawRoundedRect(ctx, canvas.width / 2 - 90, y, 180, 35, 10);
      ctx.fillStyle = "#000";
      ctx.fillText(`${i + 1}. ${opt}`, canvas.width / 2, y + 24);
    });

    if (questionAnswered) {
      ctx.fillStyle = "#fff";
      ctx.font = "18px Inter";
      ctx.fillText(
        selected === q.answer ? "Correct!" : "Incorrect! Game Over.",
        canvas.width / 2,
        canvas.height / 2 + 160
      );
    }
  }

  function startQuestionRound() {
    showingQuestion = true;
    selected = null;
    questionAnswered = false;
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
  }

  canvas.addEventListener("click", (e) => {
    if (!showingQuestion || questionAnswered) return;
    const q = currentQuestion;
    const startY = canvas.height / 2;
    q.options.forEach((opt, i) => {
      const y = startY + i * 45;
      if (
        e.offsetX > canvas.width / 2 - 90 &&
        e.offsetX < canvas.width / 2 + 90 &&
        e.offsetY > y &&
        e.offsetY < y + 35
      ) {
        selected = i;
        questionAnswered = true;

        if (selected === q.answer) {
          setTimeout(() => {
            showingQuestion = false;
            startNextRound();
          }, 1000);
        } else {
          setTimeout(() => {
            gameOverScreen("Incorrect! Game Over.");
          }, 800);
        }
      }
    });
  });

  function startNextRound() {
    round++;
    fadeInRoundMessage(`Round ${round}`);
    initGame();
  }

  function fadeInRoundMessage(msg) {
    roundMessage = msg;
    roundMessageAlpha = 0;
    fadingIn = true;
  }

  function drawRoundMessage() {
    if (fadingIn) {
      roundMessageAlpha += 0.02;
      if (roundMessageAlpha >= 1) {
        roundMessageAlpha = 1;
        setTimeout(() => (fadingIn = false), 1000);
      }
    }
    if (roundMessageAlpha > 0) {
      ctx.globalAlpha = roundMessageAlpha;
      ctx.fillStyle = "#fff";
      ctx.font = "28px Inter";
      ctx.textAlign = "center";
      ctx.fillText(roundMessage, canvas.width / 2, canvas.height / 2);
      ctx.globalAlpha = 1;
    }
  }

  function gameOverScreen(message) {
    showingQuestion = false;
    selected = null;
    questionAnswered = false;

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "30px Inter";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    ctx.font = "18px Inter";
    ctx.fillText("Click to Restart", canvas.width / 2, canvas.height / 2 + 40);

    canvas.addEventListener(
      "click",
      function restartHandler() {
        canvas.removeEventListener("click", restartHandler);
        resetGame();
      },
      { once: true }
    );
  }

  function resetGame() {
    round = 1;
    initGame();
  }

  function onKeyDown(code) {
    if (showingQuestion) return;
    if (code === "ArrowRight") caddy.vx = caddy.speed;
    if (code === "ArrowLeft") caddy.vx = -caddy.speed;
    if (code === "ArrowUp") caddy.vy = -caddy.speed;
    if (code === "ArrowDown") caddy.vy = caddy.speed;
  }

  function onKeyUp(code) {
    if (code === "ArrowRight" || code === "ArrowLeft") caddy.vx = 0;
    if (code === "ArrowUp" || code === "ArrowDown") caddy.vy = 0;
  }

  function loop() {
    if (!currentWorld || currentWorld.id !== "caddy") return;
    update(16);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function onStart() {
    initGame();
  }

  return {
    id: "caddy",
    onStart,
    onKeyDown,
    onKeyUp,
    loop,
  };
}
















  /* ===========================
     World: Club Manager (event logistics micro-game)
     =========================== */
  function createManagerWorld() {
    // Simple event scheduling & budget allocation puzzle
    let budget = 2000;
    const players = 120;
    const items = [
      { id:'catering', name:'Catering', cost: 400, benefit: 60, chosen:false },
      { id:'pr', name:'PR Campaign', cost: 300, benefit: 40, chosen:false },
      { id:'prize', name:'Prizes', cost: 450, benefit: 70, chosen:false },
      { id:'security', name:'Security', cost: 250, benefit: 30, chosen:false },
      { id:'greens', name:'Extra Greens Crew', cost: 200, benefit: 25, chosen:false }
    ];
    let satisfaction = 40;
    let booked = false;
    let overlayMsg = null;

    function draw() {
      ctx.fillStyle = '#eef6fb';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      // left: items
      ctx.fillStyle = '#fff';
      drawRoundedRect(ctx, 20, 20, 360, canvas.height - 40, 12);
      ctx.fillStyle = '#222';
      ctx.font = '16px Inter';
      ctx.fillText('Event Options', 40, 48);
      items.forEach((it, idx) => {
        const y = 84 + idx*56;
        ctx.fillStyle = it.chosen ? '#d7ffd9' : '#f9f9f9';
        drawRoundedRect(ctx, 36, y-24, 320, 44, 8);
        ctx.fillStyle = '#333';
        ctx.font = '14px Inter';
        ctx.fillText(it.name + ` — $${it.cost}`, 48, y);
        ctx.fillStyle = '#666';
        ctx.font = '12px Inter';
        ctx.fillText(`Benefit: +${it.benefit}% satisfaction`, 48, y+18);
      });

      // right side: budget and result
      ctx.fillStyle = '#fff';
      drawRoundedRect(ctx, canvas.width - 380, 20, 340, canvas.height - 40, 12);
      ctx.fillStyle = '#333';
      ctx.font = '16px Inter';
      ctx.fillText('Budget', canvas.width - 360, 48);
      ctx.font = '14px Inter';
      ctx.fillText(`Remaining: $${budget}`, canvas.width - 360, 80);
      ctx.fillText(`Expected satisfaction: ${satisfaction}%`, canvas.width - 360, 112);
      // book button
      ctx.fillStyle = '#00695c';
      drawRoundedRect(ctx, canvas.width - 320, canvas.height - 100, 200, 44, 8);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Inter';
      ctx.fillText('Book Event', canvas.width - 230, canvas.height - 72);
    }

    function onMouseDown(m) {
      // click items left column
      const localX = m.x, localY = m.y;
      for (let i=0;i<items.length;i++){
        const y = 84 + i*56;
        if (localX >= 36 && localX <= 356 && localY >= y-24 && localY <= y+20) {
          // toggle selection
          const it = items[i];
          if (!it.chosen) {
            if (budget >= it.cost) {
              it.chosen = true;
              budget -= it.cost;
              satisfaction += it.benefit;
            } else {
              overlayMsg = 'Not enough budget for that item.';
              setTimeout(()=>overlayMsg = null, 1000);
            }
          } else {
            it.chosen = false;
            budget += it.cost;
            satisfaction -= it.benefit;
          }
        }
      }
      // Book event button
      if (m.x >= canvas.width - 320 && m.x <= canvas.width - 120 && m.y >= canvas.height - 100 && m.y <= canvas.height - 56) {
        // finalize
        booked = true;
        overlayMsg = `Event Booked! Final satisfaction ${satisfaction}%`;
        setTimeout(()=>{ overlayMsg=null; }, 2200);
      }
    }

    function onStart() {
      hudWorld.textContent = 'Club Manager';
      hudSub.textContent = 'Allocate budget across items and book your event. Click options to toggle.';
      statusPill.textContent = 'Manager mode';
      budget = 2000; satisfaction = 40;
      items.forEach(it => it.chosen=false);
      booked=false;
    }

    function onStop() {}
    function onMouseMove() {}
    function onMouseUp() {}
    function onKeyDown() {}
    function onKeyUp() {}
    function onResize() {}

    function loop() {
      if (!currentWorld || currentWorld.id !== 'manager') return;
      draw();
      if (overlayMsg) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
        ctx.fillStyle = '#fff';
        ctx.font = '18px Inter';
        ctx.fillText(overlayMsg, canvas.width/2, canvas.height - 40);
      }
      animationFrameId = requestAnimationFrame(loop);
    }

    return { id:'manager', onStart, onStop, onMouseDown, onMouseMove, onMouseUp, onResize, onKeyDown, onKeyUp, loop };
  }

  /* ===========================
     World dispatching & startup
     =========================== */

  // world instances cached
  const worldConstructors = {
    'pro': createProGolferWorld,
    'designer': createDesignerWorld,
    'greens': createGreenskeeperWorld,
    'caddy': createCaddyWorld,
    'manager': createManagerWorld
  };

  function startWorld(id) {
    if (!worldConstructors[id]) {
      console.warn('No constructor for', id);
      return;
    }
    statusPill.textContent = 'Loading...';
    stopCurrentWorld();
    // create new instance
    const world = worldConstructors[id]();
    currentWorld = world;
    currentWorld.id = id;
    // start-up
    resizeCanvas(); // ensure right sizes
    if (currentWorld.onStart) currentWorld.onStart();
    hudWorld.textContent = worlds.find(w=>w.id===id).name;
    hudSub.textContent = worlds.find(w=>w.id===id).summary;
    statusPill.textContent = 'Playing';
    // Start animation
    (function run() {
      if (!currentWorld) return;
      if (currentWorld.loop) currentWorld.loop();
      else animationFrameId = requestAnimationFrame(run);
    })();
  }

  // Forward input events to active world
  function forwardKeyDown(code) { if (currentWorld && currentWorld.onKeyDown) currentWorld.onKeyDown(code); }
  function forwardKeyUp(code) { if (currentWorld && currentWorld.onKeyUp) currentWorld.onKeyUp(code); }

  // Hook keyboard onto canvas focus
  canvas.addEventListener('focus', () => { /* nothing */ });
  window.addEventListener('keydown', (e)=>{ forwardKeyDown(e.code); });
  window.addEventListener('keyup', (e)=>{ forwardKeyUp(e.code); });

  // Initialize: show menu
  showMenu();

  // Expose a quick debugging API to window for testing
  window.GolfWorlds = {
    startWorld,
    stopCurrentWorld,
    showMenu,
    canvas,
    ctx
  };

  // Auto-focus canvas for keys
  setTimeout(()=>{ try{ canvas.focus(); }catch(e){} }, 200);

  // friendly log
  console.log('Golf Worlds app.js loaded — available worlds:', Object.keys(worldConstructors));

})();
