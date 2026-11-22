// Midnight Vault — wall cameras.
// One file, one job: cameras sweep their cones and feed the alarm when the
// thief crosses one live. They never chase; an EMP shuts them off.
import { CAMERA } from './config.js';
import { angleDiff, dist, inCone } from './random.js';
import { sightBlocked } from './level.js';
import { inSmoke } from './guards.js';

// Sweep the camera for dt seconds. A disabled camera holds still, dark.
export function updateCamera(cam, dt, state) {
  if (state.time < cam.disabledUntil) return;
  cam.angle += cam.sweepDir * CAMERA.sweepSpeed * dt;
  const off = angleDiff(cam.baseAngle, cam.angle);
  if (off > CAMERA.sweepArc) {
    cam.angle = cam.baseAngle + CAMERA.sweepArc;
    cam.sweepDir = -1;
  } else if (off < -CAMERA.sweepArc) {
    cam.angle = cam.baseAngle - CAMERA.sweepArc;
    cam.sweepDir = 1;
  }
}

export function cameraLive(cam, state) {
  return state.time >= cam.disabledUntil;
}

// Does this live camera have the player in its cone right now?
export function cameraSees(cam, player, state) {
  if (!cameraLive(cam, state)) return false;
  const d = dist(cam.x, cam.y, player.x, player.y);
  if (d > CAMERA.range) return false;
  const angle = Math.atan2(player.y - cam.y, player.x - cam.x);
  if (!inCone(cam.angle, angle, CAMERA.halfAngle)) return false;
  if (sightBlocked(cam.x, cam.y, player.x, player.y, state.level.walls, state.level.doors)) return false;
  if (inSmoke(player.x, player.y, state)) return false;
  return true;
}

// Feed every live camera's sighting into the alarm. Returns true when any
// camera sees the player this frame (the HUD flashes the alarm red).
export function updateCameras(dt, state) {
  let anySees = false;
  for (const cam of state.level.cameras) {
    updateCamera(cam, dt, state);
    if (cameraSees(cam, state.player, state)) {
      anySees = true;
      state.alarm = Math.min(100, state.alarm + CAMERA.alarmPerSec * dt);
    }
  }
  state.cameraSeesPlayer = anySees;
  return anySees;
}

export function disableAllCameras(state, seconds) {
  for (const cam of state.level.cameras) {
    cam.disabledUntil = state.time + seconds;
  }
}
