// Synthesised sound effects through WebAudio: no audio files, no network.
// The context is created lazily on the first user gesture (browsers forbid
// audio before one); screenshot runs never gesture, so they stay silent.

let context = null;
let muted = false;

function ensureContext() {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return context;
  }
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return null;
  context = new AudioContext();
  return context;
}

/** Call from a user gesture so later sounds are allowed. */
export function unlockAudio() {
  ensureContext();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

/** A short oscillator blip sliding from `fromHz` to `toHz`. */
function blip(fromHz, toHz, seconds, type, gainValue, delay = 0) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(fromHz, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), start + seconds);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.02);
}

/** Filtered noise burst, for explosions. */
function noise(seconds, gainValue, cutoffHz, delay = 0) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoffHz;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(start);
}

export const sfx = {
  shoot() { blip(880, 320, 0.09, 'square', 0.05); },
  enemyShoot() { blip(320, 180, 0.12, 'sawtooth', 0.04); },
  explosion(big = false) {
    noise(big ? 0.5 : 0.28, big ? 0.35 : 0.2, big ? 900 : 1400);
    blip(big ? 160 : 220, 40, big ? 0.45 : 0.25, 'sine', 0.25);
  },
  hit() { blip(200, 60, 0.18, 'sawtooth', 0.2); noise(0.12, 0.12, 2000); },
  powerup() { blip(520, 780, 0.09, 'sine', 0.16); blip(780, 1170, 0.12, 'sine', 0.16, 0.09); },
  bomb() { noise(0.7, 0.4, 600); blip(90, 30, 0.6, 'sine', 0.3); },
  wave() { blip(440, 660, 0.12, 'triangle', 0.14); blip(660, 880, 0.14, 'triangle', 0.14, 0.12); },
  gameOver() {
    blip(392, 392, 0.22, 'triangle', 0.18);
    blip(311, 311, 0.22, 'triangle', 0.18, 0.22);
    blip(233, 180, 0.5, 'triangle', 0.18, 0.44);
  },
};
