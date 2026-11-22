// Midnight Vault — canvas rendering.
// One file, one job: everything the eye sees. Top-down, one floor, three
// zones: warm gallery, cold laser hall, deep vault, and the getaway van.
// Danger (cones, lasers, alarm) is red and amber; loot is gold; safety
// (shadow, cover) is dark blue-green. Readable at a glance, even shrunk.
import { GUARD, VIEW_H, VIEW_W } from './config.js';
import { clamp, dist } from './random.js';
import { laserLive, laserPhase } from './lasers.js';
import { cameraLive } from './cameras.js';

const ZONE_TINTS = [
  { x: 16, y: 16, w: 416, h: 688, fill: '#2a2118', label: 'GALLERY' },
  { x: 448, y: 16, w: 384, h: 688, fill: '#182230', label: 'LASER HALL' },
  { x: 848, y: 16, w: 416, h: 688, fill: '#241a2e', label: 'VAULT' },
];

export function draw(state) {
  const ctx = state.ctx;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, state);
  drawShadows(ctx, state);
  drawVault(ctx, state);
  drawLoot(ctx, state);
  drawExit(ctx, state);
  drawWalls(ctx, state);
  drawDoors(ctx, state);
  drawLasers(ctx, state);
  drawSmoke(ctx, state);
  drawCameraCones(ctx, state);
  drawGuardCones(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
  drawCoin(ctx, state);
  drawOverlays(ctx, state);
}

function drawFloor(ctx, state) {
  ctx.fillStyle = '#14161c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const z of ZONE_TINTS) {
    ctx.fillStyle = z.fill;
    ctx.fillRect(z.x, z.y, z.w, z.h);
  }
  // Floor tiles: faint grid, so movement reads.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 16; x < VIEW_W; x += 40) {
    ctx.moveTo(x, 16);
    ctx.lineTo(x, VIEW_H - 16);
  }
  for (let y = 16; y < VIEW_H; y += 40) {
    ctx.moveTo(16, y);
    ctx.lineTo(VIEW_W - 16, y);
  }
  ctx.stroke();
  // Zone labels, small and out of the way.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GALLERY', 28, 700);
  ctx.fillText('LASER HALL', 460, 700);
  ctx.fillText('VAULT', 860, 700);
  // Vent grates in the low gaps between zones.
  drawVent(ctx, 440, 540, 60);
  drawVent(ctx, 840, 540, 60);
}

function drawVent(ctx, x, y, h) {
  ctx.fillStyle = '#0d0f13';
  ctx.fillRect(x, y, 16, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(x + 3, y + (h / 4) * i);
    ctx.lineTo(x + 13, y + (h / 4) * i);
  }
  ctx.stroke();
}

function drawShadows(ctx, state) {
  for (const s of state.level.shadows) {
    ctx.fillStyle = 'rgba(20, 60, 90, 0.35)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(90, 160, 220, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
  }
}

function drawWalls(ctx, state) {
  for (const w of state.level.walls) {
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#565d6d';
    ctx.fillRect(w.x, w.y, w.w, 3);
  }
}

function drawDoors(ctx, state) {
  for (const d of state.level.doors) {
    if (d.open) {
      ctx.fillStyle = 'rgba(120, 200, 140, 0.25)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      continue;
    }
    ctx.fillStyle = d.locked ? '#8a6d2f' : '#6b7c5e';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#d9b45b';
    ctx.fillRect(d.x + d.w / 2 - 2, d.y + d.h / 2 - 2, 4, 4);
    if (d.locked) {
      // A drawn padlock: body plus shackle, no emoji font needed.
      const px = d.x + d.w / 2;
      const py = d.y - 10;
      ctx.strokeStyle = '#ffd970';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 4, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#ffd970';
      ctx.fillRect(px - 5, py, 10, 8);
    }
  }
}

function drawLoot(ctx, state) {
  const t = state.time;
  for (const item of state.level.loot) {
    if (item.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3 + item.x);
    if (item.kind === 'painting') {
      ctx.fillStyle = '#6b4f2a';
      ctx.fillRect(item.x - 26, item.y - 6, 52, 34);
      ctx.fillStyle = '#c9a86a';
      ctx.fillRect(item.x - 22, item.y - 2, 44, 26);
      ctx.fillStyle = '#7a5c2e';
      ctx.beginPath();
      ctx.arc(item.x, item.y + 11, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'case') {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(item.x - 22, item.y - 14, 44, 28);
      ctx.fillStyle = `rgba(255, 214, 90, ${0.5 + 0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'gold') {
      ctx.fillStyle = `rgba(255, 200, 40, ${0.55 + 0.45 * pulse})`;
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(item.x + i * 12 - 5, item.y - 4, 10, 8);
      }
    } else if (item.kind === 'gem') {
      // The gem glows inside the vault — the loot target of the whole run.
      const g = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, 46);
      g.addColorStop(0, `rgba(120, 220, 255, ${0.75 * pulse + 0.2})`);
      g.addColorStop(1, 'rgba(120, 220, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7fe3ff';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 14);
      ctx.lineTo(item.x + 11, item.y);
      ctx.lineTo(item.x, item.y + 14);
      ctx.lineTo(item.x - 11, item.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eafcff';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 7);
      ctx.lineTo(item.x + 5, item.y);
      ctx.lineTo(item.x, item.y + 7);
      ctx.lineTo(item.x - 5, item.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Tool caches: small green crates with a white cross.
  for (const pk of state.level.pickups) {
    if (pk.taken) continue;
    ctx.fillStyle = '#2f7d4f';
    ctx.fillRect(pk.x - 12, pk.y - 12, 24, 24);
    ctx.fillStyle = '#e8fff0';
    ctx.fillRect(pk.x - 2, pk.y - 8, 4, 16);
    ctx.fillRect(pk.x - 8, pk.y - 2, 16, 4);
  }
}

function drawVault(ctx, state) {
  const v = state.level.vault;
  ctx.fillStyle = '#20242e';
  ctx.fillRect(v.x - 34, v.y - 34, 68, 68);
  ctx.strokeStyle = '#8b93a5';
  ctx.lineWidth = 3;
  ctx.strokeRect(v.x - 34, v.y - 34, 68, 68);
  ctx.strokeStyle = '#565d6d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd6';
  ctx.beginPath();
  ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', v.x, v.y - 42);
}

function drawExit(ctx, state) {
  const e = state.level.exit;
  const locked = state.lockdownUntil > state.time;
  ctx.fillStyle = locked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(62, 207, 110, 0.22)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = locked ? '#ef4444' : '#3ecf6e';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.setLineDash([]);
  // The getaway van, parked in the exit bay.
  const vx = e.x + 8;
  const vy = e.y + 12;
  ctx.fillStyle = '#1f6feb';
  ctx.fillRect(vx, vy, 94, 34);
  ctx.fillStyle = '#9ec5ff';
  ctx.fillRect(vx + 66, vy + 5, 22, 24);
  ctx.fillStyle = '#0b1526';
  ctx.beginPath();
  ctx.arc(vx + 20, vy + 36, 7, 0, Math.PI * 2);
  ctx.arc(vx + 76, vy + 36, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(vx + 92, vy + 12, 3, 0, Math.PI * 2);
  ctx.arc(vx + 92, vy + 26, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = locked ? '#ff9a9a' : '#eafff0';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(locked ? 'EXIT SEALED' : 'GETAWAY VAN', e.x + e.w / 2, e.y + e.h - 6);
}

function drawLasers(ctx, state) {
  for (const beam of state.level.lasers) {
    const live = laserLive(beam, state.time);
    const ph = laserPhase(beam, state.time);
    const alpha = live ? 0.85 : 0.18;
    ctx.strokeStyle = `rgba(255, 45, 70, ${alpha})`;
    ctx.lineWidth = live ? 3 : 1.5;
    ctx.setLineDash(live ? [] : [5, 6]);
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Emitter dots at both ends.
    ctx.fillStyle = `rgba(255, 45, 70, ${live ? 1 : 0.35})`;
    ctx.beginPath();
    ctx.arc(beam.x1, beam.y1, 4, 0, Math.PI * 2);
    ctx.arc(beam.x2, beam.y2, 4, 0, Math.PI * 2);
    ctx.fill();
    // A beam about to switch flickers.
    if (live && ph > 0.48 && ph < 0.55) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', (beam.x1 + beam.x2) / 2, (beam.y1 + beam.y2) / 2 - 8);
    }
  }
}

function drawSmoke(ctx, state) {
  for (const s of state.smoke) {
    if (state.time >= s.until) continue;
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.radius);
    g.addColorStop(0, 'rgba(200, 200, 210, 0.55)');
    g.addColorStop(1, 'rgba(200, 200, 210, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCone(ctx, x, y, dir, range, halfAngle, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawCameraCones(ctx, state) {
  for (const cam of state.level.cameras) {
    if (!cameraLive(cam, state)) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, cam.range, 0.5, 'rgba(255, 170, 40, 0.13)');
  }
}

function drawGuardCones(ctx, state) {
  for (const g of state.level.guards) {
    const color = g.state === 'alert'
      ? 'rgba(239, 68, 68, 0.20)'
      : g.state === 'suspicious'
        ? 'rgba(245, 185, 66, 0.17)'
        : 'rgba(245, 185, 66, 0.12)';
    drawCone(ctx, g.x, g.y, g.dir, GUARD.viewRange, GUARD.viewHalfAngle, color);
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.level.cameras) {
    const live = cameraLive(cam, state);
    ctx.fillStyle = live ? '#2b2f38' : '#3a3f4a';
    ctx.fillRect(cam.x - 8, cam.y - 6, 16, 12);
    // Lens points along the sweep angle.
    ctx.fillStyle = live ? '#ffaa28' : '#555';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 8, cam.y + Math.sin(cam.angle) * 8, 4, 0, Math.PI * 2);
    ctx.fill();
    if (!live) {
      ctx.fillStyle = '#9aa3b2';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP', cam.x, cam.y - 12);
    }
  }
}

function drawGuards(ctx, state) {
  for (const g of state.level.guards) {
    // Body: dark uniform with a cap brim pointing where they look.
    ctx.fillStyle = g.state === 'alert' ? '#7f1d1d' : '#374151';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.state === 'alert' ? '#ef4444' : '#9aa3b2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * 18, g.y + Math.sin(g.dir) * 18);
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 8, g.y + Math.sin(g.dir) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
    // State mark: ! when chasing, ? when suspicious.
    if (g.state === 'alert') {
      ctx.fillStyle = '#ff5b5b';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 20);
    } else if (g.state === 'suspicious') {
      ctx.fillStyle = '#ffd970';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 20);
    }
    // Catch grace: a shrinking ring warns the player before the grab.
    if (g.state === 'alert' && g.catchTimer > 0) {
      ctx.strokeStyle = '#ff5b5b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20 + 14 * (1 - g.catchTimer / 0.6), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  // Sneak = smaller, lower profile; a soft ring shows the noise radius.
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.sneaking ? 34 : 95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Mask stripe across the eyes, pointing where the thief looks.
  ctx.strokeStyle = '#e8c15a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.dir - 0.5) * 8, p.y + Math.sin(p.dir - 0.5) * 8);
  ctx.lineTo(p.x + Math.cos(p.dir + 0.5) * 8, p.y + Math.sin(p.dir + 0.5) * 8);
  ctx.stroke();
  ctx.fillStyle = '#e8c15a';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 14, p.y + Math.sin(p.dir) * 14, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Lockpick channel ring.
  if (p.channelDoor) {
    ctx.strokeStyle = '#ffd970';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, 20, -Math.PI / 2, -Math.PI / 2 + (p.channelTime / 2) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawCoin(ctx, state) {
  if (!state.coin || state.time >= state.coin.until) return;
  ctx.fillStyle = '#ffd970';
  ctx.beginPath();
  ctx.arc(state.coin.x, state.coin.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 112, 0.6)';
  ctx.beginPath();
  ctx.arc(state.coin.x, state.coin.y, 9 + 3 * Math.sin(state.time * 5), 0, Math.PI * 2);
  ctx.stroke();
}

function drawOverlays(ctx, state) {
  // Laser-trip flash: a red edge that fades.
  if (state.flash === 'laser' && state.time < state.flashUntil) {
    const a = clamp((state.flashUntil - state.time) * 2, 0, 0.5);
    ctx.strokeStyle = `rgba(239, 68, 68, ${a})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
  }
  // Vault cracking: the needle gauge, drawn big over the vault.
  if (state.player.cracking) {
    const v = state.level.vault;
    const gx = v.x - 100;
    const gy = v.y + 58;
    const gw = 180;
    const gh = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(gx - 8, gy - 26, gw + 16, 52);
    ctx.fillStyle = '#2a2f3a';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = '#3ecf6e';
    ctx.fillRect(gx + gw * 0.35, gy, gw * 0.3, gh);
    ctx.fillStyle = '#fff';
    ctx.fillRect(gx + (state.player.needle / 100) * gw - 2, gy - 4, 4, gh + 8);
    ctx.fillStyle = '#3ecf6e';
    ctx.fillRect(gx, gy + gh + 6, gw * state.vaultProgress, 4);
    ctx.fillStyle = '#fff';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING THE VAULT — needle in the green', gx + gw / 2, gy - 12);
  }
  // Objective reminder at the bottom centre, small and quiet. In shot
  // mode the HUD strip below carries the objective instead.
  if (state.mode === 'play' && state.time < state.messageUntil) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const msg = state.message;
    ctx.font = '600 14px system-ui, sans-serif';
    const w = ctx.measureText(msg).width + 24;
    ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 46, w, 26);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(msg, VIEW_W / 2, VIEW_H - 28);
  }
  // "SPOTTED" warning while any guard has full eyes on the thief.
  if (state.anyGuardSees && state.mode === 'play') {
    ctx.fillStyle = '#ff5b5b';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', VIEW_W / 2, 96);
  }
  // Shot mode: draw the HUD strip into the canvas itself, so a 1280x720
  // screenshot carries the alarm meter, loot, charges, timer and objective.
  if (state.mode === 'shot') drawShotHud(ctx, state);
}

// The in-canvas HUD strip for screenshots: alarm bar, loot, charges, time,
// objective — the same numbers the DOM HUD shows while playing.
function drawShotHud(ctx, state) {
  const y0 = VIEW_H - 34;
  ctx.fillStyle = 'rgba(10, 12, 17, 0.92)';
  ctx.fillRect(0, y0, VIEW_W, 34);
  ctx.fillStyle = '#262a35';
  ctx.fillRect(0, y0, VIEW_W, 1);
  ctx.textAlign = 'left';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = '#e8eaf0';
  ctx.fillText(`ALARM ${Math.round(state.alarm)}`, 14, y0 + 21);
  const barX = 92;
  const barW = 170;
  ctx.fillStyle = '#262a35';
  ctx.fillRect(barX, y0 + 10, barW, 13);
  ctx.fillStyle = state.alarm < 35 ? '#3ecf6e' : state.alarm < 70 ? '#f5b942' : '#ef4444';
  ctx.fillRect(barX, y0 + 10, barW * (state.alarm / 100), 13);
  ctx.fillStyle = '#e8eaf0';
  ctx.fillText(`LOOT $${state.loot} / $${state.lootTotal}`, 286, y0 + 21);
  ctx.fillText(`CHARGES ${state.charges} · 1 Lockpick  2 EMP  3 Smoke  4 Coin`, 480, y0 + 21);
  const mins = Math.floor(state.time / 60);
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  ctx.fillText(`TIME ${mins}:${secs}`, 830, y0 + 21);
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'right';
  ctx.fillText(state.objective, VIEW_W - 14, y0 + 21);
  ctx.textAlign = 'left';
}
