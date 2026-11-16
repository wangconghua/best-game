// Everything that moves in the world: the player ship, bullets, enemies,
// power-ups, particles and floating score text. Plain data plus the small
// helpers that spawn and update them; the rules live in world.js.

import { ENEMY, FIELD, PLAYER, POWERUP } from './config.js';
import { pick, range } from './random.js';

export const ENEMY_KINDS = ['drone', 'weaver', 'shooter', 'tank'];

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height - 90,
    radius: PLAYER.radius,
    alive: true,
    invulnerable: 0,
    shield: 0,
    fireTimer: 0,
    spreadTimer: 0,
    rapidTimer: 0,
    bombs: PLAYER.bombs,
    tilt: 0,
    thrust: 0,
  };
}

export function createPools() {
  return {
    bullets: [],       // player shots, moving up
    enemyBullets: [],  // enemy shots, moving down
    enemies: [],
    powerups: [],
    particles: [],
    floaters: [],      // floating score text
    stars: [],         // parallax background, filled by world
  };
}

export function spawnBullet(pools, x, y, angle, speed, friendly) {
  const list = friendly ? pools.bullets : pools.enemyBullets;
  list.push({
    x,
    y,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    radius: friendly ? 4 : 6,
    friendly,
    life: 2.5,
  });
}

/** Fire the player's current spread: 1, 3 or 5 shots by power-up state. */
export function playerFire(pools, player) {
  const angles = player.spreadTimer > 0 ? [-0.28, -0.14, 0, 0.14, 0.28] : [0];
  for (const angle of angles) {
    spawnBullet(pools, player.x, player.y - 18, angle, PLAYER.bulletSpeed, true);
  }
}

export function spawnEnemy(pools, random, kind, wave) {
  const spec = ENEMY[kind];
  const hpBonus = kind === 'tank' ? Math.floor((wave - 4) / 3) : 0;
  const enemy = {
    kind,
    x: range(random, 50, FIELD.width - 50),
    y: -40,
    vx: 0,
    vy: spec.speed * range(random, 0.9, 1.15) * (1 + Math.min(0.5, (wave - 1) * 0.04)),
    radius: spec.radius,
    hp: spec.hp + hpBonus,
    maxHp: spec.hp + hpBonus,
    score: spec.score,
    // Weaver sine motion.
    phase: range(random, 0, Math.PI * 2),
    amplitude: range(random, 60, 130),
    baseX: 0,
    // Shooter behaviour.
    shootTimer: range(random, 1.2, 2.4),
    // Tank drift.
    drift: range(random, -30, 30),
    entered: false,
    flash: 0,
  };
  enemy.baseX = enemy.x;
  pools.enemies.push(enemy);
  return enemy;
}

export function spawnPowerup(pools, random, x, y) {
  const kind = pick(random, POWERUP.kinds);
  pools.powerups.push({ kind, x, y, vy: POWERUP.fallSpeed, radius: POWERUP.radius, bob: range(random, 0, Math.PI * 2) });
}

export function spawnExplosion(pools, x, y, color, count, speed = 260) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.3 + Math.random() * 0.7);
    pools.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.4 + Math.random() * 0.5,
      maxLife: 0.9,
      size: 2 + Math.random() * 3.5,
      color,
      drag: 0.92,
    });
  }
}

export function spawnFloater(pools, x, y, text, color) {
  pools.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

/** Update positions and lifetimes of the free-moving pools. Bullets,
 * particles and floaters age out by their `life`; power-ups only leave
 * when they fall off the bottom. */
export function updatePools(pools, dt) {
  for (const list of [pools.bullets, pools.enemyBullets, pools.powerups, pools.particles, pools.floaters]) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      if (item.vx !== undefined) item.x += item.vx * dt;
      if (item.vy !== undefined) item.y += item.vy * dt;
      if (item.vx !== undefined) { item.vx *= item.drag ?? 1; item.vy *= item.drag ?? 1; }
      if (item.life !== undefined) item.life -= dt;
      if (item.bob !== undefined) item.bob += dt * 3;
      const out = item.y < -60 || item.y > FIELD.height + 60 || item.x < -60 || item.x > FIELD.width + 60;
      if ((item.life !== undefined && item.life <= 0) || out) list.splice(i, 1);
    }
  }
}
