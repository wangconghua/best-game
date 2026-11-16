// NEON VOID — tuning, palette and field geometry. Every number the game
// balances on lives here so the other files only read it.
export const FIELD = { width: 1280, height: 720 };

// The simulation's fixed step, in seconds: 60 updates a second whatever
// the display's rate.
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 15,
  speed: 540,
  fireInterval: 0.14,
  rapidFireInterval: 0.07,
  bulletSpeed: 780,
  invulnerable: 2.0,
  shieldSeconds: 8,
  bombs: 3,
};

export const LIVES = 3;

// Enemy kinds. Each entry: hit points, score, radius, base speed and the
// wave it first appears in.
export const ENEMY = {
  drone:   { hp: 1, score: 100, radius: 16, speed: 150, firstWave: 1 },
  weaver:  { hp: 2, score: 150, radius: 17, speed: 185, firstWave: 2 },
  shooter: { hp: 2, score: 200, radius: 18, speed: 110, firstWave: 3 },
  tank:    { hp: 6, score: 500, radius: 30, speed: 62,  firstWave: 4 },
};

export const WAVE = {
  // Seconds of calm between waves, and how the spawn gap shrinks per wave.
  gapSeconds: 3.0,
  spawnInterval: 0.85,
  spawnScale: 0.93,
  minSpawnInterval: 0.28,
  // Enemies per wave: base + perWave * (wave - 1), capped.
  baseCount: 6,
  perWave: 3,
  maxCount: 34,
  clearBonus: 250,
};

export const POWERUP = {
  dropChance: 0.16,
  fallSpeed: 130,
  radius: 14,
  // Weighted kinds; life is rare.
  kinds: ['spread', 'rapid', 'shield', 'spread', 'rapid', 'shield', 'life'],
};

export const COMBO = {
  killsPerStep: 8,
  maxStep: 5,
};

export const PALETTE = {
  backdrop: '#05060f',
  nebulaA: '#1b0f3a',
  nebulaB: '#062a33',
  nebulaC: '#3a0f2e',
  player: '#4df3ff',
  playerCore: '#eafcff',
  bullet: '#8ff7ff',
  enemyBullet: '#ff5d7a',
  drone: '#ff4d6d',
  weaver: '#ffb02e',
  shooter: '#c86bff',
  tank: '#ff3d81',
  spread: '#4dff88',
  rapid: '#ffe14d',
  shield: '#4d8dff',
  life: '#ff6bd6',
  panel: 'rgba(10, 14, 34, 0.82)',
  text: '#eef4ff',
  muted: '#8b93b8',
  gold: '#ffd94d',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-void.best';
