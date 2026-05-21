const DEFAULT_EFFECTS = Object.freeze([
  "jump",
  "collect",
  "damage",
  "enemyHit",
  "bossHit",
  "levelClear",
  "gameOver",
  "menuConfirm",
]);

const AudioContextCtor = () =>
  globalThis.AudioContext || globalThis.webkitAudioContext || null;

export class RetroSfx {
  constructor(options = {}) {
    const {
      context = null,
      muted = false,
      volume = 0.7,
      autoUnlock = true,
    } = options;

    this.context = context;
    this.muted = muted;
    this.volume = clamp(volume, 0, 1);
    this.master = null;
    this.unlockCleanup = null;

    if (this.context) {
      this.master = this.createMasterGain();
    }

    if (autoUnlock && typeof window !== "undefined") {
      this.attachUnlockListeners();
    }
  }

  static get effects() {
    return DEFAULT_EFFECTS.slice();
  }

  get effects() {
    return RetroSfx.effects;
  }

  isReady() {
    return Boolean(this.context && this.context.state === "running");
  }

  async unlock() {
    this.ensureContext();

    if (!this.context) {
      return false;
    }

    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch {
        return false;
      }
    }

    return this.context.state === "running";
  }

  attachUnlockListeners(target = globalThis.window) {
    if (!target || this.unlockCleanup) {
      return this.unlockCleanup;
    }

    const unlock = () => {
      void this.unlock();
      this.detachUnlockListeners();
    };

    const options = { once: true, passive: true };
    target.addEventListener("pointerdown", unlock, options);
    target.addEventListener("keydown", unlock, { once: true });
    target.addEventListener("touchstart", unlock, options);

    this.unlockCleanup = () => {
      target.removeEventListener("pointerdown", unlock);
      target.removeEventListener("keydown", unlock);
      target.removeEventListener("touchstart", unlock);
      this.unlockCleanup = null;
    };

    return this.unlockCleanup;
  }

  detachUnlockListeners() {
    if (this.unlockCleanup) {
      this.unlockCleanup();
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.syncMasterGain();
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  setVolume(volume) {
    this.volume = clamp(volume, 0, 1);
    this.syncMasterGain();
    return this.volume;
  }

  play(effectName, options = {}) {
    if (this.muted) {
      return false;
    }

    const effect = effectName === "confirm" ? "menuConfirm" : effectName;
    this.ensureContext();

    if (!this.context || !this.master) {
      return false;
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
      return false;
    }

    const gain = clamp(options.gain ?? 1, 0, 2);
    const pitch = clamp(options.pitch ?? 1, 0.25, 3);
    const now = this.context.currentTime + 0.002;

    switch (effect) {
      case "jump":
        this.playJump(now, gain, pitch);
        return true;
      case "collect":
        this.playCollect(now, gain, pitch);
        return true;
      case "damage":
        this.playDamage(now, gain, pitch);
        return true;
      case "enemyHit":
        this.playEnemyHit(now, gain, pitch);
        return true;
      case "bossHit":
        this.playBossHit(now, gain, pitch);
        return true;
      case "levelClear":
        this.playLevelClear(now, gain, pitch);
        return true;
      case "gameOver":
        this.playGameOver(now, gain, pitch);
        return true;
      case "menuConfirm":
        this.playMenuConfirm(now, gain, pitch);
        return true;
      default:
        throw new RangeError(`Okänd ljudeffekt: ${effectName}`);
    }
  }

  ensureContext() {
    if (this.context) {
      return;
    }

    const AudioContextClass = AudioContextCtor();
    if (!AudioContextClass) {
      return;
    }

    this.context = new AudioContextClass();
    this.master = this.createMasterGain();
  }

  createMasterGain() {
    const gain = this.context.createGain();
    gain.connect(this.context.destination);
    gain.gain.value = this.muted ? 0 : this.volume;
    return gain;
  }

  syncMasterGain() {
    if (!this.master || !this.context) {
      return;
    }

    const value = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.01);
  }

  playJump(start, gain, pitch) {
    this.tone({
      start,
      duration: 0.19,
      type: "square",
      gain: 0.18 * gain,
      frequency: [220 * pitch, 740 * pitch],
      attack: 0.006,
      release: 0.055,
    });
    this.tone({
      start: start + 0.018,
      duration: 0.13,
      type: "triangle",
      gain: 0.1 * gain,
      frequency: [330 * pitch, 910 * pitch],
      release: 0.04,
    });
  }

  playCollect(start, gain, pitch) {
    [0, 0.055, 0.11].forEach((offset, index) => {
      this.tone({
        start: start + offset,
        duration: 0.075,
        type: index === 2 ? "triangle" : "square",
        gain: 0.13 * gain,
        frequency: 660 * pitch * [1, 1.25, 1.75][index],
        attack: 0.003,
        release: 0.025,
      });
    });
  }

  playDamage(start, gain, pitch) {
    this.noise({
      start,
      duration: 0.2,
      gain: 0.22 * gain,
      filterFrequency: 950 * pitch,
      filterType: "bandpass",
      release: 0.08,
    });
    this.tone({
      start,
      duration: 0.24,
      type: "sawtooth",
      gain: 0.16 * gain,
      frequency: [520 * pitch, 95 * pitch],
      attack: 0.001,
      release: 0.08,
    });
  }

  playEnemyHit(start, gain, pitch) {
    this.noise({
      start,
      duration: 0.085,
      gain: 0.16 * gain,
      filterFrequency: 1500 * pitch,
      filterType: "highpass",
      release: 0.025,
    });
    this.tone({
      start,
      duration: 0.11,
      type: "square",
      gain: 0.13 * gain,
      frequency: [260 * pitch, 120 * pitch],
      attack: 0.002,
      release: 0.04,
    });
  }

  playBossHit(start, gain, pitch) {
    this.noise({
      start,
      duration: 0.28,
      gain: 0.2 * gain,
      filterFrequency: 600 * pitch,
      filterType: "lowpass",
      release: 0.11,
    });
    this.tone({
      start,
      duration: 0.3,
      type: "sawtooth",
      gain: 0.18 * gain,
      frequency: [150 * pitch, 60 * pitch],
      attack: 0.004,
      release: 0.13,
    });
    this.tone({
      start: start + 0.04,
      duration: 0.16,
      type: "square",
      gain: 0.08 * gain,
      frequency: [95 * pitch, 47 * pitch],
      release: 0.08,
    });
  }

  playLevelClear(start, gain, pitch) {
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1174.66, 1318.51];
    notes.forEach((note, index) => {
      this.tone({
        start: start + index * 0.085,
        duration: index === notes.length - 1 ? 0.28 : 0.105,
        type: "triangle",
        gain: 0.12 * gain,
        frequency: note * pitch,
        attack: 0.005,
        release: 0.04,
      });
    });
  }

  playGameOver(start, gain, pitch) {
    const notes = [392, 349.23, 311.13, 261.63, 196];
    notes.forEach((note, index) => {
      this.tone({
        start: start + index * 0.16,
        duration: index === notes.length - 1 ? 0.42 : 0.18,
        type: "triangle",
        gain: 0.14 * gain,
        frequency: note * pitch,
        attack: 0.012,
        release: 0.08,
      });
    });
    this.noise({
      start: start + 0.63,
      duration: 0.22,
      gain: 0.07 * gain,
      filterFrequency: 360 * pitch,
      filterType: "lowpass",
      release: 0.14,
    });
  }

  playMenuConfirm(start, gain, pitch) {
    this.tone({
      start,
      duration: 0.055,
      type: "square",
      gain: 0.09 * gain,
      frequency: 880 * pitch,
      attack: 0.002,
      release: 0.018,
    });
    this.tone({
      start: start + 0.038,
      duration: 0.055,
      type: "triangle",
      gain: 0.08 * gain,
      frequency: 1174.66 * pitch,
      attack: 0.002,
      release: 0.02,
    });
  }

  tone({ start, duration, type, gain, frequency, attack = 0.004, release = 0.04 }) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const stop = start + duration;
    const sustainAt = Math.max(start + attack, stop - release);

    oscillator.type = type;

    if (Array.isArray(frequency)) {
      oscillator.frequency.setValueAtTime(frequency[0], start);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, frequency[1]),
        stop,
      );
    } else {
      oscillator.frequency.setValueAtTime(frequency, start);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + attack);
    envelope.gain.setValueAtTime(Math.max(0.0001, gain), sustainAt);
    envelope.gain.exponentialRampToValueAtTime(0.0001, stop);

    oscillator.connect(envelope).connect(this.master);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
  }

  noise({
    start,
    duration,
    gain,
    filterFrequency,
    filterType = "bandpass",
    attack = 0.002,
    release = 0.04,
  }) {
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    let value = 0;
    for (let i = 0; i < data.length; i += 1) {
      value = value * 0.62 + (Math.random() * 2 - 1) * 0.38;
      data[i] = value;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const stop = start + duration;
    const sustainAt = Math.max(start + attack, stop - release);

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, start);
    filter.Q.value = 1.6;

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + attack);
    envelope.gain.setValueAtTime(Math.max(0.0001, gain), sustainAt);
    envelope.gain.exponentialRampToValueAtTime(0.0001, stop);

    source.connect(filter).connect(envelope).connect(this.master);
    source.start(start);
    source.stop(stop + 0.02);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

export function createRetroSfx(options) {
  return new RetroSfx(options);
}

export default RetroSfx;
