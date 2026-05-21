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
