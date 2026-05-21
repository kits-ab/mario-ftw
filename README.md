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
- Restart current stage: `R`
- Start from title or win screen: `Enter`

## Game Structure

- `1-1 Ember Fields`: introductory gaps, patrol enemies, and crystal pickups
- `2-2 Moonlit Mill`: tighter jumps with staggered platforms
- `3-3 Prism Spire`: final approach ending in the Glassheart Warden boss fight

Reach the relay flag at the end of each level. On level 3, defeat the Glassheart Warden before touching the final flag.
