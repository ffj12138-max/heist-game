// Midnight Vault — the alarm meter.
// One file, one job: the shared tension meter, its decay, and lockdown —
// the state where the building turns against the thief.
import { ALARM } from './config.js';

// Decay the alarm when nobody is watching, and trip lockdown at 100.
// Guards, cameras and lasers add to the alarm where they see you.
export function updateAlarm(dt, state) {
  if (state.mode !== 'play') return;
  // Trip lockdown FIRST: decaying the alarm first would pull a 100 back
  // under the line in the same frame and the lockdown would never fire.
  if (state.alarm >= ALARM.lockdownAt && state.lockdownUntil <= state.time) {
    state.lockdownUntil = state.time + ALARM.lockdownSec;
    state.message = 'LOCKDOWN! Guards converge — the exit is sealed!';
    state.messageUntil = state.time + 3;
    state.audio.lockdown();
    // Every guard converges on the thief's position.
    for (const g of state.level.guards) {
      g.state = 'alert';
      g.suspicion = 100;
      g.catchTimer = 0;
      g.loseTimer = 0;
    }
  }
  const seen = state.cameraSeesPlayer || state.anyGuardSees;
  if (!seen && state.alarm > 0 && state.lockdownUntil <= state.time) {
    state.alarm = Math.max(0, state.alarm - ALARM.decayPerSec * dt);
  }
  // Lockdown bleeds the alarm back down so the game can recover.
  if (state.lockdownUntil > state.time) {
    state.alarm = Math.max(88, state.alarm - 4 * dt);
  }
}

export function inLockdown(state) {
  return state.lockdownUntil > state.time;
}

export function lockdownRemaining(state) {
  return Math.max(0, state.lockdownUntil - state.time);
}

// The exit is sealed during lockdown: the van cannot leave.
export function exitOpen(state) {
  return !inLockdown(state);
}

// Alarm colour for the HUD bar: calm blue-green, warming amber, then red.
export function alarmColor(alarm) {
  if (alarm < 35) return '#3ecf6e';
  if (alarm < 70) return '#f5b942';
  return '#ef4444';
}

// Alarm label for the HUD: what the meter means right now.
export function alarmLabel(state) {
  if (inLockdown(state)) return `LOCKDOWN ${lockdownRemaining(state).toFixed(0)}s`;
  if (state.alarm >= 70) return 'HOT — they know something is wrong';
  if (state.alarm >= 35) return 'WARM — someone is suspicious';
  return 'COLD — unseen';
}
