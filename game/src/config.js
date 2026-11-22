// Midnight Vault — tuning constants.
// One file, one job: every number the game balances on lives here so the
// rest of the code reads like rules, not magic numbers.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// The player: a thief in soft shoes. Sneaking is slow and quiet and much
// harder to spot; walking is the default; there is no sprint — a heist is
// won by patience, and the alarm punishes haste instead.
export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 92,
  noiseWalk: 95,
  noiseSneak: 34,
};

// Guards patrol, get suspicious, then chase. A glimpse only makes them
// curious; a full sighting turns them.
export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  suspiciousSpeed: 105,
  chaseSpeed: 158,
  viewRange: 235,
  viewHalfAngle: 0.62, // ~35.5 degrees each side
  sneakViewRange: 155,
  suspicionPerSec: 95, // full view, close, standing
  suspicionFarPerSec: 42, // full view, far away
  glimpsePerSec: 26, // edge of the cone only
  suspicionDecayPerSec: 18,
  suspiciousAt: 42,
  loseSightSec: 4,
  catchGraceSec: 0.6,
  catchRange: 26,
};

// Wall cameras sweep back and forth and feed the alarm, never the chase.
export const CAMERA = {
  range: 260,
  halfAngle: 0.5,
  alarmPerSec: 26,
  sweepSpeed: 0.55, // radians per second of sweep
  sweepArc: 0.85, // radians each side of the base angle
};

// Laser beams blink on a timer. Crossing a live beam hurts.
export const LASER = {
  tripAlarm: 26,
  tripCooldownSec: 1.2,
};

// The alarm is the game's shared tension meter. It decays when nobody
// sees you, and at 100 the building locks down.
export const ALARM = {
  decayPerSec: 1.6,
  lockdownAt: 100,
  lockdownSec: 10,
  guardSeenPerSec: 34, // alarm rise while a guard has full eyes on you
  cameraSeenPerSec: 26,
};

// Tools. Every use costs one charge and charges are scarce on purpose:
// the loadout decision is the strategy. Start with two.
export const TOOLS = {
  startCharges: 2,
  lockpickChannelSec: 2,
  empSec: 8,
  smokeSec: 5,
  smokeRadius: 95,
  coinThrowDist: 130,
  coinDistractRadius: 320,
  coinLingerSec: 6,
};

// The vault: hold E and keep the needle in the green. About a second and
// a half of good needle work cracks it; the needle spends 30% of its sweep
// in the green, so a steady hand cracks it in roughly six seconds of
// holding — long enough for a patrol to wander over. Bad needle work
// barely undoes it, so the crack always moves forward.
export const VAULT = {
  crackSeconds: 1.5,
  greenLow: 35,
  greenHigh: 65,
  decayPerSec: 0.05, // progress lost per second outside the green
  needleSpeed: 70, // needle units per second
  interactRange: 70,
};

export const LOOT = {
  interactRange: 46,
  doorRange: 52,
};

export const SHADOW_FACTOR = 0.5; // detection speed while in shadow

// Scoring: loot value collected over total, plus time, grades the run.
export const GRADES = [
  { min: 0.95, maxTime: 240, grade: 'S — Clean Getaway' },
  { min: 0.8, maxTime: 300, grade: 'A — Professional' },
  { min: 0.6, maxTime: 360, grade: 'B — Amateur Hour' },
  { min: 0.0, maxTime: Infinity, grade: 'C — Smash and Grab' },
];
// Midnight Vault — seeded random numbers.
// One file, one job: deterministic randomness so a ?shot= scene (and a
// replay) renders the same frame every time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Shortest angular distance from `from` to `to`, in (-PI, PI].
export function angleDiff(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Turn `current` toward `target` by at most `maxStep` radians.
export function turnToward(current, target, maxStep) {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

// Is `angle` within `halfAngle` of `facing`?
export function inCone(facing, angle, halfAngle) {
  return Math.abs(angleDiff(facing, angle)) <= halfAngle;
}
