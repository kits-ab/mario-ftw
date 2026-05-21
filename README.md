# Cinder Run: Sky Relay

An original browser-based retro platformer prototype. It uses generated canvas pixel art and original names, code, maps, enemies, and boss design.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

- Move: `A` / `D` or left / right arrows
- Jump: `W`, up arrow, or space
- Mute/unmute original music: `M` or the Audio button
- Restart current stage: `R`
- Start from title or win screen: `Enter`

## Audio

The soundtrack is an original chiptune-style loop generated in `src/game.js` with the Web Audio API. It uses synthesized square-wave leads, pulse bass, arpeggios, and noise percussion; there are no copied melodies, samples, or external audio assets. Browser audio begins only after a player interaction such as Start, `Enter`, `R`, or the Audio button.

## Game Structure

- `1-1 Ember Fields`: introductory gaps, patrol enemies, and crystal pickups
- `2-2 Moonlit Mill`: tighter jumps with staggered platforms
- `3-3 Prism Spire`: final approach ending in the Glassheart Warden boss fight

Reach the relay flag at the end of each level. On level 3, defeat the Glassheart Warden before touching the final flag.

## Original Arcade Sound Effects

The repository also includes an original Web Audio sound-effects module for
retro platformer gameplay. The effects are synthesized at runtime and do not use
Nintendo, Mario, or ripped sample assets.

### Included Effects

- `jump`
- `collect`
- `damage`
- `enemyHit`
- `bossHit`
- `levelClear`
- `gameOver`
- `menuConfirm`

### Usage

```js
import { RetroSfx } from "./src/retro-sfx.js";

const sfx = new RetroSfx();

startButton.addEventListener("click", async () => {
  await sfx.unlock();
  sfx.play("menuConfirm");
});

player.onJump = () => sfx.play("jump");
coin.onCollect = () => sfx.play("collect");
player.onDamage = () => sfx.play("damage");
enemy.onHit = () => sfx.play("enemyHit");
boss.onHit = () => sfx.play("bossHit");
level.onClear = () => sfx.play("levelClear");
game.onGameOver = () => sfx.play("gameOver");
```

`RetroSfx` also accepts `play("confirm")` as an alias for `menuConfirm`.

### Sound Controls

Browsers require a user gesture before audio can start. `RetroSfx` installs
one-shot pointer, keyboard, and touch unlock listeners by default. You can also
call `await sfx.unlock()` from a start/menu button.

```js
sfx.setMuted(true);
sfx.setMuted(false);
sfx.toggleMute();
sfx.setVolume(0.4);
```

Calling `play()` while muted returns `false`. Calling `play()` before the browser
has unlocked audio also returns `false` and attempts to resume the audio context.

### Demo

Open `demo/index.html` in a browser and press `Enable sound`, then trigger each
effect button. The demo uses the same mute and volume API intended for gameplay.
