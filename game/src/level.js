// Midnight Vault — the floor plan.
// One file, one job: the map itself. One large floor, three zones plus the
// escape, with walls, doors, loot, patrols, cameras, lasers and shadows.
// Nothing here moves; the other modules move things around it.
import { VIEW_W, VIEW_H } from './config.js';

export const WALL = 16; // outer wall thickness

function wall(x, y, w, h) {
  return { x, y, w, h };
}

// --- Walls ---------------------------------------------------------------
export function buildWalls() {
  const walls = [
    // Outer shell.
    wall(0, 0, VIEW_W, WALL),
    wall(0, VIEW_H - WALL, VIEW_W, WALL),
    wall(0, 0, WALL, VIEW_H),
    wall(VIEW_W - WALL, 0, WALL, VIEW_H),
    // Divider gallery | laser hall (x 432..448): locked side door at
    // y 120..176, open main door at y 320..400, vent gap at y 540..600.
    wall(432, WALL, 16, 104),
    wall(432, 176, 16, 144),
    wall(432, 400, 16, 140),
    wall(432, 600, 16, 104),
    // Divider laser hall | vault (x 832..848): same three gaps.
    wall(832, WALL, 16, 104),
    wall(832, 176, 16, 144),
    wall(832, 400, 16, 140),
    wall(832, 600, 16, 104),
    // Vault chamber (x 968..984, y 40..280) with a locked door at y 130..190.
    wall(968, 40, 16, 90),
    wall(968, 190, 16, 90),
    wall(968, 40, 272, 16),
    wall(968, 264, 272, 16),
    // Gallery display cases and crates (solid furniture).
    wall(120, 200, 70, 44),
    wall(260, 200, 70, 44),
    wall(120, 420, 70, 44),
    wall(280, 430, 60, 40),
    wall(180, 520, 46, 46),
    wall(330, 540, 46, 46),
    // Laser hall pillars.
    wall(560, 150, 40, 40),
    wall(700, 480, 40, 40),
    // Vault zone crates and a desk.
    wall(900, 500, 46, 46),
    wall(1080, 520, 46, 46),
    wall(900, 120, 90, 40),
  ];
  return walls;
}

// --- Doors ----------------------------------------------------------------
// A locked door blocks movement until picked. `open` doors stop colliding.
export function buildDoors() {
  return [
    { id: 'side-1', x: 432, y: 120, w: 16, h: 56, locked: true, open: false, channel: 0 },
    { id: 'side-2', x: 832, y: 120, w: 16, h: 56, locked: true, open: false, channel: 0 },
    { id: 'vault', x: 968, y: 130, w: 16, h: 60, locked: true, open: false, channel: 0 },
  ];
}

// --- Loot -----------------------------------------------------------------
export function buildLoot() {
  return [
    { id: 'paint-1', kind: 'painting', x: 90, y: 44, value: 150, taken: false },
    { id: 'paint-2', kind: 'painting', x: 220, y: 44, value: 150, taken: false },
    { id: 'paint-3', kind: 'painting', x: 350, y: 44, value: 150, taken: false },
    { id: 'case-1', kind: 'case', x: 155, y: 244, value: 200, taken: false },
    { id: 'case-2', kind: 'case', x: 295, y: 244, value: 200, taken: false },
    { id: 'gold-1', kind: 'gold', x: 560, y: 300, value: 300, taken: false },
    { id: 'gold-2', kind: 'gold', x: 660, y: 300, value: 300, taken: false },
    { id: 'gold-3', kind: 'gold', x: 760, y: 300, value: 300, taken: false },
    { id: 'gem', kind: 'gem', x: 1120, y: 150, value: 1000, taken: false },
  ];
}

// --- Guards, cameras, lasers ---------------------------------------------
export function buildGuards() {
  return [
    {
      id: 'g1', x: 120, y: 300, dir: 0,
      waypoints: [[120, 300], [340, 300], [340, 560], [120, 560]],
      wp: 0, state: 'calm', suspicion: 0,
      lastSeenX: 0, lastSeenY: 0, loseTimer: 0, scanTimer: 0,
      checkX: 0, checkY: 0, catchTimer: 0, coinX: 0, coinY: 0, coinTimer: 0,
    },
    {
      id: 'g2', x: 100, y: 140, dir: 0,
      waypoints: [[100, 140], [360, 140], [360, 260], [100, 260]],
      wp: 0, state: 'calm', suspicion: 0,
      lastSeenX: 0, lastSeenY: 0, loseTimer: 0, scanTimer: 0,
      checkX: 0, checkY: 0, catchTimer: 0, coinX: 0, coinY: 0, coinTimer: 0,
    },
    {
      id: 'g3', x: 520, y: 420, dir: 0,
      waypoints: [[520, 420], [780, 420], [780, 620], [520, 620]],
      wp: 0, state: 'calm', suspicion: 0,
      lastSeenX: 0, lastSeenY: 0, loseTimer: 0, scanTimer: 0,
      checkX: 0, checkY: 0, catchTimer: 0, coinX: 0, coinY: 0, coinTimer: 0,
    },
    {
      id: 'g4', x: 900, y: 300, dir: 0,
      waypoints: [[900, 300], [1180, 300], [1180, 620], [900, 620]],
      wp: 0, state: 'calm', suspicion: 0,
      lastSeenX: 0, lastSeenY: 0, loseTimer: 0, scanTimer: 0,
      checkX: 0, checkY: 0, catchTimer: 0, coinX: 0, coinY: 0, coinTimer: 0,
    },
    {
      id: 'g5', x: 1000, y: 300, dir: 0,
      waypoints: [[1000, 300], [1000, 480], [1180, 480], [1180, 300]],
      wp: 0, state: 'calm', suspicion: 0,
      lastSeenX: 0, lastSeenY: 0, loseTimer: 0, scanTimer: 0,
      checkX: 0, checkY: 0, catchTimer: 0, coinX: 0, coinY: 0, coinTimer: 0,
    },
  ];
}

export function buildCameras() {
  return [
    { id: 'c1', x: 440, y: 60, baseAngle: Math.PI, angle: Math.PI, range: 260, disabledUntil: 0, sweepDir: 1 },
    { id: 'c2', x: 640, y: 32, baseAngle: Math.PI / 2, angle: Math.PI / 2, range: 260, disabledUntil: 0, sweepDir: 1 },
    { id: 'c3', x: 760, y: 688, baseAngle: -Math.PI / 2, angle: -Math.PI / 2, range: 260, disabledUntil: 0, sweepDir: -1 },
    { id: 'c4', x: 1000, y: 56, baseAngle: Math.PI / 2, angle: Math.PI / 2, range: 260, disabledUntil: 0, sweepDir: 1 },
  ];
}

// A laser is live for the first 55% of each period, dark for the rest.
export function buildLasers() {
  return [
    { x1: 470, y1: 260, x2: 810, y2: 260, period: 3.0, phase: 0.0 },
    { x1: 470, y1: 340, x2: 810, y2: 340, period: 3.0, phase: 1.5 },
    { x1: 470, y1: 460, x2: 810, y2: 460, period: 4.0, phase: 0.7 },
    { x1: 560, y1: 200, x2: 560, y2: 520, period: 4.0, phase: 2.0 },
    { x1: 700, y1: 200, x2: 700, y2: 520, period: 3.4, phase: 1.1 },
  ];
}

// --- Shadows, pickups, spawn, exit, vault --------------------------------
export function buildShadows() {
  return [
    { x: 40, y: 540, w: 140, h: 140 },
    { x: 300, y: 520, w: 120, h: 140 },
    { x: 470, y: 560, w: 140, h: 120 },
    { x: 700, y: 60, w: 120, h: 120 },
    { x: 880, y: 540, w: 140, h: 140 },
    { x: 1000, y: 300, w: 220, h: 40 },
  ];
}

export function buildPickups() {
  return [
    { id: 'charge-1', kind: 'charge', x: 640, y: 620, taken: false },
    { id: 'charge-2', kind: 'charge', x: 1180, y: 60, taken: false },
  ];
}

export const SPAWN = { x: 80, y: 640 };
export const EXIT = { x: 1120, y: 620, w: 110, h: 70 };
export const VAULT = { x: 1120, y: 150, w: 64, h: 64 };

export function buildLevel() {
  const loot = buildLoot();
  return {
    walls: buildWalls(),
    doors: buildDoors(),
    loot,
    lootTotal: loot.reduce((sum, item) => sum + item.value, 0),
    guards: buildGuards(),
    cameras: buildCameras(),
    lasers: buildLasers(),
    shadows: buildShadows(),
    pickups: buildPickups(),
    spawn: { ...SPAWN },
    exit: { ...EXIT },
    vault: { ...VAULT },
  };
}

// --- Geometry helpers ------------------------------------------------------
// Does segment (x1,y1)-(x2,y2) cross rectangle r? Liang-Barsky clipping.
export function segHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

// Is the sight line blocked by any wall or closed door?
export function sightBlocked(x1, y1, x2, y2, walls, doors) {
  for (const w of walls) {
    if (segHitsRect(x1, y1, x2, y2, w)) return true;
  }
  for (const d of doors) {
    if (!d.open && segHitsRect(x1, y1, x2, y2, d)) return true;
  }
  return false;
}

// Push a circle (x, y, r) out of every solid rectangle it overlaps.
export function collideCircle(x, y, r, solids) {
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) {
        // Dead centre: push out along the smallest penetration axis.
        const left = x - s.x;
        const right = s.x + s.w - x;
        const top = y - s.y;
        const bottom = s.y + s.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = s.x - r;
        else if (m === right) x = s.x + s.w + r;
        else if (m === top) y = s.y - r;
        else y = s.y + s.h + r;
      } else {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      }
    }
  }
  return { x, y };
}

export function pointInShadow(x, y, shadows) {
  for (const s of shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}
