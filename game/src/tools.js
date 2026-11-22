// Midnight Vault — the thief's tools.
// One file, one job: four tools, each costing one charge. Charges are
// scarce by design — the loadout decision is the strategy.
import { TOOLS } from './config.js';
import { dist } from './random.js';
import { disableAllCameras } from './cameras.js';
import { distractGuards } from './guards.js';

export const TOOL_NAMES = {
  lockpick: 'Lockpick',
  emp: 'EMP charge',
  smoke: 'Smoke bomb',
  coin: 'Noise coin',
};

export const TOOL_KEYS = { lockpick: '1', emp: '2', smoke: '3', coin: '4' };

// Spend one charge on a tool. Returns true when it fired.
export function tryUseTool(name, state) {
  if (state.charges <= 0) {
    state.message = 'No charges left — find a tool cache.';
    state.messageUntil = state.time + 2;
    state.audio.deny();
    return false;
  }
  const player = state.player;
  if (name === 'lockpick') {
    // Instantly open the nearest locked door within reach.
    let best = null;
    let bestD = Infinity;
    for (const door of state.level.doors) {
      if (!door.locked) continue;
      const d = dist(player.x, player.y, door.x + door.w / 2, door.y + door.h / 2);
      if (d < bestD) {
        bestD = d;
        best = door;
      }
    }
    if (!best || bestD > 70) {
      state.message = 'No locked door in reach for the lockpick.';
      state.messageUntil = state.time + 2;
      state.audio.deny();
      return false;
    }
    best.locked = false;
    best.open = true;
    state.audio.unlock();
    state.message = 'Lockpick: the door clicks open.';
  } else if (name === 'emp') {
    disableAllCameras(state, TOOLS.empSec);
    state.audio.emp();
    state.message = `EMP burst — cameras dark for ${TOOLS.empSec}s.`;
  } else if (name === 'smoke') {
    state.smoke.push({ x: player.x, y: player.y, radius: TOOLS.smokeRadius, until: state.time + TOOLS.smokeSec });
    state.audio.smoke();
    state.message = 'Smoke out — nobody can see through it.';
  } else if (name === 'coin') {
    const cx = player.x + Math.cos(player.dir) * TOOLS.coinThrowDist;
    const cy = player.y + Math.sin(player.dir) * TOOLS.coinThrowDist;
    state.coin = { x: cx, y: cy, until: state.time + TOOLS.coinLingerSec };
    distractGuards(cx, cy, state);
    state.audio.coin();
    state.message = 'Coin tossed — a guard goes to check the clink.';
  } else {
    return false;
  }
  state.charges -= 1;
  state.messageUntil = state.time + 2.5;
  return true;
}

// One-line summary of the loadout for the HUD: "Charges: 2 · 1 Lockpick
// 2 EMP 3 Smoke 4 Coin". The HUD renders it from this.
export function toolSummary(state) {
  return `Charges: ${state.charges}  ·  1 Lockpick  2 EMP  3 Smoke  4 Coin`;
}

// Which tools are usable right now (a lockpick needs a door in reach)?
export function usableTools(state) {
  const player = state.player;
  let doorNear = false;
  for (const door of state.level.doors) {
    if (door.locked && dist(player.x, player.y, door.x + door.w / 2, door.y + door.h / 2) <= 70) {
      doorNear = true;
      break;
    }
  }
  return { lockpick: doorNear, emp: true, smoke: true, coin: true };
}
