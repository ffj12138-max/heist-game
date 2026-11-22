// Midnight Vault — synthesized sound.
// One file, one job: every sound is a WebAudio oscillator, no audio files.
// Created lazily on the first user gesture so the browser allows it.
export function makeAudio() {
  const audio = {
    ctx: null,
    muted: false,
    ensure() {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AC();
        } catch {
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
      if (this.muted) return;
      const ctx = this.ensure();
      if (!ctx) return;
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    // A soft footstep tick, quieter while sneaking.
    step(sneaking) {
      this.tone(sneaking ? 130 : 175, 0.05, 'triangle', sneaking ? 0.02 : 0.035);
    },
    // Two-note pickup chime.
    pickup() {
      this.tone(660, 0.09, 'sine', 0.1);
      this.tone(990, 0.14, 'sine', 0.1, 0.08);
    },
    // The gem: a little arpeggio.
    gem() {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.11, i * 0.09));
    },
    // Guard spotted you: a sharp two-note sting.
    sting() {
      this.tone(220, 0.12, 'square', 0.09);
      this.tone(330, 0.2, 'square', 0.09, 0.1);
    },
    // Laser trip / camera alarm blip.
    alarmBlip() {
      this.tone(880, 0.1, 'square', 0.07);
      this.tone(880, 0.1, 'square', 0.07, 0.14);
    },
    // Lockdown: a low pulsing drone.
    lockdown() {
      this.tone(110, 0.5, 'sawtooth', 0.08, 0, 55);
      this.tone(110, 0.5, 'sawtooth', 0.08, 0.55, 55);
    },
    // Vault tick while the needle works.
    tick() {
      this.tone(1200, 0.03, 'square', 0.05);
    },
    // Lockpick success.
    unlock() {
      this.tone(392, 0.08, 'triangle', 0.1);
      this.tone(523, 0.12, 'triangle', 0.1, 0.07);
    },
    // EMP burst: a falling zap.
    emp() {
      this.tone(1400, 0.35, 'sawtooth', 0.08, 0, 120);
    },
    // Smoke: a soft whoosh (filtered noise would be nicer; a low swell
    // is close enough for a synth).
    smoke() {
      this.tone(300, 0.3, 'sine', 0.06, 0, 90);
    },
    // Coin clink.
    coin() {
      this.tone(1900, 0.06, 'triangle', 0.09);
      this.tone(1500, 0.08, 'triangle', 0.07, 0.09);
    },
    // Denied: no charge, no door in reach.
    deny() {
      this.tone(160, 0.12, 'square', 0.07);
    },
  };
  return audio;
}

// Win fanfare: three rising notes. M toggles mute from the main loop.
export function winJingle(audio) {
  [392, 523, 659, 784].forEach((f, i) => audio.tone(f, 0.22, 'triangle', 0.11, i * 0.12));
}

export function bustedJingle(audio) {
  [330, 262, 196].forEach((f, i) => audio.tone(f, 0.25, 'sawtooth', 0.07, i * 0.14));
}
