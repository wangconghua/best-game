// Keyboard and mouse state. The game reads this, never the DOM directly,
// so the screenshot autopilot can drive the same fields.
export const KEYS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

export function createInput() {
  return {
    // Held keys, by code.
    keys: new Set(),
    // Last mouse position in logical field coordinates (null until moved).
    mouseX: null,
    mouseY: null,
    mouseMovedAt: -Infinity,
    // True for one update after a click or Space press (bomb).
    bombQueued: false,
    // True for one update after Enter / click on a menu (start / restart).
    confirmQueued: false,
    // True for one update after P (pause toggle) or M (mute toggle).
    pauseQueued: false,
    muteQueued: false,
    // True for one update after R (restart from game over).
    restartQueued: false,
  };
}

/** Attach DOM listeners that fill `input`; call once at boot. */
export function bindInput(input, canvas, toLogical) {
  addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(event.code);
    if (event.code === 'Space') input.bombQueued = true;
    if (event.code === 'Enter') input.confirmQueued = true;
    if (event.code === 'KeyP') input.pauseQueued = true;
    if (event.code === 'KeyM') input.muteQueued = true;
    if (event.code === 'KeyR') input.restartQueued = true;
  });
  addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  addEventListener('blur', () => {
    input.keys.clear();
  });
  canvas.addEventListener('mousemove', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.mouseMovedAt = performance.now();
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    const point = toLogical(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.mouseMovedAt = performance.now();
    input.confirmQueued = true;
    input.bombQueued = true;
  });
}

/** Clear the one-shot queues after the world consumed them. */
export function clearQueues(input) {
  input.bombQueued = false;
  input.confirmQueued = false;
  input.pauseQueued = false;
  input.muteQueued = false;
  input.restartQueued = false;
}
