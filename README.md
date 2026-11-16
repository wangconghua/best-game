# NEON VOID

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wangconghua/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wangconghua/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon space shooter that plays offline in a desktop browser. Blast the
swarm, chain kills for combo multipliers, grab power-ups, and spend bombs
to clear the sky. Four enemy kinds, escalating waves, a best score that
persists between visits.

## Play

Serve `game/` from any static server and open `index.html`:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries: plain ES modules and a
canvas, with sound synthesised through WebAudio.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys / mouse | Steer the ship |
| (automatic) | Fire |
| Space / click | Bomb (clears enemy fire, damages everything) |
| P | Pause |
| M | Mute |
| Enter / click | Launch, R / click to fly again after game over |

## Screenshots

The three shots under `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=start|play|end&seed=1`:

- `1-start.jpg` — title screen
- `2-play.jpg` — wave combat with HUD, combo and power-ups
- `3-end.jpg` — game-over screen with score and restart

## Files

- `game/index.html` — the page; `game/src/` holds the game, one job a file:
  `config.js` (tuning), `random.js` (seeded RNG), `input.js`, `audio.js`
  (synth SFX), `entities.js` (ships, bullets, particles), `world.js`
  (waves, collisions, scoring), `render.js` (all drawing), `shots.js`
  (screenshot staging), `main.js` (boot and loop).
- `main.ts` — the make.fun entry program: copies `game/` and `screenshots/`
  to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
