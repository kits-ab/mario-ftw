export const TOTAL_LEVELS = 3;
export const BOSS_LEVEL = 3;
export const BOSS_MAX_HEALTH = 5;

export function createInitialState(now = 0) {
  return {
    screen: "menu",
    level: 1,
    startedAt: null,
    completedAt: null,
    creditsSeen: false,
    levelsCleared: 0,
    boss: createBossState(),
    message: "Press Enter to launch the relay"
  };
}

export function createBossState() {
  return {
    maxHealth: BOSS_MAX_HEALTH,
    health: BOSS_MAX_HEALTH,
    defeated: false
  };
}

export function startGame(state = createInitialState(), now = 0) {
  return {
    ...state,
    screen: "playing",
    level: 1,
    startedAt: now,
    completedAt: null,
    creditsSeen: false,
    levelsCleared: 0,
    boss: createBossState(),
    message: "Relay tower one is active"
  };
}

export function returnToMenu(state = createInitialState()) {
  return {
    ...createInitialState(),
    creditsSeen: state.screen === "ending" || state.creditsSeen,
    message: state.screen === "ending"
      ? "Relay complete. Press Enter for another run"
      : "Press Enter to launch the relay"
  };
}

export function restartGame(now = 0) {
  return startGame(createInitialState(now), now);
}

export function clearCurrentLevel(state) {
  if (state.screen !== "playing") {
    return state;
  }

  if (state.level >= BOSS_LEVEL) {
    return state;
  }

  const nextLevel = state.level + 1;
  return {
    ...state,
    level: nextLevel,
    levelsCleared: Math.max(state.level, state.levelsCleared),
    boss: nextLevel === BOSS_LEVEL ? createBossState() : state.boss,
    message: nextLevel === BOSS_LEVEL
      ? "Final tower online. Break the prism core"
      : `Relay tower ${nextLevel} is active`
  };
}

export function damageBoss(state, amount = 1, now = 0) {
  if (state.screen !== "playing" || state.level !== BOSS_LEVEL || state.boss.defeated) {
    return state;
  }

  const nextHealth = Math.max(0, state.boss.health - Math.max(0, amount));
  const defeated = nextHealth === 0;

  if (!defeated) {
    return {
      ...state,
      boss: {
        ...state.boss,
        health: nextHealth
      },
      message: "Prism core unstable"
    };
  }

  return {
    ...state,
    screen: "ending",
    completedAt: now,
    creditsSeen: true,
    levelsCleared: TOTAL_LEVELS,
    boss: {
      ...state.boss,
      health: 0,
      defeated: true
    },
    message: "Relay complete"
  };
}

export function handleCommand(state, command, now = 0) {
  switch (command) {
    case "start":
      return state.screen === "menu" ? startGame(state, now) : state;
    case "restart":
      return restartGame(now);
    case "menu":
      return returnToMenu(state);
    case "clearLevel":
      return clearCurrentLevel(state);
    case "damageBoss":
      return damageBoss(state, 1, now);
    default:
      return state;
  }
}
