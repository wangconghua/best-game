// NEON VOID — boot, the fixed-step loop, and the screen state machine.
// The rules live in world.js; this file only wires input, timing and drawing.
//
// Play it: open index.html from any static server. Screenshots: add
// ?shot=start|play|end&seed=N to stage a deterministic scene.

import { BEST_KEY, FIELD, STEP } from './config.js';
import { createWorld, PHASE_OVER, PHASE_PLAY, PHASE_TITLE, reset, step } from './world.js';
import { render, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { bindInput, clearQueues, createInput } from './input.js';
import { stageShot } from './shots.js';
import { toggleMute, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 20261116;

const world = createWorld(seed);
try {
  world.best = Number.parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
} catch {
  world.best = 0;
}

const input = createInput();

/** Map a client point to logical field coordinates. */
function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * FIELD.width,
    y: ((clientY - rect.top) / rect.height) * FIELD.height,
  };
}
bindInput(input, canvas, toLogical);

let screen = SCREEN_TITLE;

// A screenshot scene stages itself once and then holds still (the loop keeps
// drawing so stars twinkle, but the world no longer advances).
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  // Freeze the staged frame: keep drawing, stop stepping.
  const drawOnly = () => {
    render(ctx, world, screen);
    requestAnimationFrame(drawOnly);
  };
  drawOnly();
} else {
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;

    // One-shot input: pause, mute, menus.
    if (input.muteQueued) {
      world.muted = toggleMute();
    }
    if (input.pauseQueued && world.phase === PHASE_PLAY) {
      world.paused = !world.paused;
    }

    if (world.phase === PHASE_TITLE) {
      if (input.confirmQueued) {
        unlockAudio();
        reset(world);
        screen = SCREEN_PLAY;
      }
    } else if (world.phase === PHASE_OVER) {
      if (input.restartQueued || input.confirmQueued) {
        unlockAudio();
        reset(world);
        screen = SCREEN_PLAY;
      }
    }

    // Fixed-step simulation; the renderer draws the latest state.
    while (accumulator >= STEP) {
      step(world, input, STEP);
      accumulator -= STEP;
      if (world.phase === PHASE_OVER) screen = SCREEN_OVER;
    }
    clearQueues(input);

    try {
      if (world.score > world.best) localStorage.setItem(BEST_KEY, String(world.score));
    } catch {
      // Private mode: best score just does not persist.
    }
    if (world.score > world.best) world.best = world.score;

    render(ctx, world, screen);
  }
  requestAnimationFrame(frame);
}
