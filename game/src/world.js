// The world: game state, waves, movement, collisions and scoring. The
// renderer only draws what this file owns; the loop in main.js only calls
// step() and reads state.

import { COMBO, ENEMY, FIELD, LIVES, PALETTE, PLAYER, POWERUP, STEP, WAVE } from './config.js';
import { createPlayer, createPools, playerFire, spawnBullet, spawnEnemy, spawnExplosion, spawnFloater, spawnPowerup, updatePools } from './entities.js';
import { makeRandom, pick, range } from './random.js';
import { sfx } from './audio.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

export function createWorld(seed = 20261116) {
  const world = {
    seed,
    random: makeRandom(seed),
    phase: PHASE_TITLE,
    paused: false,
    time: 0,
    player: createPlayer(),
    pools: createPools(),
    score: 0,
    best: 0,
    lives: LIVES,
    wave: 0,
    kills: 0,
    comboKills: 0,
    comboStep: 1,
    waveState: 'idle', // idle | spawning | fighting | banner
    waveTimer: 0,
    spawnTimer: 0,
    toSpawn: [],
    banner: null,      // { text, sub, timer }
    shake: 0,
    flash: 0,
    muted: false,
  };
  fillStars(world);
  return world;
}

function fillStars(world) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: world.random() * FIELD.width,
      y: world.random() * FIELD.height,
      size: 0.6 + world.random() * 1.8,
      speed: 12 + world.random() * 55,
      twinkle: world.random() * Math.PI * 2,
      layer: i % 3,
    });
  }
  world.pools.stars = stars;
}

/** Start a fresh run from the title screen. */
export function reset(world, seed) {
  const best = world.best;
  const muted = world.muted;
  Object.assign(world, createWorld(seed ?? (world.seed + 1)));
  world.best = best;
  world.muted = muted;
  world.phase = PHASE_PLAY;
  startWave(world, 1);
}

/** Begin wave `n`: queue its enemies and show the banner. */
export function startWave(world, n) {
  world.wave = n;
  world.waveState = 'spawning';
  world.spawnTimer = 0.6;
  const count = Math.min(WAVE.maxCount, WAVE.baseCount + WAVE.perWave * (n - 1));
  const kinds = ['drone'];
  if (n >= 2) kinds.push('weaver');
  if (n >= 3) kinds.push('shooter');
  if (n >= 4) kinds.push('tank');
  world.toSpawn = [];
  for (let i = 0; i < count; i += 1) {
    // Tanks are rare; later waves weight the harder kinds in.
    let kind = pick(world.random, kinds);
    if (kind === 'tank' && world.random() < 0.6) kind = 'drone';
    world.toSpawn.push(kind);
  }
  world.banner = { text: `WAVE ${n}`, sub: n === 1 ? 'Hostiles inbound — good hunting, pilot' : 'They keep coming', timer: 2.2 };
  sfx.wave();
}

function spawnInterval(world) {
  return Math.max(WAVE.minSpawnInterval, WAVE.spawnInterval * Math.pow(WAVE.spawnScale, world.wave - 1));
}

function applyPowerup(world, kind) {
  const player = world.player;
  if (kind === 'spread') player.spreadTimer = 10;
  else if (kind === 'rapid') player.rapidTimer = 10;
  else if (kind === 'shield') player.shield = PLAYER.shieldSeconds;
  else if (kind === 'life') world.lives = Math.min(5, world.lives + 1);
  spawnFloater(world.pools, player.x, player.y - 34,
    kind === 'life' ? '+1 SHIP' : kind.toUpperCase() + '!',
    PALETTE[kind === 'life' ? 'life' : kind]);
  sfx.powerup();
}

function addScore(world, base, x, y) {
  const gained = base * world.comboStep;
  world.score += gained;
  spawnFloater(world.pools, x, y, `+${gained}`, world.comboStep > 1 ? PALETTE.gold : PALETTE.text);
}

function killEnemy(world, enemy, award = true) {
  const pools = world.pools;
  const colors = { drone: PALETTE.drone, weaver: PALETTE.weaver, shooter: PALETTE.shooter, tank: PALETTE.tank };
  spawnExplosion(pools, enemy.x, enemy.y, colors[enemy.kind], enemy.kind === 'tank' ? 42 : 18, enemy.kind === 'tank' ? 340 : 260);
  if (award) {
    addScore(world, enemy.score, enemy.x, enemy.y);
    world.kills += 1;
    world.comboKills += 1;
    if (world.comboKills >= COMBO.killsPerStep * world.comboStep && world.comboStep < COMBO.maxStep) {
      world.comboStep += 1;
      world.comboKills = 0;
      spawnFloater(pools, enemy.x, enemy.y - 26, `COMBO x${world.comboStep}`, PALETTE.gold);
    }
    if (world.random() < POWERUP.dropChance) spawnPowerup(pools, world.random, enemy.x, enemy.y);
  }
  sfx.explosion(enemy.kind === 'tank');
  if (enemy.kind === 'tank') world.shake = Math.max(world.shake, 10);
}

function damagePlayer(world) {
  const player = world.player;
  if (player.invulnerable > 0 || !player.alive) return;
  if (player.shield > 0) {
    player.shield = 0;
    player.invulnerable = 1.2;
    spawnExplosion(world.pools, player.x, player.y, PALETTE.shield, 22, 300);
    sfx.hit();
    return;
  }
  world.lives -= 1;
  world.comboStep = 1;
  world.comboKills = 0;
  spawnExplosion(world.pools, player.x, player.y, PALETTE.player, 30, 320);
  world.shake = Math.max(world.shake, 12);
  sfx.hit();
  if (world.lives <= 0) {
    player.alive = false;
    world.phase = PHASE_OVER;
    if (world.score > world.best) world.best = world.score;
    sfx.gameOver();
  } else {
    player.invulnerable = PLAYER.invulnerable;
  }
}

function fireBomb(world) {
  const player = world.player;
  if (player.bombs <= 0 || !player.alive) return;
  player.bombs -= 1;
  world.flash = 0.5;
  world.shake = Math.max(world.shake, 8);
  world.pools.enemyBullets.length = 0;
  for (const enemy of [...world.pools.enemies]) {
    enemy.hp -= 3;
    enemy.flash = 0.15;
    if (enemy.hp <= 0) killEnemy(world, enemy);
  }
  world.pools.enemies = world.pools.enemies.filter((enemy) => enemy.hp > 0);
  sfx.bomb();
}

/** Move the player from keyboard or (recent) mouse. Returns nothing. */
function movePlayer(world, input, dt) {
  const player = world.player;
  const keys = input.keys;
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  const mouseFresh = input.mouseX !== null && performance.now() - input.mouseMovedAt < 2500;
  if (dx === 0 && dy === 0 && mouseFresh) {
    // Glide toward the mouse; keyboard always wins when pressed.
    const tx = input.mouseX;
    const ty = Math.min(input.mouseY, FIELD.height - 40);
    const mx = tx - player.x;
    const my = ty - player.y;
    const distance = Math.hypot(mx, my);
    if (distance > 4) {
      const step = Math.min(distance, PLAYER.speed * dt * 1.15);
      player.x += (mx / distance) * step;
      player.y += (my / distance) * step;
      player.tilt = Math.max(-0.35, Math.min(0.35, (mx / distance) * 0.35));
    }
  } else if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    player.x += (dx / length) * PLAYER.speed * dt;
    player.y += (dy / length) * PLAYER.speed * dt;
    player.tilt = dx * 0.3;
  } else {
    player.tilt *= 0.85;
  }
  player.x = Math.max(24, Math.min(FIELD.width - 24, player.x));
  player.y = Math.max(60, Math.min(FIELD.height - 30, player.y));
  player.thrust = dy > 0 ? 1 : 0;
}

function updateEnemies(world, dt) {
  const player = world.player;
  for (const enemy of world.pools.enemies) {
    enemy.flash = Math.max(0, enemy.flash - dt);
    if (enemy.kind === 'weaver') {
      enemy.y += enemy.vy * dt;
      enemy.phase += dt * 3.2;
      enemy.x = enemy.baseX + Math.sin(enemy.phase) * enemy.amplitude;
      enemy.x = Math.max(24, Math.min(FIELD.width - 24, enemy.x));
    } else if (enemy.kind === 'tank') {
      enemy.y += enemy.vy * dt;
      enemy.x += enemy.drift * dt;
      if (enemy.x < 40 || enemy.x > FIELD.width - 40) enemy.drift *= -1;
    } else if (enemy.kind === 'shooter') {
      enemy.y += enemy.vy * dt;
      if (enemy.y > 150 && !enemy.entered) {
        enemy.entered = true;
        enemy.vy = 26;
      }
      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && enemy.y < player.y - 40) {
        enemy.shootTimer = 1.6 + world.random() * 1.2;
        // spawnBullet moves along (sin a, -cos a); aim a so it points at the player.
        const aim = Math.atan2(player.x - enemy.x, -(player.y - enemy.y));
        spawnBullet(world.pools, enemy.x, enemy.y + 16, aim, 270, false);
        sfx.enemyShoot();
      }
    } else {
      // Drone: drifts toward the player's x as it falls.
      enemy.y += enemy.vy * dt;
      const toward = Math.sign(player.x - enemy.x);
      enemy.x += toward * 46 * dt;
    }
  }
  world.pools.enemies = world.pools.enemies.filter((enemy) => enemy.y < FIELD.height + 60);
}

function collide(world) {
  const pools = world.pools;
  const player = world.player;
  // Player bullets vs enemies.
  for (let i = pools.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = pools.bullets[i];
    let consumed = false;
    for (let j = pools.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = pools.enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const reach = bullet.radius + enemy.radius;
      if (dx * dx + dy * dy < reach * reach) {
        enemy.hp -= 1;
        enemy.flash = 0.12;
        spawnExplosion(pools, bullet.x, bullet.y, PALETTE.bullet, 3, 120);
        if (enemy.hp <= 0) {
          killEnemy(world, enemy);
          pools.enemies.splice(j, 1);
        }
        consumed = true;
        break;
      }
    }
    if (consumed) pools.bullets.splice(i, 1);
  }
  // Enemy bullets vs player.
  if (player.alive && player.invulnerable <= 0) {
    for (let i = pools.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = pools.enemyBullets[i];
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const reach = bullet.radius + player.radius - 4;
      if (dx * dx + dy * dy < reach * reach) {
        pools.enemyBullets.splice(i, 1);
        damagePlayer(world);
        if (!player.alive) return;
        break;
      }
    }
  }
  // Enemies vs player (ramming).
  if (player.alive && player.invulnerable <= 0) {
    for (let j = pools.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = pools.enemies[j];
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const reach = enemy.radius + player.radius - 6;
      if (dx * dx + dy * dy < reach * reach) {
        killEnemy(world, enemy, false);
        pools.enemies.splice(j, 1);
        damagePlayer(world);
        if (!player.alive) return;
        break;
      }
    }
  }
  // Power-ups vs player.
  if (player.alive) {
    for (let i = pools.powerups.length - 1; i >= 0; i -= 1) {
      const power = pools.powerups[i];
      const dx = power.x - player.x;
      const dy = power.y - player.y;
      const reach = power.radius + player.radius + 6;
      if (dx * dx + dy * dy < reach * reach) {
        pools.powerups.splice(i, 1);
        applyPowerup(world, power.kind);
      }
    }
  }
}

/**
 * Advance the world one fixed step. `input` is the live input state (or an
 * autopilot's). Returns a bitmask of EVENT_*; 0 while the title idles.
 */
export function step(world, input, dt = STEP) {
  world.time += dt;
  // Starfield always drifts, even on the title screen.
  for (const star of world.pools.stars) {
    star.y += star.speed * dt * (world.phase === PHASE_PLAY ? 1.6 : 1);
    star.twinkle += dt * 2;
    if (star.y > FIELD.height + 2) {
      star.y = -2;
      star.x = world.random() * FIELD.width;
    }
  }
  if (world.banner) {
    world.banner.timer -= dt;
    if (world.banner.timer <= 0) world.banner = null;
  }
  world.shake = Math.max(0, world.shake - dt * 26);
  world.flash = Math.max(0, world.flash - dt * 1.6);

  if (world.phase !== PHASE_PLAY || world.paused) {
    // Title and game-over scenes keep drifting: decorative enemies float down.
    for (const enemy of world.pools.enemies) enemy.y += 40 * dt;
    world.pools.enemies = world.pools.enemies.filter((enemy) => enemy.y < FIELD.height + 60);
    updatePools(world.pools, dt);
    return 0;
  }

  const player = world.player;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.spreadTimer = Math.max(0, player.spreadTimer - dt);
  player.rapidTimer = Math.max(0, player.rapidTimer - dt);

  movePlayer(world, input, dt);

  // Auto-fire.
  player.fireTimer -= dt;
  if (player.fireTimer <= 0 && player.alive) {
    player.fireTimer = player.rapidTimer > 0 ? PLAYER.rapidFireInterval : PLAYER.fireInterval;
    playerFire(world.pools, player);
    sfx.shoot();
  }

  if (input.bombQueued) fireBomb(world);

  // Wave spawning.
  if (world.waveState === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      if (world.toSpawn.length > 0) {
        spawnEnemy(world.pools, world.random, world.toSpawn.shift(), world.wave);
        world.spawnTimer = spawnInterval(world) * (0.7 + world.random() * 0.6);
      } else {
        world.waveState = 'fighting';
      }
    }
  } else if (world.waveState === 'fighting' && world.pools.enemies.length === 0 && player.alive) {
    world.score += WAVE.clearBonus;
    world.banner = { text: `WAVE ${world.wave} CLEAR`, sub: `+${WAVE.clearBonus} bonus`, timer: 2.0 };
    world.waveState = 'banner';
    world.waveTimer = WAVE.gapSeconds;
  } else if (world.waveState === 'banner') {
    world.waveTimer -= dt;
    if (world.waveTimer <= 0) startWave(world, world.wave + 1);
  }

  updateEnemies(world, dt);
  updatePools(world.pools, dt);
  collide(world);

  if (world.phase === PHASE_OVER) return EVENT_OVER;
  return 0;
}
