// The screenshot scenes behind ?shot=start|play|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what real play looks like and the
// same seed always gives the same frame.
//
// The play autopilot chases the lowest enemy (to stay under its fire and
// kill it) while sidestepping enemy bullets; the end autopilot never dodges,
// so it is caught out once the swarm thickens, as a hurried player is.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, PHASE_OVER, PHASE_TITLE, reset, step } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createInput } from './input.js';
import { spawnEnemy } from './entities.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 15;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer the ship: return an input object for this step. */
function autopilotInput(world, dodge) {
  const input = createInput();
  const player = world.player;
  if (!player.alive) return input;

  let moveX = 0;
  // Dodge: if an enemy bullet is close above and roughly overhead, sidestep.
  if (dodge) {
    for (const bullet of world.pools.enemyBullets) {
      const dy = player.y - bullet.y;
      if (dy > 0 && dy < 150 && Math.abs(bullet.x - player.x) < 42) {
        moveX = bullet.x < player.x ? 1 : -1;
        break;
      }
    }
    // Ram-dodge: an enemy about to overlap us from above.
    if (moveX === 0) {
      for (const enemy of world.pools.enemies) {
        const dy = player.y - enemy.y;
        if (dy > 0 && dy < 90 && Math.abs(enemy.x - player.x) < enemy.radius + 26) {
          moveX = enemy.x < player.x ? 1 : -1;
          break;
        }
      }
    }
  }
  // Otherwise chase the lowest enemy's x so the auto-fire hits it.
  if (moveX === 0) {
    let target = null;
    for (const enemy of world.pools.enemies) {
      if (target === null || enemy.y > target.y) target = enemy;
    }
    if (target !== null) {
      if (target.x > player.x + 14) moveX = 1;
      else if (target.x < player.x - 14) moveX = -1;
    }
  }
  if (moveX < 0) input.keys.add('ArrowLeft');
  if (moveX > 0) input.keys.add('ArrowRight');
  // Bomb when the sky is thick with enemy fire and we still hold one.
  if (dodge && world.pools.enemyBullets.length > 14 && player.bombs > 0) input.bombQueued = true;
  return input;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'end') {
    // Title: idle world with a few decorative drones drifting down.
    world.phase = PHASE_TITLE;
    for (let i = 0; i < 5; i += 1) {
      const enemy = spawnEnemy(world.pools, world.random, ['drone', 'weaver', 'shooter'][i % 3], 2);
      enemy.y = 60 + i * 90;
      enemy.vy = 40;
    }
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      step(world, createInput(), STEP);
    }
    return { screen: SCREEN_TITLE };
  }
  reset(world);
  const dodge = name === 'play';
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    if (step(world, autopilotInput(world, dodge), STEP) & EVENT_OVER) break;
  }
  const over = world.phase === PHASE_OVER;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY };
}
