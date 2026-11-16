// A tiny seeded RNG (mulberry32) so the screenshot scenes are the same
// frame every run for a given seed, while real play stays unpredictable.

/** Make a random function seeded by a 32-bit integer. */
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `items` using `random`. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** A number in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}
