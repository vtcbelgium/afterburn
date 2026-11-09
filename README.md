# AFTERBURN

One ship. No brakes. A 3D arcade hover racer built with Three.js and Vite.

**Play:** https://vtcbelgium.github.io/afterburn/

Free public hosting on GitHub Pages. No login, download, or API key required.

## Deployment

Push to `main` to run the game-rule tests, build the static game, and deploy to GitHub Pages. The workflow can also be started manually from the Actions tab. The Vite base path is `/afterburn/` and the build output directory is `build/`.

## Run locally

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Production build: `npm run build`. Game rules: `npm test`.

## Controls

| Action | Controls |
| --- | --- |
| Start | Enter / Let’s Ride |
| Change lane | Left / Right arrows or A / D |
| Boost | Hold Space, Up arrow, or W |
| Pause / resume | P / Escape |
| Sound | M / speaker button |
| Fullscreen | F / fullscreen button |
| Touch | Onscreen arrows, swipe, and hold Boost |

Collect cyan energy, avoid orange barriers, and survive as the city gets faster. Three hits end the run. Near misses build a score multiplier up to 8×. Boost refills over time and from energy pickups; when exhausted, release boost to rearm it. Your best score is saved locally when browser storage is available. Changing tabs pauses the run.

All 3D geometry, signs, particle effects, and audio are generated locally. Fonts are bundled; the game makes no external asset requests. WebGL 2 is required. Sound starts muted and can be enabled with the sound control.
