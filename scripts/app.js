/* =========================================================================
   Golf Worlds - scripts/app.js
   Contains five playable 2D worlds (all canvas-based):
     1) Pro Golfer World - realistic timing/angle/power + follow-through + par/strokes
     2) Greenskeeper World - timed "water patches" drying mechanic & repair tasks
     3) Course Designer World - paintbrush tool to paint sand, water, grass, green
    4) Caddy Dash World - endless runner inspired by the offline dino game
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
    .world-thumb{position:relative;width:64px;height:48px;border-radius:6px;flex-shrink:0;background:linear-gradient(90deg,#fff,#eee);display:flex;align-items:center;justify-content:center;font-weight:700;color:#333;overflow:hidden}
    .world-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;padding:2px;box-sizing:border-box}
    .world-thumb .fallback{position:relative;z-index:1}
    .world-info{flex:1}
    .play-btn{background:var(--accent);color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer}
    .canvas-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
    .hud{position:absolute;left:16px;top:16px;max-width:360px;background:#ffffffd9;padding:10px 12px;border-radius:10px;backdrop-filter:blur(4px);z-index:3}
    .instructions{position:absolute;right:16px;top:16px;max-width:380px;max-height:42%;overflow:auto;background:#ffffffde;padding:10px 12px;border-radius:10px;border:1px solid rgba(0,0,0,.08);z-index:3}
    .instructions h4{margin:0 0 6px 0;font-size:13px;color:#0a4d44}
    .instructions ul{margin:0;padding-left:18px}
    .instructions li{margin:2px 0;font-size:12px;color:#123}
    .bottom-bar{position:absolute;left:16px;bottom:16px;background:#00000011;padding:8px 12px;border-radius:999px;z-index:3}
    .small{font-size:12px;color:#222}
    .btn-secondary{background:transparent;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:8px;cursor:pointer}
    .center-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%}
    .overlay-win{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.5));color:white;font-size:20px;flex-direction:column;gap:12px}
    .input{padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.08)}
    .pill{background:#fff;padding:6px 10px;border-radius:999px;border:1px solid rgba(0,0,0,.06)}
    .muted{color:#666;font-size:12px}
    .admin-btn{background:#2b2b2b;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:12px}
    .admin-console{position:absolute;right:16px;bottom:64px;width:320px;max-height:55%;overflow:auto;background:#ffffffef;border:1px solid rgba(0,0,0,.18);border-radius:10px;padding:12px;z-index:4;box-shadow:0 8px 24px rgba(0,0,0,.15)}
    .admin-console.hidden{display:none}
    .admin-title{font-size:14px;font-weight:700;margin:0 0 8px 0;color:#16332f}
    .admin-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
    .admin-action{width:100%;text-align:left;background:#0f766e;color:#fff;border:none;border-radius:8px;padding:8px;cursor:pointer;font-size:12px;margin-top:6px}
    .admin-action.secondary{background:#475569}
    .admin-note{font-size:11px;color:#444;margin-top:8px}
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

const adminButton = document.createElement('button');
adminButton.className = 'admin-btn';
adminButton.textContent = '🔒 Admin Console';
left.appendChild(adminButton);

// world definitions (id, name, summary, color, image)
const worlds = [
  { id: 'pro', name: 'Pro Golfer', summary: 'Power, angle, and course strategy. Play par-3 course. Realistic ball flight and putts.', color: '#a6f0c6', image: 'Assets/images/progolfer.png' },
  { id: 'designer', name: 'Course Designer', summary: 'Paint terrain, place hazards, test play lines and difficulty.', color: '#ffe9a3', image: 'Assets/images/coursedesigner.png' },
  { id: 'greens', name: 'Greenskeeper', summary: 'Repair damage, manage irrigation, and keep turf healthy under time pressure.', color: '#c8e7ff', image: 'Assets/images/greenskeeper.png' },
  { id: 'caddy', name: 'Caddy Dash', summary: 'Run nonstop and jump obstacles while delivering clubs to golfers down the fairway.', color: '#ffd6da', image: 'Assets/images/caddy.png' },
  { id: 'manager', name: 'Club Manager', summary: 'Run a chaotic clubhouse shift: triage requests, chain combos, and keep members thrilled.', color: '#e6d1ff', image: 'Assets/images/clubmanager.png' }
];

// Tile factory
const tiles = {};
worlds.forEach(w => {
  const tile = document.createElement('div');
  tile.className = 'world-tile';
  tile.dataset.world = w.id;
  tile.innerHTML = `<div class="world-thumb" style="background:linear-gradient(90deg,${w.color},#fff)">
                      <img src="${w.image}" alt="${w.name}" loading="lazy" onload="this.nextElementSibling.style.display='none'" onerror="this.remove()">
                      <span class="fallback">${w.name.split(' ').map(s => s[0]).join('')}</span>
                    </div>
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

const instructionsBox = document.createElement('div');
instructionsBox.className = 'instructions small';
instructionsBox.innerHTML = '<h4>Instructions</h4><ul><li>Select a world to see controls.</li></ul>';
right.appendChild(instructionsBox);

const adminConsole = document.createElement('div');
adminConsole.className = 'admin-console hidden';
right.appendChild(adminConsole);

function setInstructions(title, items) {
  const list = items.map(item => `<li>${item}</li>`).join('');
  instructionsBox.innerHTML = `<h4>${title}</h4><ul>${list}</ul>`;
}

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

function renderIdleSplash(message = 'Choose a world tile and press Play to begin.') {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#ecfeff');
  grad.addColorStop(1, '#dbeafe');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px Inter';
  ctx.fillText('Golf Worlds', canvas.width / 2, canvas.height / 2 - 24);
  ctx.font = '15px Inter';
  ctx.fillStyle = '#334155';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
  ctx.fillText('Tip: Club Manager is in the world list (scroll if needed).', canvas.width / 2, canvas.height / 2 + 36);
  ctx.textAlign = 'left';
}

function renderStartupError(err) {
  renderIdleSplash('A world failed to start. See console for details.');
  const text = (err && err.message) ? err.message : String(err || 'Unknown error');
  ctx.fillStyle = 'rgba(127, 29, 29, 0.9)';
  drawRoundedRect(ctx, 28, 28, canvas.width - 56, 76, 10);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Inter';
  ctx.fillText('World startup error', 44, 56);
  ctx.font = '12px Inter';
  ctx.fillText(text.slice(0, 160), 44, 78);
}
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
const ADMIN_PASSWORD = '1208';
let adminUnlocked = false;

function ensureAdminAccess() {
  if (adminUnlocked) return true;
  const entered = window.prompt('Enter admin password');
  if (entered === ADMIN_PASSWORD) {
    adminUnlocked = true;
    adminButton.textContent = '🛠️ Admin Console';
    return true;
  }
  if (entered !== null) alert('Incorrect password.');
  return false;
}

function renderAdminConsole() {
  if (!adminUnlocked) {
    adminConsole.innerHTML = '<p class="admin-note">Admin mode is locked.</p>';
    return;
  }

  const worldName = currentWorld ? (worlds.find(w => w.id === currentWorld.id)?.name || currentWorld.id) : 'No world selected';
  const controls = currentWorld && currentWorld.getAdminControls ? currentWorld.getAdminControls() : [];
  const controlsHtml = controls.length
    ? controls.map(control => `<button class="admin-action ${control.secondary ? 'secondary' : ''}" data-admin-action="${control.id}">${control.label}</button>`).join('')
    : '<p class="admin-note">Start a world to see specific admin tools.</p>';

  adminConsole.innerHTML = `
    <h4 class="admin-title">Admin Console</h4>
    <div class="admin-row"><strong>World:</strong> <span>${worldName}</span></div>
    ${controlsHtml}
  `;

  adminConsole.querySelectorAll('[data-admin-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentWorld || !currentWorld.runAdminAction) return;
      currentWorld.runAdminAction(btn.dataset.adminAction);
      renderAdminConsole();
    });
  });
}

adminButton.addEventListener('click', () => {
  if (!ensureAdminAccess()) return;
  adminConsole.classList.toggle('hidden');
  renderAdminConsole();
});

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
  setInstructions('Instructions', ['Choose any world tile and press Play.', 'Use Back to Menu any time to switch careers.']);
  statusPill.textContent = 'Idle';
  if (!adminConsole.classList.contains('hidden')) renderAdminConsole();
  // stop any world
  stopCurrentWorld();
  renderIdleSplash();
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
function stopCurrentWorld(options = {}) {
  const clearCanvas = options.clearCanvas !== false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (currentWorld && currentWorld.onStop) currentWorld.onStop();
  currentWorld = null;
  // clear canvas
  if (clearCanvas) ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!adminConsole.classList.contains('hidden')) renderAdminConsole();
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
    if (showWinOverlay) {
      const playBtn = { x: canvas.width/2 - 80, y: canvas.height/2 + 8, w: 160, h: 40 };
      const menuBtn = { x: canvas.width/2 - 80, y: canvas.height/2 + 56, w: 160, h: 40 };

      if (m.x >= playBtn.x && m.x <= playBtn.x + playBtn.w &&
          m.y >= playBtn.y && m.y <= playBtn.y + playBtn.h) {
        resetBall();
        showWinOverlay = false;
      }

      if (m.x >= menuBtn.x && m.x <= menuBtn.x + menuBtn.w &&
          m.y >= menuBtn.y && m.y <= menuBtn.y + menuBtn.h) {
        showWinOverlay = false;
        showMenu();
      }
      return;
    }

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
    setInstructions('Pro Golfer Controls', [
      'Space (hold/release): charge and shoot',
      'Arrow Up / Down: adjust launch angle',
      'Mouse drag: aim direction',
      'Click + hold near ball: charge shot with mouse'
    ]);
    statusPill.textContent = `Par ${par} • Strokes ${strokes}/${par}`;
    windStrength = (Math.random() * 1.6 - 0.8);
  }
  function onStop() {}

  function forceWin() {
    if (!ball) return;
    strokes = Math.max(strokes, 1);
    ball.x = holeX;
    ball.y = holeY;
    ball.vx = 0;
    ball.vy = 0;
    ball.onGround = true;
    overlayText = `Admin win! Hole in ${strokes} stroke${strokes===1?'':'s'}.`;
    showWinOverlay = true;
    statusPill.textContent = 'Hole!';
  }

  function getAdminControls() {
    return [
      { id: 'force-win', label: '🏆 Auto win this hole' },
      { id: 'reset-hole', label: '↺ Reset hole', secondary: true }
    ];
  }

  function runAdminAction(actionId) {
    if (actionId === 'force-win') forceWin();
    if (actionId === 'reset-hole') resetBall();
  }

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


      // Play Again & Menu buttons (center)
      const playBtn = { x: canvas.width/2 - 80, y: canvas.height/2 + 8, w: 160, h: 40 };
      const menuBtn = { x: canvas.width/2 - 80, y: canvas.height/2 + 56, w: 160, h: 40 };
      ctx.fillStyle = '#fff';
      ctx.fillRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h);
      ctx.fillRect(menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h);
      ctx.fillStyle = '#003b2e';
      ctx.fillText('Play Again', canvas.width/2, canvas.height/2 + 36);
      ctx.fillText('Back to Menu', canvas.width/2, canvas.height/2 + 84);
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
    loop,
    getAdminControls,
    runAdminAction
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
    setInstructions('Course Designer Controls', [
      '1: Grass brush',
      '2: Sand brush',
      '3: Water brush',
      '4: Green brush',
      '5: Eraser',
      'H: place hole on next click',
      'T: place tee on next click',
      'Play button: test your hole',
      'In Play Mode: Arrow Left/Right to aim, Space hold/release to shoot'
    ]);
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

  function getAdminControls() {
    return [
      { id: 'quick-layout', label: '🧱 Build quick demo layout' },
      { id: 'instant-hole', label: '🏁 Complete hole instantly' }
    ];
  }

  function runAdminAction(actionId) {
    if (actionId === 'quick-layout') {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = 0;
      teeCell = { r: Math.floor(rows * 0.7), c: Math.floor(cols * 0.2) };
      holeCell = { r: Math.floor(rows * 0.35), c: Math.floor(cols * 0.75) };
      for (let c = Math.floor(cols * 0.35); c < Math.floor(cols * 0.55); c++) {
        grid[Math.floor(rows * 0.55)][c] = 2;
      }
      return;
    }
    if (actionId === 'instant-hole') {
      if (!holeCell || !teeCell) return;
      if (!inPlayMode) startPlayMode();
      ball.x = holeCell.c * cellW + cellW / 2;
      ball.y = holeCell.r * cellH + cellH / 2;
      ball.vx = 0;
      ball.vy = 0;
      ball.moving = true;
    }
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
    loop,
    getAdminControls,
    runAdminAction
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
    setInstructions('Greenskeeper Controls', [
      'Click any patch to re-water it (+score)',
      'Every 10 tasks: sprinkler power-up activates',
      'When sprinkler is active, click to water a large area',
      'Keep moisture from dropping too low before time runs out'
    ]);
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

  function getAdminControls() {
    return [
      { id: 'add-30s', label: '⏱️ Add 30 seconds' },
      { id: 'set-time', label: '⏲️ Set custom timer' },
      { id: 'water-all', label: '💧 Fully water all patches' }
    ];
  }

  function runAdminAction(actionId) {
    if (actionId === 'add-30s') {
      gameTime += 30;
      return;
    }
    if (actionId === 'set-time') {
      const entered = window.prompt('Set new timer in seconds', String(Math.max(1, Math.ceil(gameTime))));
      if (entered === null) return;
      const next = Number(entered);
      if (!Number.isFinite(next) || next <= 0) return;
      gameTime = next;
      gameOver = false;
      return;
    }
    if (actionId === 'water-all') {
      patches.forEach(patch => { patch.moisture = 1; });
      score += 200;
    }
  }

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
    id: 'greens', onStart, onStop, onKeyDown, onKeyUp, onMouseMove, onMouseDown, onMouseUp, onResize, loop, getAdminControls, runAdminAction
  };
}











/* ===========================
     World: Caddy Dash (dino-style endless runner)
     =========================== */
function createCaddyWorld() {
  const gravity = 0.9;
  const jumpVelocity = -16;
  const groundHeight = 110;
  const deliveryDistance = 300;

  const caddy = { x: 130, y: 0, w: 34, h: 52, vy: 0, onGround: true };
  let groundY = 0;
  let obstacles = [];
  let distance = 0;
  let deliveries = 0;
  let nextDeliveryAt = deliveryDistance;
  let obstacleSpawnTimer = 0;
  let obstacleSpawnEvery = 1200;
  let gameOver = false;
  let gameOverMessage = '';
  let lastTick = 0;
  let animationFrameId;
  let invincible = false;
  let deliveryFlashMs = 0;

  function resetGame() {
    groundY = canvas.height - groundHeight;
    obstacles = [];
    distance = 0;
    deliveries = 0;
    nextDeliveryAt = deliveryDistance;
    obstacleSpawnTimer = 0;
    obstacleSpawnEvery = 1000;
    gameOver = false;
    gameOverMessage = '';
    caddy.y = groundY - caddy.h;
    caddy.vy = 0;
    caddy.onGround = true;
    deliveryFlashMs = 0;
    lastTick = 0;
  }

  function spawnObstacle(speed) {
    const tall = Math.random() > 0.45;
    const kind = Math.random() > 0.5 ? 'cone' : 'sprinkler';
    const obstacle = {
      x: canvas.width + 30,
      w: tall ? 24 : 42,
      h: tall ? 54 : 30,
      y: groundY,
      passed: false,
      kind,
      speedBoost: Math.random() * 1.4
    };
    obstacleSpawnEvery = clamp(1100 - speed * 45, 500, 1100);
    obstacles.push(obstacle);
  }

  function collide(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y && a.y + a.h > b.y - b.h;
  }

  function endRun(message) {
    gameOver = true;
    gameOverMessage = message;
    statusPill.textContent = 'Run ended';
  }

  function update(dtMs) {
    if (gameOver) return;
    const dt = dtMs / 16.67;
    const speed = 6.8 + distance / 1200;
    distance += speed * dt;

    caddy.vy += gravity * dt;
    caddy.y += caddy.vy * dt;
    if (caddy.y >= groundY - caddy.h) {
      caddy.y = groundY - caddy.h;
      caddy.vy = 0;
      caddy.onGround = true;
    }

    obstacleSpawnTimer += dtMs;
    if (obstacleSpawnTimer >= obstacleSpawnEvery) {
      obstacleSpawnTimer = 0;
      spawnObstacle(speed);
    }

    obstacles.forEach(o => {
      o.x -= (speed + o.speedBoost) * 2.2 * dt;
    });
    obstacles = obstacles.filter(o => o.x + o.w > -20);

    for (const obstacle of obstacles) {
      if (!obstacle.passed && obstacle.x + obstacle.w < caddy.x) obstacle.passed = true;
      if (!invincible && collide(caddy, obstacle)) {
        endRun('You clipped an obstacle and dropped the clubs!');
        break;
      }
    }

    if (distance >= nextDeliveryAt) {
      deliveries += 1;
      nextDeliveryAt += deliveryDistance;
      deliveryFlashMs = 850;
      statusPill.textContent = `Delivery #${deliveries}`;
    } else {
      statusPill.textContent = gameOver ? 'Run ended' : `Distance ${Math.floor(distance)}y`;
    }

    if (deliveryFlashMs > 0) deliveryFlashMs -= dtMs;
  }

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#eaf4ff');
    sky.addColorStop(1, '#cfe9ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#99cf82';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.fillStyle = '#5e8d4a';
    ctx.fillRect(0, groundY + 8, canvas.width, 3);

    const stripeOffset = -(distance * 3 % 42);
    ctx.strokeStyle = '#8ebe72';
    ctx.lineWidth = 2;
    for (let x = stripeOffset; x < canvas.width; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 24);
      ctx.lineTo(x + 24, groundY + 24);
      ctx.stroke();
    }

    obstacles.forEach(o => {
      if (o.kind === 'cone') {
        ctx.fillStyle = '#ff7043';
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, o.y - o.h);
        ctx.lineTo(o.x + o.w, o.y);
        ctx.lineTo(o.x, o.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#7b8fa5';
        drawRoundedRect(ctx, o.x, o.y - o.h, o.w, o.h, 6);
        ctx.fillStyle = '#a3b4c8';
        drawRoundedRect(ctx, o.x + 6, o.y - o.h + 6, o.w - 12, 8, 4);
      }
    });

    ctx.fillStyle = '#1f2937';
    drawRoundedRect(ctx, caddy.x, caddy.y, caddy.w, caddy.h, 8);
    ctx.fillStyle = '#f6c89b';
    drawRoundedRect(ctx, caddy.x + 8, caddy.y + 5, 18, 16, 4);
    ctx.fillStyle = '#7d4f2a';
    drawRoundedRect(ctx, caddy.x + caddy.w - 10, caddy.y + 18, 16, 28, 4);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 22px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Distance: ${Math.floor(distance)} yds`, 24, 44);
    ctx.fillText(`Clubs Delivered: ${deliveries}`, 24, 74);

    if (deliveryFlashMs > 0) {
      ctx.fillStyle = 'rgba(17, 94, 89, 0.88)';
      drawRoundedRect(ctx, canvas.width / 2 - 160, 36, 320, 48, 12);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('Club delivery completed!', canvas.width / 2, 67);
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px Inter';
      ctx.fillText('Run Over', canvas.width / 2, canvas.height / 2 - 26);
      ctx.font = '19px Inter';
      ctx.fillText(gameOverMessage, canvas.width / 2, canvas.height / 2 + 8);
      ctx.fillText('Press Space or R to restart', canvas.width / 2, canvas.height / 2 + 42);
    }
  }

  function jump() {
    if (!caddy.onGround || gameOver) return;
    caddy.vy = jumpVelocity;
    caddy.onGround = false;
  }

  function onStart() {
    resetGame();
    hudWorld.textContent = 'Caddy Dash';
    hudSub.textContent = 'Dino-style runner: jump obstacles and keep delivering clubs.';
    setInstructions('Caddy Dash Controls', [
      'Space / Arrow Up: jump over on-course obstacles',
      'Each 300 yards counts as another successful club delivery',
      'Avoid cones and sprinklers to keep the run alive',
      'After a crash, press Space or R to restart'
    ]);
    statusPill.textContent = 'Distance 0y';
  }

  function onKeyDown(code) {
    if (code === 'ArrowUp' || code === 'Space') {
      if (gameOver) resetGame();
      else jump();
    }
    if (code === 'KeyR') resetGame();
  }

  function onKeyUp() {}
  function onStop() {}
  function onResize() {
    groundY = canvas.height - groundHeight;
    caddy.y = Math.min(caddy.y, groundY - caddy.h);
  }

  function getAdminControls() {
    return [
      { id: 'clear-obstacles', label: '🧹 Clear obstacles' },
      { id: 'instant-delivery', label: '🎒 Deliver clubs now' },
      { id: 'toggle-invincible', label: invincible ? '🛡️ Disable invincibility' : '🛡️ Enable invincibility', secondary: true }
    ];
  }

  function runAdminAction(actionId) {
    if (actionId === 'clear-obstacles') {
      obstacles = [];
      return;
    }
    if (actionId === 'instant-delivery') {
      deliveries += 1;
      nextDeliveryAt = Math.max(nextDeliveryAt, distance + deliveryDistance);
      deliveryFlashMs = 850;
      return;
    }
    if (actionId === 'toggle-invincible') {
      invincible = !invincible;
    }
  }

  function loop(now = performance.now()) {
    if (!currentWorld || currentWorld.id !== 'caddy') return;
    const dt = lastTick ? Math.min(now - lastTick, 40) : 16.67;
    lastTick = now;
    update(dt);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  return {
    id: 'caddy',
    onStart,
    onStop,
    onResize,
    onKeyDown,
    onKeyUp,
    loop,
    getAdminControls,
    runAdminAction,
  };
}
















  /* ===========================
     World: Club Manager (Clubhouse Rush simulation)
     =========================== */
  function createManagerWorld() {
    const SHIFT_MS = 90000;
    const GOAL_SCORE = 1000;

    const resources = {
      cash: 900,
      reputation: 70,
      staffEnergy: 100,
      teeDelays: 0,
      combo: 0,
      bestCombo: 0,
      score: 0,
      rushUntil: 0
    };

    const departments = [
      { id: 'proshop', name: 'Pro Shop', color: '#3b82f6', x: 40, y: 132, w: 340, h: 90, efficiency: 1, cooldownUntil: 0, serviceText: 'Gear repairs, fittings, and last-minute purchases.' },
      { id: 'starter', name: 'Starter Desk', color: '#10b981', x: 40, y: 244, w: 340, h: 90, efficiency: 1, cooldownUntil: 0, serviceText: 'Tee-sheet flow, pairings, and pace-of-play issues.' },
      { id: 'lounge', name: 'Club Lounge', color: '#f59e0b', x: 40, y: 356, w: 340, h: 90, efficiency: 1, cooldownUntil: 0, serviceText: 'Food, drinks, events, and member hospitality.' }
    ];

    const upgrades = [
      { id: 'radio', name: 'Marshal Radio Net', cost: 300, effect: '+20% Starter speed', apply: () => departments[1].efficiency += 0.2 },
      { id: 'runner', name: 'Shop Runner', cost: 350, effect: '+20% Pro Shop speed', apply: () => departments[0].efficiency += 0.2 },
      { id: 'host', name: 'Floor Host', cost: 400, effect: '+20% Lounge speed', apply: () => departments[2].efficiency += 0.2 },
      { id: 'team', name: 'Team Pep Talk', cost: 500, effect: 'All departments +10% speed', apply: () => departments.forEach(d => d.efficiency += 0.1) }
    ];

    const requestTemplates = [
      { type: 'proshop', label: 'Grip replacement', rewardCash: 95, rewardRep: 7, rewardScore: 48, penaltyRep: 6, penaltyDelay: 0 },
      { type: 'starter', label: 'Tee time backup', rewardCash: 110, rewardRep: 9, rewardScore: 54, penaltyRep: 8, penaltyDelay: 1 },
      { type: 'lounge', label: 'Lunch rush queue', rewardCash: 100, rewardRep: 8, rewardScore: 52, penaltyRep: 7, penaltyDelay: 0 },
      { type: 'starter', label: 'Weather reschedule', rewardCash: 130, rewardRep: 10, rewardScore: 60, penaltyRep: 10, penaltyDelay: 1 },
      { type: 'proshop', label: 'Junior clinic setup', rewardCash: 120, rewardRep: 9, rewardScore: 58, penaltyRep: 8, penaltyDelay: 0 },
      { type: 'lounge', label: 'Sponsor dinner prep', rewardCash: 140, rewardRep: 11, rewardScore: 66, penaltyRep: 10, penaltyDelay: 0 },
      { type: 'starter', label: 'VIP group arrived early', rewardCash: 160, rewardRep: 12, rewardScore: 72, penaltyRep: 12, penaltyDelay: 1, vip: true }
    ];

    let shiftStart = 0;
    let shiftOver = false;
    let shiftWon = false;
    let overlayMsg = '';
    let overlayUntil = 0;
    let lastTick = 0;
    let spawnTimer = 0;
    let rushTimer = 18000;
    let nextUpgradeIndex = 0;

    function resetState() {
      resources.cash = 900;
      resources.reputation = 70;
      resources.staffEnergy = 100;
      resources.teeDelays = 0;
      resources.combo = 0;
      resources.bestCombo = 0;
      resources.score = 0;
      resources.rushUntil = 0;
      departments.forEach(d => {
        d.cooldownUntil = 0;
        d.efficiency = 1;
      });
      shiftStart = nowMs();
      shiftOver = false;
      shiftWon = false;
      overlayMsg = '';
      overlayUntil = 0;
      lastTick = 0;
      spawnTimer = 900;
      rushTimer = 18000;
      nextUpgradeIndex = 0;
      shiftStart = performance.now();
      for (let i = 0; i < 3; i += 1) spawnRequest();
    }

    function getTimeLeft(now) {
      return Math.max(0, SHIFT_MS - (now - shiftStart));
    }

    function isRush(now = nowMs()) {
      return now < resources.rushUntil;
    }

    function hasDispatchBoost(now = nowMs()) {
      return now < resources.dispatchBoostUntil;
    }

    function showOverlay(text, ms = 1200) {
      overlayMsg = text;
      overlayUntil = nowMs() + ms;
    }

    function isRush(now = performance.now()) {
      return now < resources.rushUntil;
    }

    function spawnRequest(forceVip = false) {
      if (activeRequests.length >= 7) return;
      const template = forceVip
        ? requestTemplates.find(r => r.vip) || requestTemplates[0]
        : requestTemplates[Math.floor(Math.random() * requestTemplates.length)];
      const urgency = 9000 + Math.random() * 9000;
      activeRequests.push({
        id: `${template.type}-${Math.random().toString(36).slice(2, 8)}`,
        type: template.type,
        label: template.label,
        rewardCash: template.rewardCash,
        rewardRep: template.rewardRep,
        rewardScore: template.rewardScore,
        penaltyRep: template.penaltyRep,
        penaltyDelay: template.penaltyDelay,
        urgent: Boolean(template.urgent),
        vip: Boolean(template.vip),
        expiresAt: nowMs() + patience
      });
    }

    function maybeBuyUpgrade() {
      if (nextUpgradeIndex >= upgrades.length) return;
      const upgrade = upgrades[nextUpgradeIndex];
      if (resources.cash < upgrade.cost) return;
      resources.cash -= upgrade.cost;
      upgrade.apply();
      nextUpgradeIndex += 1;
      showOverlay(`Upgrade: ${upgrade.name} (${upgrade.effect})`, 1700);
    }

    function triggerRush(now = performance.now()) {
      resources.rushUntil = now + 8000;
      showOverlay('Rush Hour! Score and cash doubled for 8 seconds!', 1800);
    }

    function applyFailureFromTimeout(req) {
      resources.reputation = Math.max(0, resources.reputation - req.penaltyRep);
      resources.teeDelays += req.penaltyDelay;
      resources.staffEnergy = Math.max(0, resources.staffEnergy - 6);
      resources.combo = 0;
    }

    function penaltyForMiss(req) {
      resources.reputation = Math.max(0, resources.reputation - req.penaltyRep);
      resources.teeDelays += req.penaltyDelay;
      resources.staffEnergy = Math.max(0, resources.staffEnergy - 6);
      resources.combo = 0;
      resources.missed += 1;
    }

    function findDepartmentById(id) {
      return departments.find(d => d.id === id) || null;
    }

    function routeRequest(requestId) {
      if (!selectedDeptId || shiftOver) {
        showOverlay('Select a department first, then assign a request.', 900);
        return;
      }
      const dept = findDepartmentById(selectedDeptId);
      const now = nowMs();
      if (!dept) return;
      if (now < dept.cooldownUntil) {
        showOverlay(`${dept.name} is busy. Pick another desk or wait.`, 900);
        return;
      }

      const idx = activeRequests.findIndex(r => r.id === requestId);
      if (idx === -1) return;
      const req = activeRequests[idx];

      if (req.type !== dept.id) {
        resources.combo = 0;
        resources.staffEnergy = Math.max(0, resources.staffEnergy - 4);
        showOverlay(`${dept.name} had no waiting request. You lost momentum.`, 1000);
        dept.cooldownUntil = now + 550;
        return;
      }

      activeRequests.splice(idx, 1);
      const rushMult = isRush(now) ? 1.9 : 1;
      const comboMult = 1 + Math.min(0.9, resources.combo * 0.1);
      const urgencyBonus = req.urgent ? 1.15 : 1;
      const boostMult = hasDispatchBoost(now) ? 1.15 : 1;

      const comboMult = 1 + Math.min(0.8, resources.combo * 0.08);
      const rushMult = isRush(now) ? 2 : 1;
      const vipBonus = req.vip ? 10 : 0;
      const scoreGain = Math.round((req.rewardScore + vipBonus) * comboMult * rushMult);
      const cashGain = Math.round(req.rewardCash * comboMult * rushMult);
      const repGain = Math.round((req.rewardRep + Math.min(6, resources.combo)) * rushMult);

      resources.score += scoreGain;
      resources.cash += cashGain;
      resources.reputation = Math.min(100, resources.reputation + repGain);
      resources.staffEnergy = Math.max(0, Math.min(100, resources.staffEnergy - (8 - dept.efficiency * 2)));
      resources.servedGuests += 1;
      resources.combo += 1;
      resources.bestCombo = Math.max(resources.bestCombo, resources.combo);

      const cooldown = 850 - dept.efficiency * 200;
      dept.cooldownUntil = now + Math.max(350, cooldown);
      maybeBuyUpgrade();

      if (req.vip) showOverlay(`VIP handled! +${scoreGain} score`, 1100);
    }

    function evaluateEndState(now) {
      const timeUp = getTimeLeft(now) <= 0;
      const failed = resources.reputation <= 0 || resources.teeDelays >= 8;
      const reachedGoal = resources.score >= GOAL_SCORE;
      if (!timeUp && !failed) return;

      shiftOver = true;
      shiftWon = reachedGoal && !failed;
      if (shiftWon) {
        showOverlay(`Shift cleared! Goal hit: ${resources.score}/${GOAL_SCORE}. Click to play again.`, 100000);
      } else {
        const failReason = failed
          ? (resources.reputation <= 0 ? 'reputation collapsed' : 'tee delays got out of control')
          : 'time expired before you hit the score goal';
        showOverlay(`Shift failed (${failReason}). Score ${resources.score}/${GOAL_SCORE}. Click to retry.`, 100000);
      }
    }

    function update(now, dt) {
      if (shiftOver) return;

      spawnTimer -= dt;
      rushTimer -= dt;

      const baseSpawn = isRush(now) ? 650 : 1200;
      if (spawnTimer <= 0) {
        spawnRequest();
        spawnTimer = Math.max(450, baseSpawn - resources.servedGuests * 4);
      }

      if (rushTimer <= 0) {
        triggerRush(now);
        rushTimer = 24000;
      }

      for (let i = activeRequests.length - 1; i >= 0; i -= 1) {
        if (activeRequests[i].expiresAt <= now) {
          const req = activeRequests[i];
          activeRequests.splice(i, 1);
          applyFailureFromTimeout(req);
          showOverlay(`Missed: ${req.label}`, 1000);
        }
      }

      if (resources.staffEnergy < 100) {
        const regen = isRush(now) ? 0.008 : 0.015;
        resources.staffEnergy = Math.min(100, resources.staffEnergy + dt * regen);
      }

      if (resources.staffEnergy < 25) {
        resources.reputation = Math.max(0, resources.reputation - dt * 0.0022);
      }

      evaluateEndState(now);
    }

    function draw() {
      const now = performance.now();
      const timeLeft = getTimeLeft(now);
      const timeRatio = clamp(timeLeft / SHIFT_MS, 0, 1);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#eef7ff');
      bgGrad.addColorStop(1, '#dbeafe');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px Inter';
      ctx.fillText('Club Manager: Score Rush', 30, 48);
      ctx.font = '14px Inter';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Goal: Reach ${GOAL_SCORE} score before 90s while avoiding 8 tee delays.`, 30, 72);

      drawRoundedRect(ctx, 420, 20, canvas.width - 460, 120, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(422, 22, canvas.width - 464, 116);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px Inter';
      ctx.fillText(`Score: ${Math.round(resources.score)} / ${GOAL_SCORE}`, 438, 48);
      ctx.font = '13px Inter';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Reputation: ${Math.round(resources.reputation)}%`, 438, 70);
      ctx.fillText(`Cash: $${Math.round(resources.cash)}   Combo: x${resources.combo}`, 438, 90);
      ctx.fillText(`Tee Delays: ${resources.teeDelays}/8   Served: ${resources.servedGuests}`, 438, 110);

      ctx.fillStyle = '#cbd5e1';
      drawRoundedRect(ctx, 30, 90, canvas.width - 60, 14, 7);
      ctx.fillStyle = '#0ea5e9';
      drawRoundedRect(ctx, 30, 90, (canvas.width - 60) * timeRatio, 14, 7);

      const scoreRatio = clamp(resources.score / GOAL_SCORE, 0, 1);
      ctx.fillStyle = '#cbd5e1';
      drawRoundedRect(ctx, 30, 112, canvas.width - 60, 10, 6);
      ctx.fillStyle = '#22c55e';
      drawRoundedRect(ctx, 30, 112, (canvas.width - 60) * scoreRatio, 10, 6);

      departments.forEach((dept, idx) => {
        const req = activeRequests.find(r => r.type === dept.id);
        const cooling = now < dept.cooldownUntil;
        const offsetY = idx * 2;

        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, dept.x, dept.y + offsetY, dept.w, dept.h, 14);
        ctx.fillStyle = dept.color;
        drawRoundedRect(ctx, dept.x + 10, dept.y + 10 + offsetY, 10, dept.h - 20, 6);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px Inter';
        ctx.fillText(dept.name, dept.x + 30, dept.y + 30 + offsetY);
        ctx.font = '12px Inter';
        ctx.fillStyle = '#475569';
        ctx.fillText(dept.serviceText, dept.x + 30, dept.y + 48 + offsetY);

        if (req) {
          const remain = Math.max(0, req.expiresAt - now);
          const urgencyColor = remain < 4500 ? '#ef4444' : '#2563eb';
          ctx.fillStyle = urgencyColor;
          ctx.font = 'bold 13px Inter';
          ctx.fillText(`${req.vip ? 'VIP • ' : ''}${req.label}`, dept.x + 30, dept.y + 70 + offsetY);

          const barW = 128;
          ctx.fillStyle = '#cbd5e1';
          drawRoundedRect(ctx, dept.x + dept.w - barW - 14, dept.y + 60 + offsetY, barW, 10, 5);
          ctx.fillStyle = urgencyColor;
          drawRoundedRect(ctx, dept.x + dept.w - barW - 14, dept.y + 60 + offsetY, barW * clamp(remain / 18000, 0, 1), 10, 5);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px Inter';
          ctx.fillText('Ready for next guest', dept.x + 30, dept.y + 70 + offsetY);
        }

        if (cooling) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          drawRoundedRect(ctx, dept.x, dept.y + offsetY, dept.w, dept.h, 14);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px Inter';
          ctx.fillText('Handling...', dept.x + dept.w - 95, dept.y + 30 + offsetY);
        }
      });

      ctx.fillStyle = '#0f172a';
      ctx.font = '12px Inter';
      const rushText = isRush(now) ? 'RUSH HOUR ACTIVE: 2x score/cash!' : `Rush Hour in ${Math.ceil(Math.max(0, rushTimer) / 1000)}s`;
      ctx.fillText(rushText, 30, canvas.height - 40);
      if (nextUpgradeIndex < upgrades.length) {
        const up = upgrades[nextUpgradeIndex];
        ctx.fillText(`Next auto-upgrade: ${up.name} ($${up.cost})`, 30, canvas.height - 22);
      }

      if (overlayMsg && now < overlayUntil) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        drawRoundedRect(ctx, 30, canvas.height - 92, canvas.width - 60, 44, 10);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(overlayMsg, canvas.width / 2, canvas.height - 64);
        ctx.textAlign = 'left';
      }
    }

    function onMouseDown(m) {
      const now = nowMs();
      if (shiftOver) {
        resetState();
        return;
      }

      for (const dept of departments) {
        if (m.x >= dept.x && m.x <= dept.x + dept.w && m.y >= dept.y && m.y <= dept.y + dept.h) {
          selectedDeptId = dept.id;
          return;
        }
      }

      if (m.x >= 420 && m.x <= canvas.width - 40 && m.y >= 20 && m.y <= 140) {
        showOverlay(`Time left: ${Math.ceil(getTimeLeft(now) / 1000)}s | Score: ${Math.round(resources.score)}/${GOAL_SCORE}`, 1100);
      }
    }

    function onStart() {
      hudWorld.textContent = 'Club Manager';
      hudSub.textContent = 'Clear requests fast and hit the score goal before time runs out.';
      setInstructions('Club Manager Goal & Controls', [
        `Goal: Reach ${GOAL_SCORE} score within 90 seconds.`,
        'Click a department to serve its current request and build combo multipliers.',
        'Missing requests hurts reputation and can add tee delays (8 delays = loss).',
        'Every 24 seconds, Rush Hour gives 2x score and cash for 8 seconds.',
        'Buyable upgrades happen automatically when you have enough cash.'
      ]);
      statusPill.textContent = 'Score rush';
      resetState();
    }

    function onMouseUp() {}
    function onKeyDown() {}
    function onKeyUp() {}
    function onResize() {}
    function onStop() {}

    function onStart() {
      hudWorld.textContent = 'Club Manager';
      hudSub.textContent = 'Run dispatch under pressure: pick a desk, then route the right request before it expires.';
      setInstructions('Club Manager Controls', [
        `Goal: reach ${GOAL_SCORE} score in 90 seconds.`,
        'Step 1: Click a department card to select it.',
        'Step 2: Click a matching request in the queue to dispatch it.',
        'Wrong routing hurts reputation; expired requests add misses and delays.',
        'Use Call Overtime to stabilize when things get chaotic.'
      ]);
      statusPill.textContent = 'Dispatch desk';
      resetState();
    }

    function getAdminControls() {
      return [
        { id: 'boost-rep', label: '🌟 +20 reputation' },
        { id: 'add-cash', label: '💵 +$800 cash' },
        { id: 'spawn-vip', label: '🎟️ Spawn VIP request' },
        { id: 'rush-now', label: '⚡ Trigger Rush Hour' }
      ];
    }

    function runAdminAction(actionId) {
      if (actionId === 'boost-rep') {
        resources.reputation = Math.min(100, resources.reputation + 20);
        showOverlay('Admin: reputation boosted.', 1000);
      }
      if (actionId === 'add-cash') {
        resources.cash += 800;
        maybeBuyUpgrade();
      }
      if (actionId === 'spawn-vip') {
        spawnRequest(true);
        showOverlay('Admin: VIP request spawned.', 1000);
      }
      if (actionId === 'rush-now') {
        triggerRush();
      }
    }

    function loop(now = nowMs()) {
      if (!currentWorld || currentWorld.id !== 'manager') return;
      const dt = lastTick ? Math.min(now - lastTick, 40) : 16.67;
      lastTick = now;
      update(now, dt);
      draw();
      animationFrameId = requestAnimationFrame(loop);
    }

    return { id:'manager', onStart, onStop, onMouseDown, onMouseMove, onMouseUp, onResize, onKeyDown, onKeyUp, loop, getAdminControls, runAdminAction };
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
    try {
      if (currentWorld.onStart) currentWorld.onStart();
    } catch (err) {
      console.error('World onStart failed:', err);
      renderStartupError(err);
      stopCurrentWorld();
      return;
    }
    if (!adminConsole.classList.contains('hidden')) renderAdminConsole();
    // Start animation
    (function run() {
      if (!currentWorld) return;
      try {
        if (currentWorld.loop) currentWorld.loop();
        else animationFrameId = requestAnimationFrame(run);
      } catch (err) {
        console.error('World loop failed:', err);
        renderStartupError(err);
        stopCurrentWorld();
      }
    })();
  }

  // Hook keyboard onto canvas focus
  canvas.addEventListener('focus', () => { /* nothing */ });

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
