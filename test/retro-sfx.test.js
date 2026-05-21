import assert from "node:assert/strict";
import test from "node:test";
import { RetroSfx } from "../src/retro-sfx.js";

test("exposes the expected gameplay and menu effects", () => {
  assert.deepEqual(RetroSfx.effects, [
    "jump",
    "collect",
    "damage",
    "enemyHit",
    "bossHit",
    "levelClear",
    "gameOver",
    "menuConfirm",
  ]);
});

test("respects mute state without creating audio nodes", () => {
  const context = new FakeAudioContext();
  const sfx = new RetroSfx({ context, muted: true, autoUnlock: false });

  assert.equal(sfx.play("jump"), false);
  assert.equal(context.oscillators, 0);
});

test("plays every registered effect through the provided audio context", () => {
  const context = new FakeAudioContext();
  const sfx = new RetroSfx({ context, autoUnlock: false });

  for (const effect of RetroSfx.effects) {
    assert.equal(sfx.play(effect), true, effect);
  }

  assert.ok(context.oscillators > 0);
  assert.ok(context.buffers > 0);
});

test("supports confirm alias and rejects unknown effects", () => {
  const sfx = new RetroSfx({ context: new FakeAudioContext(), autoUnlock: false });

  assert.equal(sfx.play("confirm"), true);
  assert.throws(() => sfx.play("missing"), /Okänd ljudeffekt/);
});

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.state = "running";
    this.destination = new FakeNode();
    this.oscillators = 0;
    this.buffers = 0;
  }

  createGain() {
    return new FakeGain();
  }

  createOscillator() {
    this.oscillators += 1;
    return new FakeOscillator();
  }

  createBiquadFilter() {
    return new FakeFilter();
  }

  createBufferSource() {
    return new FakeBufferSource();
  }

  createBuffer(channels, length) {
    this.buffers += 1;
    return {
      getChannelData() {
        return new Float32Array(length);
      },
    };
  }

  async resume() {
    this.state = "running";
  }
}

class FakeNode {
  connect(node) {
    return node;
  }
}

class FakeGain extends FakeNode {
  constructor() {
    super();
    this.gain = new FakeParam();
  }
}

class FakeOscillator extends FakeNode {
  constructor() {
    super();
    this.frequency = new FakeParam();
  }

  start() {}

  stop() {}
}

class FakeFilter extends FakeNode {
  constructor() {
    super();
    this.frequency = new FakeParam();
    this.Q = { value: 0 };
  }
}

class FakeBufferSource extends FakeNode {
  start() {}

  stop() {}
}

class FakeParam {
  constructor() {
    this.value = 0;
  }

  setValueAtTime(value) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value) {
    this.value = value;
  }

  setTargetAtTime(value) {
    this.value = value;
  }
}
