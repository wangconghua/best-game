// Everything drawn on the canvas: the neon space backdrop, the ships,
// the HUD and the title / pause / game-over screens. No game rules here.

import { FIELD, PALETTE, FONT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowBlur = 0;
}

function drawBackdrop(ctx, world) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, '#070818');
  gradient.addColorStop(0.55, PALETTE.backdrop);
  gradient.addColorStop(1, '#0a0618');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Soft nebulas, drifting slowly with time.
  const nebulas = [
    { x: 220 + Math.sin(world.time * 0.05) * 30, y: 150, r: 300, color: PALETTE.nebulaA },
    { x: 1050, y: 420 + Math.cos(world.time * 0.04) * 24, r: 340, color: PALETTE.nebulaB },
    { x: 700, y: 90, r: 220, color: PALETTE.nebulaC },
  ];
  for (const nebula of nebulas) {
    const radial = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
    radial.addColorStop(0, nebula.color);
    radial.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = radial;
    ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
  }
  ctx.globalAlpha = 1;

  // Parallax stars, twinkling.
  for (const star of world.pools.stars) {
    const alpha = 0.35 + 0.65 * Math.abs(Math.sin(star.twinkle));
    ctx.globalAlpha = alpha * (0.5 + star.layer * 0.25);
    ctx.fillStyle = star.layer === 2 ? '#cfe9ff' : '#ffffff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, world) {
  const player = world.player;
  if (!player.alive) return;
  if (player.invulnerable > 0 && Math.floor(world.time * 14) % 2 === 0) return; // blink while invulnerable
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);

  // Engine flame.
  const flame = 14 + Math.sin(world.time * 40) * 4 + player.thrust * 10;
  const flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flame);
  flameGrad.addColorStop(0, '#ffd94d');
  flameGrad.addColorStop(0.5, '#ff7a2e');
  flameGrad.addColorStop(1, 'rgba(255, 60, 60, 0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(0, 10 + flame);
  ctx.lineTo(6, 10);
  ctx.closePath();
  ctx.fill();

  // Hull: a sleek arrow ship.
  glow(ctx, PALETTE.player, 18);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(13, 12);
  ctx.lineTo(6, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-6, 8);
  ctx.lineTo(-13, 12);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);

  // Cockpit.
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.ellipse(0, -6, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shield ring.
  if (player.shield > 0) {
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(world.time * 6);
    ctx.strokeStyle = PALETTE.shield;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const color = { drone: PALETTE.drone, weaver: PALETTE.weaver, shooter: PALETTE.shooter, tank: PALETTE.tank }[enemy.kind];
  glow(ctx, color, 16);
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (enemy.kind === 'drone') {
    // Dart.
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-14, -10);
    ctx.lineTo(0, -4);
    ctx.lineTo(14, -10);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'weaver') {
    // Diamond with wings.
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-22, -8 + Math.sin(time * 10 + enemy.phase) * 4);
    ctx.moveTo(12, 0);
    ctx.lineTo(22, -8 + Math.cos(time * 10 + enemy.phase) * 4);
    ctx.stroke();
  } else if (enemy.kind === 'shooter') {
    // Hex gunship.
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      const px = Math.cos(a) * 17;
      const py = Math.sin(a) * 17;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a0a2e';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Tank: heavy ringed cruiser.
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  noGlow(ctx);
  // Hit-point pips for tough enemies.
  if (enemy.maxHp > 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const width = 36;
    ctx.fillRect(-width / 2, -enemy.radius - 12, width * (enemy.hp / enemy.maxHp), 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(-width / 2, -enemy.radius - 12, width, 3);
  }
  ctx.restore();
}

function drawBullets(ctx, world) {
  for (const bullet of world.pools.bullets) {
    glow(ctx, PALETTE.bullet, 10);
    ctx.strokeStyle = PALETTE.bullet;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
    ctx.stroke();
    noGlow(ctx);
  }
  for (const bullet of world.pools.enemyBullets) {
    glow(ctx, PALETTE.enemyBullet, 12);
    ctx.fillStyle = PALETTE.enemyBullet;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    noGlow(ctx);
  }
}

const POWERUP_LABEL = { spread: 'S', rapid: 'R', shield: 'H', life: '+1' };
const POWERUP_COLOR = { spread: PALETTE.spread, rapid: PALETTE.rapid, shield: PALETTE.shield, life: PALETTE.life };

function drawPowerups(ctx, world) {
  for (const power of world.pools.powerups) {
    const color = POWERUP_COLOR[power.kind];
    const bob = Math.sin(power.bob) * 3;
    ctx.save();
    ctx.translate(power.x, power.y + bob);
    glow(ctx, color, 14);
    ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, power.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    noGlow(ctx);
    ctx.fillStyle = color;
    ctx.font = `bold ${power.kind === 'life' ? 13 : 16}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_LABEL[power.kind], 0, 1);
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  for (const particle of world.pools.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of world.pools.floaters) {
    const age = 1 - floater.life / floater.maxLife;
    ctx.globalAlpha = Math.max(0, 1 - age);
    ctx.fillStyle = floater.color;
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(floater.text, floater.x, floater.y - age * 34);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  const pad = 18;
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('SCORE', pad, 30);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(String(world.score).padStart(6, '0'), pad, 60);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(`BEST  ${Math.max(world.best, world.score)}`, pad, 82);

  // Wave, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`WAVE ${Math.max(1, world.wave)}`, FIELD.width / 2, 34);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  const remaining = world.toSpawn.length + world.pools.enemies.length;
  ctx.fillText(world.waveState === 'fighting' || world.waveState === 'spawning' ? `${remaining} HOSTILES LEFT` : '—', FIELD.width / 2, 56);

  // Lives and bombs, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('SHIPS', FIELD.width - pad, 30);
  for (let i = 0; i < world.lives; i += 1) {
    const x = FIELD.width - pad - 12 - i * 26;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x + 9, 62);
    ctx.lineTo(x, 57);
    ctx.lineTo(x - 9, 62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('BOMBS  [SPACE]', FIELD.width - pad, 82);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText('●'.repeat(Math.max(0, world.player.bombs)) || '—', FIELD.width - pad, 102);

  // Combo meter, under the score.
  if (world.comboStep > 1) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`COMBO x${world.comboStep}`, pad, 112);
  }

  // Active power-up timers, bottom left.
  const timers = [];
  if (world.player.spreadTimer > 0) timers.push(['SPREAD', world.player.spreadTimer, PALETTE.spread]);
  if (world.player.rapidTimer > 0) timers.push(['RAPID', world.player.rapidTimer, PALETTE.rapid]);
  if (world.player.shield > 0) timers.push(['SHIELD', world.player.shield, PALETTE.shield]);
  ctx.textAlign = 'left';
  timers.forEach(([label, seconds, color], i) => {
    const y = FIELD.height - 18 - i * 22;
    ctx.fillStyle = color;
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`${label} ${Math.ceil(seconds)}s`, pad, y);
  });

  // Wave banner.
  if (world.banner) {
    const alpha = Math.min(1, world.banner.timer);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    glow(ctx, PALETTE.gold, 22);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 54px ${FONT}`;
    ctx.fillText(world.banner.text, FIELD.width / 2, FIELD.height / 2 - 90);
    noGlow(ctx);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    ctx.fillText(world.banner.sub, FIELD.width / 2, FIELD.height / 2 - 52);
    ctx.globalAlpha = 1;
  }
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = 'rgba(120, 180, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 16);
  ctx.fill();
  ctx.stroke();
}

function drawTitle(ctx, world) {
  // A few decorative drones drifting across the title.
  for (const enemy of world.pools.enemies) drawEnemy(ctx, enemy, world.time);
  panel(ctx, FIELD.width / 2 - 330, 150, 660, 380);
  ctx.textAlign = 'center';
  glow(ctx, PALETTE.player, 26);
  ctx.fillStyle = PALETTE.player;
  ctx.font = `bold 84px ${FONT}`;
  ctx.fillText('NEON VOID', FIELD.width / 2, 250);
  noGlow(ctx);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `600 21px ${FONT}`;
  ctx.fillText('— A NEON SPACE SHOOTER —', FIELD.width / 2, 292);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `18px ${FONT}`;
  ctx.fillText('Blast the swarm. Chain kills for combo multipliers.', FIELD.width / 2, 340);
  ctx.fillText('Grab S / R / H power-ups. Spend bombs to clear the sky.', FIELD.width / 2, 368);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `16px ${FONT}`;
  ctx.fillText('MOVE  WASD / ARROWS / MOUSE      FIRE  AUTO      BOMB  SPACE / CLICK', FIELD.width / 2, 420);
  ctx.fillText('PAUSE  P      MUTE  M', FIELD.width / 2, 446);
  if (world.best > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`BEST SCORE  ${world.best}`, FIELD.width / 2, 484);
  }
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.player;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('▶  CLICK OR PRESS ENTER TO LAUNCH', FIELD.width / 2, 512);
  ctx.globalAlpha = 1;
}

function drawGameOver(ctx, world) {
  panel(ctx, FIELD.width / 2 - 330, 150, 660, 380);
  ctx.textAlign = 'center';
  glow(ctx, PALETTE.drone, 24);
  ctx.fillStyle = PALETTE.drone;
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText('MISSION FAILED', FIELD.width / 2, 248);
  noGlow(ctx);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  ctx.fillText(`You reached wave ${world.wave} and destroyed ${world.kills} hostiles.`, FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(`SCORE  ${world.score}`, FIELD.width / 2, 366);
  if (world.score >= world.best && world.score > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('★ NEW BEST SCORE ★', FIELD.width / 2, 404);
  } else {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.fillText(`BEST  ${world.best}`, FIELD.width / 2, 404);
  }
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.player;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 470);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3, 5, 15, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `20px ${FONT}`;
  ctx.fillText('Press P to resume', FIELD.width / 2, FIELD.height / 2 + 30);
}

/** Draw one frame. `screen` is one of SCREEN_TITLE / SCREEN_PLAY / SCREEN_OVER. */
export function render(ctx, world, screen) {
  ctx.save();
  if (world.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackdrop(ctx, world);
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
  } else {
    drawPowerups(ctx, world);
    for (const enemy of world.pools.enemies) drawEnemy(ctx, enemy, world.time);
    drawBullets(ctx, world);
    drawPlayer(ctx, world);
    drawParticles(ctx, world);
    drawFloaters(ctx, world);
    drawHud(ctx, world);
    if (screen === SCREEN_OVER) drawGameOver(ctx, world);
    if (world.paused) drawPaused(ctx);
  }
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(190, 230, 255, ${world.flash * 0.55})`;
    ctx.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
  }
  ctx.restore();
}
