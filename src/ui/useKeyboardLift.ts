import { useSyncExternalStore } from 'react';

/**
 * How many pixels the on-screen keyboard covers at the bottom of the screen. iOS Safari keeps the page
 * the same height and only shrinks the visual viewport, so fixed-bottom things hide under the keyboard.
 * Zero when no keyboard is up (or the browser already resizes the page for it).
 */
function subscribe(onChange: () => void): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener('resize', onChange);
  vv.addEventListener('scroll', onChange);
  return () => {
    vv.removeEventListener('resize', onChange);
    vv.removeEventListener('scroll', onChange);
  };
}

function keyboardHeight(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

export function useKeyboardLift(): number {
  return useSyncExternalStore(subscribe, keyboardHeight, () => 0);
}
