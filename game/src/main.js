// Midnight Vault — the game loop and state machine.
// One file, one job: wire every module together. Title → play → pause /
// win / busted, plus the deterministic ?shot= scenes for screenshots.
import { ALARM, GRADES, VIEW_H, VIEW_W } from './config.js';
import { buildLevel } from './level.js';
import { makePlayer, updatePlayer, updateInteract, handleActionKey } from './player.js';
import { updateGuard, anyGuardSeesPlayer } from './guards.js';
import { updateCameras } from './cameras.js';
import { updateLasers } from './lasers.js';
import { updateAlarm, inLockdown, exitOpen } from './alarm.js';
import { makeAudio, winJingle, bustedJingle } from './audio.js';
import { draw } from './render.js';
import { applyShot, shotFromUrl } from './shots.js';

export function makeState(canvas) {
  const level = buildLevel();
  return {
    ctx: canvas.getContext('2d'),
    canvas,
    level,
    player: makePlayer(level.spawn),
    audio: makeAudio(),
    mode: 'title',
    time: 0,
    alarm: 0,
    lockdownUntil: 0,
    loot: 0,
    lootTotal: level.lootTotal,
    charges: 2,
    vaultProgress: 0,
    keys: {},
    smoke: [],
    coin: null,
    laserCooldown: 0,
    flash: null,
    flashUntil: 0,
    message: '',
    messageUntil: 0,
    objective: 'Steal the Star of Meridia, then escape to the van.',
    cameraSeesPlayer: false,
    anyGuardSees: false,
    winTime: 0,
    grade: '',
    bustedReason: '',
    shotName: null,
  };
}

export function startGame(state) {
  const fresh = makeState(state.canvas);
  // Keep the same canvas and audio objects; replace the rest.
  Object.assign(state, fresh, { canvas: state.canvas, ctx: state.ctx });
  state._bustedJingle = false;
  state.mode = 'play';
  state.message = 'Stay out of the cones. Shift to sneak.';
  state.messageUntil = 3;
  updateHud(state);
  showScreen(state, null);
}

// One frame of the live game.
export function update(dt, state) {
  if (state.mode !== 'play') return;
  state.time += dt;
  updatePlayer(dt, state);
  updateInteract(dt, state);
  for (const g of state.level.guards) updateGuard(g, dt, state);
  state.anyGuardSees = anyGuardSeesPlayer(state);
  if (state.anyGuardSees) {
    state.alarm = Math.min(100, state.alarm + 34 * dt);
  }
  updateCameras(dt, state);
  updateLasers(dt, state);
  updateAlarm(dt, state);

  // Win: the gem is pocketed and the thief reaches the van while the
  // exit is open.
  const gem = state.level.loot.find((item) => item.kind === 'gem');
  if (gem && gem.taken && exitOpen(state)) {
    const e = state.level.exit;
    const p = state.player;
    if (p.x >= e.x && p.x <= e.x + e.w && p.y >= e.y && p.y <= e.y + e.h) {
      state.mode = 'win';
      state.winTime = state.time;
      state.grade = gradeRun(state);
      winJingle(state.audio);
      updateHud(state);
      showScreen(state, 'win');
      return;
    }
  }
  updateHud(state);
}

function gradeRun(state) {
  const share = state.loot / state.lootTotal;
  for (const g of GRADES) {
    if (share >= g.min && state.winTime <= g.maxTime) return g.grade;
  }
  return 'C — Smash and Grab';
}

// --- HUD (DOM) --------------------------------------------------------------
const $ = (id) => document.getElementById(id);

export function updateHud(state) {
  const alarmFill = $('alarm-fill');
  if (alarmFill) {
    alarmFill.style.width = `${state.alarm}%`;
    alarmFill.style.background = state.alarm < 35 ? '#3ecf6e' : state.alarm < 70 ? '#f5b942' : '#ef4444';
  }
  const alarmText = $('alarm-text');
  if (alarmText) {
    alarmText.textContent = inLockdown(state)
      ? `LOCKDOWN ${Math.ceil(state.lockdownUntil - state.time)}s`
      : `ALARM ${Math.round(state.alarm)}`;
  }
  const loot = $('loot-text');
  if (loot) loot.textContent = `LOOT $${state.loot} / $${state.lootTotal}`;
  const tools = $('tools-text');
  if (tools) tools.textContent = `CHARGES ${state.charges} · 1 Lockpick  2 EMP  3 Smoke  4 Coin`;
  const timer = $('timer-text');
  if (timer) timer.textContent = `TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`;
  const obj = $('objective-text');
  if (obj) obj.textContent = state.objective;
  const winStats = $('win-stats');
  if (winStats && state.mode === 'win') {
    winStats.textContent = `Loot $${state.loot} of $${state.lootTotal} · ${state.winTime.toFixed(1)}s · ${state.grade}`;
  }
  const busted = $('busted-reason');
  if (busted && state.mode === 'busted') busted.textContent = state.bustedReason;
}

function showScreen(state, which) {
  for (const id of ['title-screen', 'pause-screen', 'win-screen', 'busted-screen']) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', id !== `${which}-screen`);
  }
  const hud = $('hud');
  if (hud) hud.classList.toggle('hidden', state.mode === 'title');
}

// --- Boot --------------------------------------------------------------------
export function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const state = makeState(canvas);
  window.__vaultState = state; // for headless playtests and debugging

  const shot = shotFromUrl(window.location.search);
  if (shot) {
    state.shotName = shot.name;
    applyShot(state, shot.name);
    draw(state);
    updateHud(state);
    showScreen(state, null);
    // Screenshots are exactly 1280x720 of game: hide the DOM chrome and
    // let the canvas fill the window; the HUD is drawn into the canvas.
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    const toolbar = document.getElementById('toolbar');
    if (toolbar) toolbar.style.display = 'none';
    return state;
  }

  // Title screen first; the game starts on button or Enter.
  showScreen(state, 'title');
  updateHud(state);
  draw(state);

  window.addEventListener('keydown', (ev) => {
    const key = ev.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) ev.preventDefault();
    state.audio.ensure();
    if (key === 'm') {
      state.audio.muted = !state.audio.muted;
      return;
    }
    if (state.mode === 'title' && (key === 'enter' || key === ' ')) {
      startGame(state);
      return;
    }
    if (state.mode === 'win' || state.mode === 'busted') {
      if (key === 'enter' || key === 'r') startGame(state);
      return;
    }
    if (key === 'p' || key === 'escape') {
      if (state.mode === 'play') {
        state.mode = 'pause';
        showScreen(state, 'pause');
      } else if (state.mode === 'pause') {
        state.mode = 'play';
        showScreen(state, null);
      }
      return;
    }
    if (state.mode !== 'play') return;
    if (key === 'e' || key === '1' || key === '2' || key === '3' || key === '4') {
      if (!ev.repeat) handleActionKey(key, state);
    }
    state.keys[key] = true;
  });
  window.addEventListener('keyup', (ev) => {
    state.keys[ev.key.toLowerCase()] = false;
  });
  document.getElementById('start-btn')?.addEventListener('click', () => startGame(state));
  document.getElementById('resume-btn')?.addEventListener('click', () => {
    state.mode = 'play';
    showScreen(state, null);
  });
  document.getElementById('restart-btn')?.addEventListener('click', () => startGame(state));
  document.getElementById('retry-btn')?.addEventListener('click', () => startGame(state));
  // Tool slots are clickable too, for mouse players.
  for (const tool of ['lockpick', 'emp', 'smoke', 'coin']) {
    document.getElementById(`tool-${tool}`)?.addEventListener('click', () => {
      if (state.mode === 'play') {
        import('./tools.js').then(({ tryUseTool }) => tryUseTool(tool, state));
      }
    });
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (state.mode === 'play') {
      update(dt, state);
      draw(state);
    } else if (state.mode === 'busted') {
      draw(state);
      if (!state._bustedJingle) {
        state._bustedJingle = true;
        bustedJingle(state.audio);
      }
    } else if (state.mode === 'win' || state.mode === 'pause' || state.mode === 'title') {
      draw(state);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return state;
}

boot();
