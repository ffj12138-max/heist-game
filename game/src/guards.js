// Midnight Vault — guard patrols and vision.
// One file, one job: how a guard walks its route, what it can see, and how
// curiosity turns into suspicion and then a chase.
import { GUARD, SHADOW_FACTOR } from './config.js';
import { angleDiff, clamp, dist, inCone, turnToward } from './random.js';
import { collideCircle, pointInShadow, sightBlocked } from './level.js';

// Can this guard see the player right now? Returns 'full' (square in the
// cone, clear line), 'glimpse' (edge of the cone, or far), or 'none'.
// Smoke breaks sight; shadow shrinks the effective range.
export function guardSees(guard, player, state) {
  const d = dist(guard.x, guard.y, player.x, player.y);
  const range = player.sneaking ? GUARD.sneakViewRange : GUARD.viewRange;
  if (d > range) return 'none';
  const angle = Math.atan2(player.y - guard.y, player.x - guard.x);
  const half = GUARD.viewHalfAngle;
  const diff = Math.abs(angleDiff(guard.dir, angle));
  if (diff > half) return 'none';
  if (sightBlocked(guard.x, guard.y, player.x, player.y, state.level.walls, state.level.doors)) return 'none';
  if (inSmoke(player.x, player.y, state)) return 'none';
  if (pointInShadow(player.x, player.y, state.level.shadows)) {
    // In shadow the guard must be close to notice at all.
    if (d > range * 0.55) return 'none';
  }
  if (diff > half * 0.72 || d > range * 0.82) return 'glimpse';
  return 'full';
}

export function inSmoke(x, y, state) {
  for (const s of state.smoke) {
    if (state.time < s.until && dist(x, y, s.x, s.y) < s.radius) return true;
  }
  return false;
}

// The nearest guard that heard a noise walks to check it.
export function distractGuards(x, y, state) {
  let best = null;
  let bestD = Infinity;
  for (const g of state.level.guards) {
    const d = dist(g.x, g.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  if (best && bestD < 320) {
    best.coinX = x;
    best.coinY = y;
    best.coinTimer = 6;
    if (best.state === 'calm') {
      best.state = 'suspicious';
      best.checkX = x;
      best.checkY = y;
    }
  }
}

// Move one guard for dt seconds. Returns nothing; mutates the guard and,
// through the alarm hooks, the shared state.
export function updateGuard(guard, dt, state) {
  const player = state.player;
  const seen = guardSees(guard, player, state);

  // --- suspicion ----------------------------------------------------------
  if (seen === 'full') {
    let rate = dist(guard.x, guard.y, player.x, player.y) > GUARD.viewRange * 0.6
      ? GUARD.suspicionFarPerSec
      : GUARD.suspicionPerSec;
    if (player.sneaking) rate *= 0.55;
    if (pointInShadow(player.x, player.y, state.level.shadows)) rate *= SHADOW_FACTOR;
    guard.suspicion = clamp(guard.suspicion + rate * dt, 0, 100);
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    guard.loseTimer = 0;
  } else if (seen === 'glimpse') {
    guard.suspicion = clamp(guard.suspicion + GUARD.glimpsePerSec * dt, 0, 100);
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    guard.loseTimer = 0;
  } else {
    guard.suspicion = clamp(guard.suspicion - GUARD.suspicionDecayPerSec * dt, 0, 100);
    guard.loseTimer += dt;
  }

  // --- state changes ------------------------------------------------------
  if (guard.suspicion >= 100 && guard.state !== 'alert') {
    guard.state = 'alert';
    guard.catchTimer = 0;
    state.audio.sting();
  } else if (guard.state === 'calm' && guard.suspicion >= GUARD.suspiciousAt) {
    guard.state = 'suspicious';
    guard.checkX = guard.lastSeenX;
    guard.checkY = guard.lastSeenY;
  }
  if (guard.state === 'alert' && guard.loseTimer > GUARD.loseSightSec) {
    guard.state = 'suspicious';
    guard.checkX = guard.lastSeenX;
    guard.checkY = guard.lastSeenY;
    guard.suspicion = GUARD.suspiciousAt;
  }

  // A coin distraction overrides a calm patrol, never an alert chase.
  if (guard.coinTimer > 0) {
    guard.coinTimer -= dt;
    if (guard.state === 'calm' || guard.state === 'suspicious') {
      guard.checkX = guard.coinX;
      guard.checkY = guard.coinY;
    }
  }

  // --- movement -----------------------------------------------------------
  const solids = [...state.level.walls, ...state.level.doors.filter((d) => !d.open)];
  let targetX;
  let targetY;
  let speed;
  if (guard.state === 'alert') {
    targetX = player.x;
    targetY = player.y;
    speed = GUARD.chaseSpeed;
  } else if (guard.state === 'suspicious') {
    targetX = guard.checkX;
    targetY = guard.checkY;
    speed = GUARD.suspiciousSpeed;
  } else {
    const wp = guard.waypoints[guard.wp];
    targetX = wp[0];
    targetY = wp[1];
    speed = GUARD.patrolSpeed;
  }

  const d = dist(guard.x, guard.y, targetX, targetY);
  if (d > 4) {
    const want = Math.atan2(targetY - guard.y, targetX - guard.x);
    guard.dir = turnToward(guard.dir, want, 6 * dt);
    const step = Math.min(speed * dt, d);
    const nx = guard.x + Math.cos(guard.dir) * step;
    const ny = guard.y + Math.sin(guard.dir) * step;
    const fixed = collideCircle(nx, ny, GUARD.radius, solids);
    guard.x = fixed.x;
    guard.y = fixed.y;
  } else if (guard.state === 'calm') {
    // Reached a waypoint: pause, sweep the cone, then move on.
    guard.scanTimer += dt;
    guard.dir += Math.sin(state.time * 0.9 + guard.waypoints.length) * 0.35 * dt;
    if (guard.scanTimer > 1.6) {
      guard.scanTimer = 0;
      guard.wp = (guard.wp + 1) % guard.waypoints.length;
    }
  } else if (guard.state === 'suspicious') {
    // Reached the check spot: look around, then give up and go back.
    guard.scanTimer += dt;
    guard.dir += 1.4 * dt;
    if (guard.scanTimer > 2.4) {
      guard.scanTimer = 0;
      guard.state = 'calm';
      guard.suspicion = 0;
    }
  }

  // --- catching ------------------------------------------------------------
  if (guard.state === 'alert') {
    const pd = dist(guard.x, guard.y, player.x, player.y);
    if (pd < GUARD.catchRange) {
      guard.catchTimer += dt;
      if (guard.catchTimer >= GUARD.catchGraceSec) {
        state.mode = 'busted';
        state.bustedReason = 'A guard grabbed you in the open.';
      }
    } else {
      guard.catchTimer = 0;
    }
  }
}

// Guards currently chasing or suspicious, for the HUD and the alarm.
export function guardsOnAlert(state) {
  return state.level.guards.filter((g) => g.state === 'alert').length;
}

export function anyGuardSeesPlayer(state) {
  for (const g of state.level.guards) {
    if (guardSees(g, state.player, state) === 'full') return true;
  }
  return false;
}
