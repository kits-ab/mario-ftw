# Glödloppet: Himmelreläet

Ett fristående webbläsarbaserat retroplattformsspel om att tända ett bleknande himmelrelä. Spelet använder genererad pixelgrafik i canvas och egna namn, egen kod, egna banor, fiender, melodier och bossupplägg.

## Kör lokalt

Öppna `index.html` direkt i en webbläsare eller servera mappen med valfri statisk server:

```sh
npm start
```

Gå sedan till `http://127.0.0.1:8765`.

## Kontroller

- Titelmenyn öppnas först och kan styras med både knappar och tangentbord
- Spring: `A` / `D` eller vänster / höger pil
- Hoppa: `W`, uppåtpil eller mellanslag
- Spring in i ett hopp för att få lite extra höjd av farten
- Starta från titel-, förlust- eller slutskärmen: `Enter` eller knappen Starta
- Starta om från titel-, spel-, förlust- eller slutskärmen: `R` eller knappen Starta om
- Tysta eller spela den egna melodin: `M`, knappen Melodi i titelmenyn eller knappen Melodi i HUD:en
- Återgå till titelmenyn under spel: `Esc`

## Titelmeny

Spelet börjar på en egen retroinspirerad titelmeny med pixelritad relästad i canvas, original titelbehandling, startknapp, starta om-knapp, melodistatus och tangentprompter för `Enter`, `R`, `M` och `Esc`. Menyn använder egna namn, egen form och egna pixelelement och innehåller inga Nintendo- eller Mario-namn, logotyper, figurer, layouter eller kopierade assets.

## Ljud

Musiken är en egen chiptune-liknande slinga som skapas i `src/game.js` med Web Audio API. Den använder syntetiserade fyrkantsvågsstämmor, pulsbass, arpeggion, triangelharmonier och brusbaserad rytm. Inga kopierade melodier, samplingar eller externa ljudfiler används. Webbläsarljud startar först efter spelarens inmatning, till exempel Starta reläet, `Enter`, `R` eller knappen Melodi.

## Visuell Stil

All bangrafik ritas vid körning med egna pixelformer i canvas. De mjukare pastellpaletterna, kraftiga figursilhuetterna, kristallerna, reläflaggorna, fienderna, bossen, parallaxlagren i himlen, molnklustren, de rullande kullarna, horisontdetaljerna och ängsförgrunderna är gjorda för detta projekt och använder inga franchisekopplade sprites, logotyper, kopierade paletter, kopierade blockdesigner eller kopierade banor.

## Spelstruktur

- `1-1 Glödporten`: introducerande gap, patrullerande fiender och prismagnistor att samla
- `2-2 Månkvarnen`: tajtare hopp med förskjutna plattformar
- `3-3 Prismaspiran`: sista vägen fram till bossen Glashjärtats Väktare

Nå reläflaggan i slutet av varje bana. På bana 3 besegrar du Glashjärtats Väktare för att direkt visa slutskärmen.

## Slutflöde

När bossen på bana 3 besegras öppnas en egen pixelritad slutskärm med avslutande text och medverkan. Därifrån kan du trycka `Enter` eller `R` för att starta en ny runda, eller `Esc` för att gå tillbaka till titelmenyn.

## Egna Arkadljudeffekter

Koden innehåller också en egen Web Audio-modul för retroljudeffekter i plattformsspel. Effekterna syntetiseras vid körning och använder inga franchiseljud eller rippade ljudfiler.

### Ingående Effekter

- `jump`
- `collect`
- `damage`
- `enemyHit`
- `bossHit`
- `levelClear`
- `gameOver`
- `menuConfirm`

### Användning

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

`RetroSfx` accepterar även `play("confirm")` som alias för `menuConfirm`.

### Ljudkontroller

Webbläsare kräver en användargest innan ljud kan starta. `RetroSfx` lägger som standard till engångslyssnare för pekare, tangentbord och beröring som låser upp ljudet. Du kan också anropa `await sfx.unlock()` från en start- eller menyknapp.

```js
sfx.setMuted(true);
sfx.setMuted(false);
sfx.toggleMute();
sfx.setVolume(0.4);
```

Ett anrop till `play()` när ljudet är tystat returnerar `false`. Ett anrop till `play()` innan webbläsaren har låst upp ljudet returnerar också `false` och försöker återuppta ljudkontexten.

### Demo

Öppna `demo/index.html` i en webbläsare och tryck på `Aktivera ljud`. Testa sedan effektknapparna. Demot använder samma API för tystning och volym som spelet.
