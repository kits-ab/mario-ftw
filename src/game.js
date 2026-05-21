"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  levelName: document.querySelector("#levelName"),
  score: document.querySelector("#score"),
  hearts: document.querySelector("#hearts"),
  bossHud: document.querySelector("#bossHud"),
  bossHearts: document.querySelector("#bossHearts"),
  message: document.querySelector("#message"),
  startButton: document.querySelector("#startButton"),
  musicButton: document.querySelector("#musicButton")
};

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
const GRAVITY = 760;
const BASE_JUMP_SPEED = 276;
const RUN_JUMP_BONUS = 34;
const RUN_JUMP_MIN_SPEED = 42;
const RUN_JUMP_FULL_SPEED = 110;
const keys = new Set();
const pressed = new Set();

const state = {
  mode: "title",
  levelIndex: 0,
  score: 0,
  cameraX: 0,
  messageTitle: "Cinder Run: Sky Relay",
  messageBody: "Dash the ember road, gather prism sparks, and relight three towers before the sky grid fades.",
  messageButton: "Begin Relay",
  lastTime: 0
};

const music = (() => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const noteOffsets = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11
  };
  const sections = [
    {
      bass: ["C2", "C2", "G1", "A#1", "F2", "F2", "G2", "G1"],
      arp: ["C4", "E4", "G4", "A#4", "F4", "A4", "C5", "D5"],
      lead: [
        "E5", null, "G5", null, "A#5", "G5", null, "E5",
        "D5", null, "C5", null, "D5", "E5", null, null,
        "G5", null, "A#5", null, "C6", "A#5", "G5", null,
        "F5", null, "D5", null, "E5", null, null, null
      ]
    },
    {
      bass: ["D2", "D2", "A1", "C2", "G1", "G1", "A1", "C2"],
      arp: ["D4", "F4", "A4", "C5", "G4", "A#4", "D5", "F5"],
      lead: [
        "F5", null, "A5", null, "C6", "A5", null, "F5",
        "E5", null, "D5", "E5", "F5", null, null, null,
        "A5", null, "C6", null, "D6", "C6", "A5", null,
        "G5", null, "E5", null, "F5", null, null, null
      ]
    },
    {
      bass: ["F2", "F2", "C2", "D#2", "A#1", "A#1", "C2", "D#2"],
      arp: ["F4", "G#4", "C5", "D#5", "A#4", "D5", "F5", "G5"],
      lead: [
        "G#5", null, "C6", null, "D#6", "C6", "G#5", null,
        "G5", null, "F5", "G5", "G#5", null, null, null,
        "C6", null, "D#6", null, "F6", "D#6", "C6", null,
        "A#5", null, "G5", null, "G#5", null, null, null
      ]
    }
  ];

  let audioCtx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let active = false;
  let muted = false;
  let sectionIndex = 0;
  let step = 0;
  let nextStepTime = 0;

  function updateButton() {
    ui.musicButton.textContent = muted ? "Restore" : "Silence";
    ui.musicButton.setAttribute("aria-pressed", String(muted));
  }

  function noteToHz(note) {
    const match = /^([A-G]#?)(-?\d)$/.exec(note);
    if (!match) return 0;
    const semitone = noteOffsets[match[1]] + (Number(match[2]) + 1) * 12;
    return 440 * 2 ** ((semitone - 69) / 12);
  }

  function makeNoiseBuffer(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function ensureContext() {
    if (!AudioContextCtor) {
      ui.musicButton.textContent = "No Tune";
      ui.musicButton.disabled = true;
      return null;
    }
    if (audioCtx) return audioCtx;
    audioCtx = new AudioContextCtor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.18;
    masterGain.connect(audioCtx.destination);
    noiseBuffer = makeNoiseBuffer(audioCtx);
    return audioCtx;
  }

  function playTone(note, time, duration, volume, type = "square", detune = 0) {
    if (!note || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = noteToHz(note);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  function playNoise(time, duration, volume, frequency) {
    if (!noiseBuffer || !audioCtx) return;
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  function scheduleStep(currentStep, time) {
    const section = sections[sectionIndex % sections.length];
    const sixteenth = 60 / 138 / 4;
    const leadNote = section.lead[currentStep % section.lead.length];

    if (currentStep % 4 === 0) {
      playTone(section.bass[Math.floor(currentStep / 4) % section.bass.length], time, sixteenth * 3.2, 0.18, "square", -9);
    }
    if (currentStep % 2 === 1) {
      playTone(section.arp[Math.floor(currentStep / 2) % section.arp.length], time, sixteenth * 0.65, 0.045, "square", 4);
    }
    if (leadNote) {
      playTone(leadNote, time, sixteenth * (currentStep % 8 === 4 ? 2.4 : 1.35), 0.105, "square");
      playTone(leadNote, time + 0.012, sixteenth, 0.035, "square", -12);
    }
    if (currentStep % 8 === 0) {
      playTone("C2", time, sixteenth * 1.7, 0.2, "triangle", -18);
    }
    if (currentStep % 8 === 4) {
      playNoise(time, sixteenth * 1.1, 0.12, 1300);
    }
    if (currentStep % 2 === 0) {
      playNoise(time, sixteenth * 0.28, 0.035, 5200);
    }
  }

  function scheduler() {
    if (!audioCtx || !active) return;
    while (nextStepTime < audioCtx.currentTime + 0.12) {
      scheduleStep(step, nextStepTime);
      nextStepTime += 60 / 138 / 4;
      step = (step + 1) % 32;
    }
  }

  async function start() {
    const ctx = ensureContext();
    if (!ctx) return;
    await ctx.resume();
    if (!active) {
      active = true;
      nextStepTime = ctx.currentTime + 0.05;
      window.setInterval(scheduler, 25);
    }
  }

  function setMuted(nextMuted) {
    muted = nextMuted;
    updateButton();
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.18, audioCtx.currentTime, 0.025);
    }
  }

  function toggleMuted() {
    setMuted(!muted);
  }

  function setLevel(index) {
    if (sectionIndex === index) return;
    sectionIndex = index;
    step = 0;
    if (audioCtx) nextStepTime = audioCtx.currentTime + 0.05;
  }

  updateButton();
  return { setLevel, start, toggleMuted };
})();

const endingStars = Array.from({ length: 56 }, (_, index) => ({
  x: (index * 53) % VIEW_W,
  y: (index * 31) % VIEW_H,
  size: 1 + (index % 3),
  speed: 9 + (index % 5) * 5
}));

const player = {
  x: 26,
  y: 120,
  w: 12,
  h: 16,
  vx: 0,
  vy: 0,
  dir: 1,
  hp: 3,
  inv: 0,
  grounded: false,
  coyote: 0,
  jumpBuffer: 0
};

const levels = [
  {
    name: "1-1 Ember Gate",
    width: 1500,
    sky: ["#7bd8ff", "#f6d26b"],
    ground: ["#69452d", "#a76539", "#f0bd50"],
    accent: "#71e17c",
    spawn: { x: 28, y: 126 },
    goal: { x: 1426, y: 98 },
    platforms: [
      { x: 0, y: 184, w: 260, h: 32 },
      { x: 306, y: 184, w: 216, h: 32 },
      { x: 574, y: 184, w: 278, h: 32 },
      { x: 912, y: 184, w: 248, h: 32 },
      { x: 1210, y: 184, w: 290, h: 32 },
      { x: 180, y: 144, w: 54, h: 12 },
      { x: 390, y: 132, w: 64, h: 12 },
      { x: 658, y: 142, w: 66, h: 12 },
      { x: 810, y: 118, w: 58, h: 12 },
      { x: 1030, y: 136, w: 70, h: 12 },
      { x: 1284, y: 128, w: 76, h: 12 }
    ],
    hazards: [
      { x: 268, y: 198, w: 34, h: 18 },
      { x: 532, y: 198, w: 34, h: 18 },
      { x: 866, y: 198, w: 38, h: 18 },
      { x: 1168, y: 198, w: 36, h: 18 }
    ],
    enemies: [
      { x: 220, y: 168, min: 90, max: 246, speed: 26, type: "roller" },
      { x: 690, y: 126, min: 606, max: 790, speed: 34, type: "roller" },
      { x: 1050, y: 120, min: 930, max: 1136, speed: 38, type: "flutter" }
    ],
    pickups: [
      { x: 186, y: 124 }, { x: 406, y: 112 }, { x: 674, y: 122 },
      { x: 828, y: 98 }, { x: 1048, y: 116 }, { x: 1308, y: 108 }
    ]
  },
  {
    name: "2-2 Moon Mill",
    width: 1700,
    sky: ["#23366f", "#7b5bbd"],
    ground: ["#343044", "#5b5570", "#9bc9ff"],
    accent: "#ffd56c",
    spawn: { x: 28, y: 112 },
    goal: { x: 1622, y: 78 },
    platforms: [
      { x: 0, y: 184, w: 200, h: 32 },
      { x: 262, y: 164, w: 112, h: 14 },
      { x: 430, y: 145, w: 110, h: 14 },
      { x: 600, y: 184, w: 170, h: 32 },
      { x: 840, y: 156, w: 92, h: 14 },
      { x: 1004, y: 132, w: 112, h: 14 },
      { x: 1180, y: 184, w: 160, h: 32 },
      { x: 1384, y: 150, w: 96, h: 14 },
      { x: 1540, y: 116, w: 160, h: 14 },
      { x: 632, y: 120, w: 50, h: 12 },
      { x: 1218, y: 136, w: 58, h: 12 }
    ],
    hazards: [
      { x: 206, y: 198, w: 50, h: 18 },
      { x: 376, y: 198, w: 48, h: 18 },
      { x: 774, y: 198, w: 58, h: 18 },
      { x: 1122, y: 198, w: 52, h: 18 },
      { x: 1346, y: 198, w: 34, h: 18 }
    ],
    enemies: [
      { x: 318, y: 148, min: 268, max: 362, speed: 32, type: "roller" },
      { x: 660, y: 102, min: 610, max: 752, speed: 42, type: "flutter" },
      { x: 1040, y: 114, min: 1008, max: 1100, speed: 46, type: "roller" },
      { x: 1430, y: 132, min: 1388, max: 1470, speed: 36, type: "roller" }
    ],
    pickups: [
      { x: 286, y: 142 }, { x: 454, y: 124 }, { x: 646, y: 98 },
      { x: 864, y: 132 }, { x: 1030, y: 110 }, { x: 1228, y: 114 },
      { x: 1410, y: 128 }, { x: 1580, y: 94 }
    ]
  },
  {
    name: "3-3 Prism Spire",
    width: 1900,
    sky: ["#483071", "#f07593"],
    ground: ["#3e3148", "#76506b", "#69f0ca"],
    accent: "#77ffdb",
    spawn: { x: 28, y: 132 },
    goal: { x: 1824, y: 86 },
    platforms: [
      { x: 0, y: 184, w: 230, h: 32 },
      { x: 286, y: 168, w: 120, h: 14 },
      { x: 470, y: 146, w: 112, h: 14 },
      { x: 642, y: 124, w: 116, h: 14 },
      { x: 830, y: 184, w: 210, h: 32 },
      { x: 1080, y: 150, w: 120, h: 14 },
      { x: 1260, y: 128, w: 120, h: 14 },
      { x: 1450, y: 184, w: 450, h: 32 },
      { x: 1600, y: 142, w: 88, h: 12 }
    ],
    hazards: [
      { x: 236, y: 198, w: 46, h: 18 },
      { x: 412, y: 198, w: 52, h: 18 },
      { x: 768, y: 198, w: 56, h: 18 },
      { x: 1210, y: 198, w: 42, h: 18 },
      { x: 1390, y: 198, w: 54, h: 18 }
    ],
    enemies: [
      { x: 335, y: 150, min: 292, max: 392, speed: 38, type: "roller" },
      { x: 690, y: 102, min: 648, max: 750, speed: 48, type: "flutter" },
      { x: 1124, y: 132, min: 1086, max: 1188, speed: 38, type: "roller" }
    ],
    pickups: [
      { x: 310, y: 148 }, { x: 494, y: 126 }, { x: 672, y: 104 },
      { x: 860, y: 164 }, { x: 1110, y: 128 }, { x: 1300, y: 106 },
      { x: 1618, y: 122 }
    ],
    boss: {
      name: "Glassheart Warden",
      x: 1732,
      y: 144,
      w: 30,
      h: 38,
      min: 1548,
      max: 1818,
      hp: 5
    }
  }
];

let level = null;
let enemies = [];
let pickups = [];
let boss = null;
let sparks = [];

function cloneLevelObjects(source) {
  enemies = source.enemies.map((enemy) => ({ ...enemy, w: 14, h: 12, vx: enemy.speed, alive: true, phase: 0 }));
  pickups = source.pickups.map((pickup) => ({ ...pickup, w: 8, h: 8, taken: false, bob: Math.random() * Math.PI * 2 }));
  boss = source.boss ? { ...source.boss, vx: -32, alive: true, cooldown: 1.1, hurt: 0 } : null;
  sparks = [];
}

function resetPlayer(spawn) {
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.hp = 3;
  player.inv = 0;
  player.dir = 1;
  player.grounded = false;
  player.coyote = 0;
  player.jumpBuffer = 0;
}

function loadLevel(index) {
  state.levelIndex = index;
  level = levels[index];
  music.setLevel(index);
  cloneLevelObjects(level);
  resetPlayer(level.spawn);
  state.cameraX = 0;
  state.mode = "playing";
  hideMessage();
  updateHud();
}

function startGame() {
  state.score = 0;
  loadLevel(0);
}

function showMessage(title, body, button) {
  state.messageTitle = title;
  state.messageBody = body;
  state.messageButton = button;
  ui.message.querySelector("h1").textContent = title;
  ui.message.querySelector("p").textContent = body;
  ui.startButton.textContent = button;
  ui.message.hidden = false;
}

function hideMessage() {
  ui.message.hidden = true;
}

function showTitle() {
  state.mode = "title";
  state.cameraX = 0;
  level = levels[0];
  cloneLevelObjects(level);
  resetPlayer(level.spawn);
  updateHud();
  showMessage(
    "Cinder Run: Sky Relay",
    "Dash the ember road, gather prism sparks, and relight three towers before the sky grid fades.",
    "Begin Relay"
  );
}

function completeRun() {
  state.mode = "ending";
  state.cameraX = 0;
  ui.bossHud.hidden = true;
  showMessage(
    "Sky Relay Lit",
    `All three towers burn bright. Final score: ${state.score} prism sparks. Credits: design, code, audio, and pixel craft by the relay crew.`,
    "New Run"
  );
}

function updateHud() {
  ui.levelName.textContent = level ? level.name : "1-1 Ember Gate";
  ui.score.textContent = String(state.score);
  ui.hearts.textContent = "♥".repeat(Math.max(0, player.hp)) || "0";
  if (boss && boss.alive) {
    ui.bossHud.hidden = false;
    ui.bossHearts.textContent = "◆".repeat(boss.hp);
  } else {
    ui.bossHud.hidden = true;
  }
}

function rectsTouch(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moveAndCollide(entity, dt) {
  entity.x += entity.vx * dt;
  for (const block of level.platforms) {
    if (!rectsTouch(entity, block)) continue;
    if (entity.vx > 0) entity.x = block.x - entity.w;
    if (entity.vx < 0) entity.x = block.x + block.w;
    entity.vx = 0;
  }

  entity.y += entity.vy * dt;
  entity.grounded = false;
  for (const block of level.platforms) {
    if (!rectsTouch(entity, block)) continue;
    if (entity.vy > 0) {
      entity.y = block.y - entity.h;
      entity.vy = 0;
      entity.grounded = true;
      entity.coyote = 0.09;
    } else if (entity.vy < 0) {
      entity.y = block.y + block.h;
      entity.vy = 0;
    }
  }
}

function damagePlayer(amount = 1) {
  if (player.inv > 0 || state.mode !== "playing") return;
  player.hp -= amount;
  player.inv = 1.25;
  player.vx = -player.dir * 115;
  player.vy = -230;
  updateHud();
  if (player.hp <= 0) {
    state.mode = "lost";
    showMessage("Spark Out", "The route went dark. Retry the stage and keep the relay burning.", "Retry Stage");
  }
}

function makeSpark(x, y, color) {
  for (let i = 0; i < 7; i += 1) {
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 120,
      vy: -Math.random() * 90,
      life: 0.35 + Math.random() * 0.25,
      color
    });
  }
}

function getJumpSpeed() {
  const runSpeed = Math.abs(player.vx);
  if (runSpeed <= RUN_JUMP_MIN_SPEED) return BASE_JUMP_SPEED;

  const runRatio = Math.min(1, (runSpeed - RUN_JUMP_MIN_SPEED) / (RUN_JUMP_FULL_SPEED - RUN_JUMP_MIN_SPEED));
  return BASE_JUMP_SPEED + RUN_JUMP_BONUS * runRatio;
}

function updatePlayer(dt) {
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const jumpDown = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space");
  const jumpPressed = pressed.has("ArrowUp") || pressed.has("KeyW") || pressed.has("Space");

  const accel = player.grounded ? 680 : 430;
  const drag = player.grounded ? 0.78 : 0.94;
  const maxSpeed = 118;

  if (left) {
    player.vx -= accel * dt;
    player.dir = -1;
  }
  if (right) {
    player.vx += accel * dt;
    player.dir = 1;
  }
  if (!left && !right) player.vx *= drag;
  player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));

  if (jumpPressed) player.jumpBuffer = 0.12;
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = Math.max(0, player.coyote - dt);

  if (player.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) {
    player.vy = -getJumpSpeed();
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    makeSpark(player.x + player.w / 2, player.y + player.h, "#f8f3d2");
  }

  if (!jumpDown && player.vy < -80) player.vy += 520 * dt;

  player.vy += GRAVITY * dt;
  moveAndCollide(player, dt);
  player.x = Math.max(0, Math.min(level.width - player.w, player.x));
  player.inv = Math.max(0, player.inv - dt);

  if (player.y > VIEW_H + 60) damagePlayer(3);
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.phase += dt;
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.min || enemy.x > enemy.max) {
      enemy.x = Math.max(enemy.min, Math.min(enemy.max, enemy.x));
      enemy.vx *= -1;
    }
    if (enemy.type === "flutter") {
      enemy.y += Math.sin(enemy.phase * 5) * 0.34;
    }

    if (!rectsTouch(player, enemy)) continue;
    const landing = player.vy > 40 && player.y + player.h - enemy.y < 9;
    if (landing) {
      enemy.alive = false;
      player.vy = -210;
      state.score += 25;
      makeSpark(enemy.x + enemy.w / 2, enemy.y + 4, "#7cff9b");
      updateHud();
    } else {
      damagePlayer();
    }
  }
}

function updateBoss(dt) {
  if (!boss || !boss.alive) return;
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.x += boss.vx * dt;
  if (boss.x < boss.min || boss.x > boss.max) {
    boss.x = Math.max(boss.min, Math.min(boss.max, boss.x));
    boss.vx *= -1;
  }
  boss.cooldown -= dt;
  if (boss.cooldown <= 0) {
    boss.cooldown = 1.35;
    sparks.push({
      x: boss.x + boss.w / 2,
      y: boss.y + 22,
      vx: player.x < boss.x ? -95 : 95,
      vy: -18,
      life: 2.3,
      color: "#ff6262",
      hostile: true,
      w: 6,
      h: 6
    });
  }

  if (!rectsTouch(player, boss)) return;
  const stomp = player.vy > 50 && player.y + player.h - boss.y < 12;
  if (stomp && boss.hurt <= 0) {
    boss.hp -= 1;
    boss.hurt = 0.35;
    player.vy = -250;
    state.score += 50;
    makeSpark(boss.x + boss.w / 2, boss.y + 8, "#f8f3d2");
    if (boss.hp <= 0) {
      boss.alive = false;
      state.score += 250;
      makeSpark(boss.x + boss.w / 2, boss.y + 18, "#7cffdb");
      completeRun();
    }
    updateHud();
  } else {
    damagePlayer();
  }
}

function updatePickups() {
  for (const pickup of pickups) {
    if (pickup.taken || !rectsTouch(player, pickup)) continue;
    pickup.taken = true;
    state.score += 10;
    makeSpark(pickup.x + 4, pickup.y + 4, "#62d6ff");
    updateHud();
  }
}

function updateHazards() {
  for (const hazard of level.hazards) {
    if (rectsTouch(player, hazard)) damagePlayer();
  }
}

function updateSparks(dt) {
  for (const spark of sparks) {
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vy += 220 * dt;
    if (spark.hostile) {
      const orb = { x: spark.x, y: spark.y, w: spark.w, h: spark.h };
      if (rectsTouch(player, orb)) {
        spark.life = 0;
        damagePlayer();
      }
    }
  }
  sparks = sparks.filter((spark) => spark.life > 0);
}

function updateGoal() {
  const goal = { x: level.goal.x, y: level.goal.y, w: 18, h: 86 };
  if (!rectsTouch(player, goal)) return;
  if (boss && boss.alive) {
    showToast("Shatter the warden core first.");
    return;
  }
  if (state.levelIndex < levels.length - 1) {
    loadLevel(state.levelIndex + 1);
  } else {
    completeRun();
  }
}

let toastTimer = 0;
let toastText = "";
function showToast(text) {
  toastText = text;
  toastTimer = 1.2;
}

function update(dt) {
  if (state.mode === "ending") {
    for (const star of endingStars) {
      star.y += star.speed * dt;
      if (star.y > VIEW_H) star.y = -star.size;
    }
    return;
  }
  if (state.mode !== "playing") return;
  updatePlayer(dt);
  updateEnemies(dt);
  updateBoss(dt);
  if (state.mode !== "playing") return;
  updatePickups();
  updateHazards();
  updateSparks(dt);
  updateGoal();
  state.cameraX = Math.max(0, Math.min(level.width - VIEW_W, player.x - VIEW_W * 0.42));
  toastTimer = Math.max(0, toastTimer - dt);
  pressed.clear();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  gradient.addColorStop(0, level.sky[0]);
  gradient.addColorStop(1, level.sky[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const parallax = state.cameraX * 0.18;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  for (let i = 0; i < 9; i += 1) {
    const x = (i * 96 - parallax) % (VIEW_W + 96) - 44;
    const y = 28 + (i % 3) * 20;
    ctx.fillRect(x, y, 24, 6);
    ctx.fillRect(x + 8, y - 5, 28, 8);
    ctx.fillRect(x + 30, y + 2, 18, 5);
  }

  ctx.fillStyle = "rgba(38, 43, 76, 0.42)";
  const hillOffset = state.cameraX * 0.32;
  for (let i = 0; i < 8; i += 1) {
    const x = i * 128 - (hillOffset % 128) - 40;
    ctx.beginPath();
    ctx.moveTo(x, 184);
    ctx.lineTo(x + 72, 92 + (i % 2) * 18);
    ctx.lineTo(x + 148, 184);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlatform(block) {
  const x = Math.floor(block.x - state.cameraX);
  const y = Math.floor(block.y);
  ctx.fillStyle = level.ground[0];
  ctx.fillRect(x, y, block.w, block.h);
  ctx.fillStyle = level.ground[1];
  ctx.fillRect(x, y, block.w, 6);
  ctx.fillStyle = level.ground[2];
  for (let tx = 0; tx < block.w; tx += 16) {
    ctx.fillRect(x + tx + 2, y + 1, 9, 3);
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let tx = 0; tx < block.w; tx += 16) {
    ctx.fillRect(x + tx, y + 14, 1, Math.max(0, block.h - 14));
  }
}

function drawHazard(hazard) {
  const x = Math.floor(hazard.x - state.cameraX);
  const y = Math.floor(hazard.y);
  ctx.fillStyle = "#1d1220";
  ctx.fillRect(x, y + 10, hazard.w, 8);
  ctx.fillStyle = "#ff6262";
  for (let px = 0; px < hazard.w; px += 8) {
    ctx.beginPath();
    ctx.moveTo(x + px, y + 12);
    ctx.lineTo(x + px + 4, y);
    ctx.lineTo(x + px + 8, y + 12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPickup(pickup) {
  if (pickup.taken) return;
  const x = Math.floor(pickup.x - state.cameraX);
  const y = Math.floor(pickup.y + Math.sin(performance.now() / 180 + pickup.bob) * 2);
  ctx.fillStyle = "#101322";
  ctx.fillRect(x + 1, y + 1, 6, 6);
  ctx.fillStyle = "#62d6ff";
  ctx.fillRect(x + 2, y, 4, 8);
  ctx.fillStyle = "#f8f3d2";
  ctx.fillRect(x + 3, y + 2, 2, 2);
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  const x = Math.floor(enemy.x - state.cameraX);
  const y = Math.floor(enemy.y);
  ctx.fillStyle = "#101322";
  ctx.fillRect(x + 1, y + 3, enemy.w, enemy.h);
  ctx.fillStyle = enemy.type === "flutter" ? "#ff9ccc" : "#c6ff6b";
  ctx.fillRect(x, y, enemy.w, enemy.h);
  ctx.fillStyle = "#101322";
  ctx.fillRect(x + (enemy.vx > 0 ? 9 : 3), y + 3, 2, 2);
  if (enemy.type === "flutter") {
    ctx.fillStyle = "#f8f3d2";
    ctx.fillRect(x - 4, y + 2, 4, 5);
    ctx.fillRect(x + enemy.w, y + 2, 4, 5);
  }
}

function drawBoss() {
  if (!boss || !boss.alive) return;
  const x = Math.floor(boss.x - state.cameraX);
  const y = Math.floor(boss.y);
  ctx.fillStyle = "#101322";
  ctx.fillRect(x + 3, y + 3, boss.w, boss.h);
  ctx.fillStyle = boss.hurt > 0 ? "#f8f3d2" : "#8f6cff";
  ctx.fillRect(x, y + 8, boss.w, boss.h - 8);
  ctx.fillStyle = "#ff6262";
  ctx.fillRect(x + 5, y, 20, 12);
  ctx.fillStyle = "#101322";
  ctx.fillRect(x + 8, y + 18, 4, 4);
  ctx.fillRect(x + 19, y + 18, 4, 4);
  ctx.fillStyle = "#69f0ca";
  ctx.fillRect(x + 9, y + 29, 12, 5);
}

function drawPlayer() {
  const x = Math.floor(player.x - state.cameraX);
  const y = Math.floor(player.y);
  if (player.inv > 0 && Math.floor(player.inv * 14) % 2 === 0) return;
  ctx.fillStyle = "#101322";
  ctx.fillRect(x + 2, y + 2, player.w, player.h);
  ctx.fillStyle = "#ffcf5a";
  ctx.fillRect(x + 2, y, 8, 6);
  ctx.fillStyle = "#4fe0a7";
  ctx.fillRect(x + 1, y + 6, 10, 8);
  ctx.fillStyle = "#f8f3d2";
  ctx.fillRect(x + (player.dir > 0 ? 8 : 2), y + 2, 2, 2);
  ctx.fillStyle = "#3340a0";
  ctx.fillRect(x + 1, y + 14, 4, 3);
  ctx.fillRect(x + 8, y + 14, 4, 3);
}

function drawGoal() {
  const x = Math.floor(level.goal.x - state.cameraX);
  const y = level.goal.y;
  ctx.fillStyle = "#101322";
  ctx.fillRect(x, y, 4, 88);
  ctx.fillStyle = level.accent;
  ctx.fillRect(x + 4, y + 6, 16, 18);
  ctx.fillStyle = "#f8f3d2";
  ctx.fillRect(x + 8, y + 10, 6, 6);
}

function drawSparks() {
  for (const spark of sparks) {
    const x = Math.floor(spark.x - state.cameraX);
    const y = Math.floor(spark.y);
    ctx.fillStyle = spark.color;
    ctx.fillRect(x, y, spark.w || 3, spark.h || 3);
  }
}

function drawToast() {
  if (toastTimer <= 0) return;
  ctx.fillStyle = "rgba(16, 19, 34, 0.86)";
  ctx.fillRect(86, 16, 214, 22);
  ctx.fillStyle = "#f8f3d2";
  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  ctx.fillText(toastText, 193, 31);
  ctx.textAlign = "left";
}

function drawEnding() {
  ctx.fillStyle = "#101322";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  for (const star of endingStars) {
    ctx.fillStyle = star.size === 1 ? "#62d6ff" : star.size === 2 ? "#f8f3d2" : "#ff9ccc";
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }

  ctx.fillStyle = "#242844";
  ctx.fillRect(0, 172, VIEW_W, 44);
  ctx.fillStyle = "#69f0ca";
  ctx.fillRect(0, 172, VIEW_W, 3);

  ctx.textAlign = "center";
  ctx.fillStyle = "#7cff9b";
  ctx.font = "22px monospace";
  ctx.fillText("SKY RELAY LIT", VIEW_W / 2, 45);
  ctx.fillStyle = "#f8f3d2";
  ctx.font = "9px monospace";
  ctx.fillText("three towers burn over the cinder road", VIEW_W / 2, 64);

  const colors = ["#ffcf5a", "#4fe0a7", "#ff9ccc"];
  for (let i = 0; i < 3; i += 1) {
    const x = 151 + i * 38;
    const y = 120 + Math.sin(performance.now() / 220 + i) * 2;
    ctx.fillStyle = "#101322";
    ctx.fillRect(x + 2, y + 2, 14, 22);
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y + 8, 14, 14);
    ctx.fillStyle = "#f8f3d2";
    ctx.fillRect(x + 3, y, 8, 8);
    ctx.fillStyle = "#101322";
    ctx.fillRect(x + 8, y + 3, 2, 2);
  }

  ctx.fillStyle = "#f2b84b";
  ctx.font = "8px monospace";
  ctx.fillText("CREDITS", VIEW_W / 2, 87);
  ctx.fillStyle = "#d8ddff";
  ctx.fillText("design  code  audio  pixel craft", VIEW_W / 2, 100);
  ctx.fillText("the original sky relay crew", VIEW_W / 2, 112);
  ctx.fillText("ENTER/R: new run     ESC: title", VIEW_W / 2, 156);
  ctx.textAlign = "left";
}

function draw() {
  if (!level) {
    level = levels[0];
    cloneLevelObjects(level);
  }
  if (state.mode === "ending") {
    drawEnding();
    return;
  }
  drawBackground();
  ctx.save();
  for (const hazard of level.hazards) drawHazard(hazard);
  for (const block of level.platforms) drawPlatform(block);
  drawGoal();
  for (const pickup of pickups) drawPickup(pickup);
  for (const enemy of enemies) drawEnemy(enemy);
  drawBoss();
  drawSparks();
  drawPlayer();
  ctx.restore();
  drawToast();
}

function loop(time) {
  const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function restartStage() {
  if (state.mode === "title" || state.mode === "ending") {
    startGame();
    return;
  }
  loadLevel(state.levelIndex);
}

function startMusicFromGesture() {
  music.start().catch(() => {});
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
  if (event.code === "KeyM") {
    startMusicFromGesture();
    music.toggleMuted();
  }
  if (event.code === "Enter" && state.mode !== "playing") {
    startMusicFromGesture();
    startGame();
  }
  if (event.code === "KeyR") {
    startMusicFromGesture();
    restartStage();
  }
  if (event.code === "Escape") showTitle();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

ui.startButton.addEventListener("click", () => {
  startMusicFromGesture();
  if (state.mode === "lost") restartStage();
  else startGame();
});

ui.musicButton.addEventListener("click", () => {
  startMusicFromGesture();
  music.toggleMuted();
});

showMessage(state.messageTitle, state.messageBody, state.messageButton);
requestAnimationFrame(loop);
