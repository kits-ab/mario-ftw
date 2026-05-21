import test from "node:test";
import assert from "node:assert/strict";

import {
  BOSS_MAX_HEALTH,
  createInitialState,
  damageBoss,
  handleCommand
} from "../src/game-state.js";

test("start command launches a fresh run from the menu", () => {
  const state = handleCommand(createInitialState(), "start", 100);

  assert.equal(state.screen, "playing");
  assert.equal(state.level, 1);
  assert.equal(state.startedAt, 100);
  assert.equal(state.boss.health, BOSS_MAX_HEALTH);
});

test("clearing tower levels advances to the level 3 boss", () => {
  let state = handleCommand(createInitialState(), "start", 100);

  state = handleCommand(state, "clearLevel", 200);
  assert.equal(state.level, 2);
  assert.equal(state.screen, "playing");

  state = handleCommand(state, "clearLevel", 300);
  assert.equal(state.level, 3);
  assert.equal(state.screen, "playing");
  assert.equal(state.boss.health, BOSS_MAX_HEALTH);
});

test("defeating the level 3 boss reaches the ending screen", () => {
  let state = handleCommand(createInitialState(), "start", 100);
  state = handleCommand(state, "clearLevel", 200);
  state = handleCommand(state, "clearLevel", 300);

  for (let i = 0; i < BOSS_MAX_HEALTH - 1; i += 1) {
    state = damageBoss(state, 1, 400 + i);
    assert.equal(state.screen, "playing");
  }

  state = damageBoss(state, 1, 999);

  assert.equal(state.screen, "ending");
  assert.equal(state.completedAt, 999);
  assert.equal(state.creditsSeen, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.boss.health, 0);
});

test("restart and menu commands leave the ending flow cleanly", () => {
  let state = handleCommand(createInitialState(), "start", 100);
  state = handleCommand(state, "clearLevel", 200);
  state = handleCommand(state, "clearLevel", 300);
  state = damageBoss(state, BOSS_MAX_HEALTH, 400);

  const restarted = handleCommand(state, "restart", 500);
  assert.equal(restarted.screen, "playing");
  assert.equal(restarted.level, 1);
  assert.equal(restarted.boss.defeated, false);

  const menu = handleCommand(state, "menu", 600);
  assert.equal(menu.screen, "menu");
  assert.match(menu.message, /Himmelreläet är tänt/);
});
