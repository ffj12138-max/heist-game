// Midnight Vault — the laser grid.
// One file, one job: laser beams blink on a timer, and crossing a live
// beam trips the alarm. The pattern is the puzzle; timing is the answer.
import { LASER } from './config.js';
import { pointSegDist } from './random.js';

// Is this beam live at game time t? Live for the first 55% of its period.
export function laserLive(beam, t) {
  const phase = (t + beam.phase) % beam.period;
  return phase < beam.period * 0.55;
}

// How far through its current on/off cycle is this beam (0..1)? The
// renderer uses it to dim a beam that is about to switch.
export function laserPhase(beam, t) {
  return ((t + beam.phase) % beam.period) / beam.period;
}

// Check the player against every beam. A live beam crossed trips the alarm
// once, then waits out its cooldown before it can trip again.
export function updateLasers(dt, state) {
  const player = state.player;
  if (state.laserCooldown > 0) state.laserCooldown -= dt;
  for (const beam of state.level.lasers) {
    if (!laserLive(beam, state.time)) continue;
    const d = pointSegDist(player.x, player.y, beam.x1, beam.y1, beam.x2, beam.y2);
    if (d < 15) {
      if (state.laserCooldown <= 0) {
        state.alarm = Math.min(100, state.alarm + LASER.tripAlarm);
        state.laserCooldown = LASER.tripCooldownSec;
        state.flash = 'laser';
        state.flashUntil = state.time + 0.5;
        state.message = 'Laser tripped! The alarm spikes.';
        state.messageUntil = state.time + 2;
        state.audio.alarmBlip();
      }
      break;
    }
  }
}

// How many beams are live right now — the HUD shows the count while the
// thief is in the laser hall, so the timing reads at a glance.
export function liveLaserCount(state) {
  let n = 0;
  for (const beam of state.level.lasers) {
    if (laserLive(beam, state.time)) n++;
  }
  return n;
}
