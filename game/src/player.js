// Midnight Vault — the thief.
// One file, one job: moving the player, what they can hear and be heard
// by, and every interaction (loot, doors, the vault, pickups). Tools live
// in tools.js; this file only asks it to spend a charge.
import { LOOT, PLAYER, VAULT } from './config.js';
import { clamp, dist } from './random.js';
import { collideCircle, pointInShadow } from './level.js';
import { tryUseTool } from './tools.js';

export function makePlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    dir: -Math.PI / 2, // facing up, into the gallery
    sneaking: false,
    moving: false,
    stepTimer: 0,
    channelDoor: null,
    channelTime: 0,
    cracking: false,
    needle: 50,
    needleDir: 1,
  };
}

// Move the player for dt seconds from the held keys. Returns nothing.
export function updatePlayer(dt, state) {
  const p = state.player;
  const keys = state.keys;
  let mx = 0;
  let my = 0;
  if (keys['arrowup'] || keys['w']) my -= 1;
  if (keys['arrowdown'] || keys['s']) my += 1;
  if (keys['arrowleft'] || keys['a']) mx -= 1;
  if (keys['arrowright'] || keys['d']) mx += 1;
  p.sneaking = Boolean(keys['shift']);
  p.moving = mx !== 0 || my !== 0;

  if (p.moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.dir = Math.atan2(my, mx);
    const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    const solids = [...state.level.walls, ...state.level.doors.filter((d) => !d.open)];
    const fixed = collideCircle(nx, ny, PLAYER.radius, solids);
    p.x = clamp(fixed.x, 20, 1260);
    p.y = clamp(fixed.y, 20, 700);
    // Footsteps: soft ticks, slower and quieter while sneaking.
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.sneaking ? 0.55 : 0.34;
      state.audio.step(p.sneaking);
      makeNoise(state, p.sneaking ? PLAYER.noiseSneak : PLAYER.noiseWalk);
    }
  }

  // The vault needle only moves while the thief is cracking.
  if (p.cracking) {
    p.needle += p.needleDir * VAULT.needleSpeed * dt;
    if (p.needle >= 100) {
      p.needle = 100;
      p.needleDir = -1;
    } else if (p.needle <= 0) {
      p.needle = 0;
      p.needleDir = 1;
    }
  }
}

// A footstep is a sound a nearby guard can hear: close guards turn
// suspicious and come to check the spot.
function makeNoise(state, radius) {
  for (const g of state.level.guards) {
    const d = dist(g.x, g.y, state.player.x, state.player.y);
    if (d < radius && g.state === 'calm') {
      g.state = 'suspicious';
      g.checkX = state.player.x;
      g.checkY = state.player.y;
      g.suspicion = Math.max(g.suspicion, 45);
    }
  }
}

// --- Interaction -----------------------------------------------------------
// E does whatever is nearest: take loot, pick a lock, crack the vault, or
// grab a tool cache. Called once per key press, not every frame.
export function interact(state) {
  const p = state.player;
  const level = state.level;

  // 1. The gem lives in the vault: cracking is a held interaction, handled
  // in updateInteract; a tap of E here starts it.
  const gem = level.loot.find((item) => item.kind === 'gem');
  if (gem && !gem.taken && dist(p.x, p.y, level.vault.x, level.vault.y) < VAULT.interactRange) {
    p.cracking = !p.cracking;
    if (p.cracking) {
      state.message = 'Hold steady — keep the needle in the green!';
      state.messageUntil = state.time + 2;
    }
    return;
  }

  // 2. Small loot within reach.
  for (const item of level.loot) {
    if (item.taken || item.kind === 'gem') continue;
    if (dist(p.x, p.y, item.x, item.y) < LOOT.interactRange) {
      item.taken = true;
      state.loot += item.value;
      state.audio.pickup();
      state.message = `Pocketed ${item.kind} — $${item.value}.`;
      state.messageUntil = state.time + 2;
      return;
    }
  }

  // 3. A tool cache within reach.
  for (const pk of level.pickups) {
    if (!pk.taken && dist(p.x, p.y, pk.x, pk.y) < LOOT.interactRange) {
      pk.taken = true;
      state.charges += 1;
      state.audio.pickup();
      state.message = 'Tool cache: +1 charge.';
      state.messageUntil = state.time + 2;
      return;
    }
  }

  // 4. A locked door within reach starts the lockpick channel.
  for (const door of level.doors) {
    if (door.locked && !door.open) {
      const cx = door.x + door.w / 2;
      const cy = door.y + door.h / 2;
      if (dist(p.x, p.y, cx, cy) < LOOT.doorRange) {
        p.channelDoor = door;
        p.channelTime = 0;
        state.message = 'Picking the lock — hold E...';
        state.messageUntil = state.time + 2;
        return;
      }
    }
  }
}

// Held-E progress: the lockpick channel and the vault crack. Called every
// frame while E is held down.
export function updateInteract(dt, state) {
  const p = state.player;
  const keys = state.keys;

  // Lockpick channel: hold E near a locked door for two seconds.
  if (p.channelDoor) {
    const door = p.channelDoor;
    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    if (!keys['e'] || dist(p.x, p.y, cx, cy) > LOOT.doorRange + 14) {
      p.channelDoor = null;
      p.channelTime = 0;
      return;
    }
    p.channelTime += dt;
    if (Math.floor(p.channelTime * 4) !== Math.floor((p.channelTime - dt) * 4)) {
      state.audio.tick();
    }
    if (p.channelTime >= 2) {
      door.locked = false;
      door.open = true;
      p.channelDoor = null;
      p.channelTime = 0;
      state.audio.unlock();
      state.message = 'Lock picked — the door swings open.';
      state.messageUntil = state.time + 2;
    }
    return;
  }

  // Vault crack: hold E, keep the needle in the green, fill the progress.
  if (p.cracking) {
    const gem = state.level.loot.find((item) => item.kind === 'gem');
    if (!gem || gem.taken) {
      p.cracking = false;
      return;
    }
    if (!keys['e']) {
      p.cracking = false;
      return;
    }
    if (dist(p.x, p.y, state.level.vault.x, state.level.vault.y) > VAULT.interactRange + 10) {
      p.cracking = false;
      state.message = 'Too far from the vault — the crack fails.';
      state.messageUntil = state.time + 2;
      return;
    }
    if (p.needle >= VAULT.greenLow && p.needle <= VAULT.greenHigh) {
      state.vaultProgress += dt / VAULT.crackSeconds;
      if (Math.floor(state.vaultProgress * 10) !== Math.floor((state.vaultProgress - dt / VAULT.crackSeconds) * 10)) {
        state.audio.tick();
      }
    } else {
      state.vaultProgress = Math.max(0, state.vaultProgress - VAULT.decayPerSec * dt);
    }
    if (state.vaultProgress >= 1) {
      gem.taken = true;
      state.loot += gem.value;
      state.vaultProgress = 1;
      p.cracking = false;
      state.audio.gem();
      state.message = 'The Star of Meridia is yours. Get to the van!';
      state.messageUntil = state.time + 3;
      state.objective = 'Escape to the getaway van!';
    }
  }
}

// Number keys 1-4 use a tool; E interacts. Called once per key press.
export function handleActionKey(key, state) {
  if (key === 'e') {
    interact(state);
    return;
  }
  const toolIndex = { 1: 'lockpick', 2: 'emp', 3: 'smoke', 4: 'coin' }[key];
  if (toolIndex) tryUseTool(toolIndex, state);
}

export function playerInShadow(state) {
  return pointInShadow(state.player.x, state.player.y, state.level.shadows);
}
