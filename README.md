# Cinder Run: Sky Relay

An original browser-based retro platformer prototype about relighting a fading sky relay. It uses generated canvas pixel art and original names, code, maps, enemies, soundtrack, and boss design.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with any static server:

```sh
npm start
```

Then visit `http://127.0.0.1:8765`.

## Controls

- Run: `A` / `D` or left / right arrows
- Leap: `W`, up arrow, or space
- Run into a leap to gain a little extra height from your horizontal speed
- Silence/restore the original tune: `M` or the Tune button
- Retry current stage: `R`
- Begin from title or ending screen: `Enter`
- Return to the title menu: `Esc`

## Audio

The soundtrack is an original chiptune-style loop generated in `src/game.js` with the Web Audio API. It uses synthesized square-wave leads, pulse bass, arpeggios, triangle harmony stabs, and noise percussion; there are no copied melodies, samples, or external audio assets. Browser audio begins only after a player interaction such as Begin Relay, `Enter`, `R`, or the Tune button.

## Visual Style

All stage art is drawn at runtime with original canvas pixel shapes. The brighter tile palettes, chunky character silhouettes, crystals, relay flags, enemies, boss, background hills, cloud clusters, and skyline details are purpose-built for this project and do not use franchise sprites, logos, copied block designs, or copied maps.

## Game Structure

- `1-1 Ember Gate`: introductory gaps, patrol enemies, and prism spark pickups
- `2-2 Moon Mill`: tighter leaps with staggered platforms
- `3-3 Prism Spire`: final approach ending in the Glassheart Warden boss fight

Reach the relay flag at the end of each stage. On stage 3, defeat the Glassheart Warden to trigger the ending screen immediately.

## Ending Flow

Defeating the stage 3 boss opens a dedicated pixel-art ending screen with completion text and credits. From that ending, press `Enter` or `R` to start a new run, or press `Esc` to return to the title menu.

## Original Arcade Sound Effects

The repository also includes an original Web Audio sound-effects module for
retro platformer gameplay. The effects are synthesized at runtime and do not use
franchise samples or ripped audio assets.

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
