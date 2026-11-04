import { useEffect, useRef } from 'react';
import { haptic } from './effects';

/** How far (after the drag's resistance) a pull has to go to refresh, and the most it shows. */
export const PULL_TRIGGER = 64;
const PULL_MAX = 96;

/**
 * Pull to refresh, the iPhone way, on the scrolling box that holds `marker`: at the top of the page, a drag down
 * opens the marker (a spinner row) with some resistance, ticks once when it's far enough, and refreshes on
 * release. The marker's height and `--pull` (0 to 1) are set directly, so a drag never re-renders React. Touch
 * only; a computer has no drag to pull with.
 */
export function usePullToRefresh(onRefresh: () => void) {
  const marker = useRef<HTMLDivElement>(null);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  useEffect(() => {
    const el = marker.current;
    const scroller = el?.closest<HTMLElement>('.home-sheet');
    if (!el || !scroller) return;
    let startY: number | null = null;
    let pull = 0;
    let armed = false;

    const show = (px: number) => {
      pull = px;
      el.style.height = `${px}px`;
      el.style.setProperty('--pull', String(Math.min(1, px / PULL_TRIGGER)));
    };
    const start = (e: TouchEvent) => {
      startY = scroller.scrollTop <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
      armed = false;
    };
    const move = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || scroller.scrollTop > 0) {
        if (pull) show(0);
        return;
      }
      // The page itself doesn't bounce while the spinner opens.
      e.preventDefault();
      el.classList.add('pulling');
      show(Math.min(PULL_MAX, dy * 0.5));
      if (!armed && pull >= PULL_TRIGGER) {
        armed = true;
        haptic('light');
      } else if (armed && pull < PULL_TRIGGER) armed = false;
    };
    const end = () => {
      if (startY === null) return;
      startY = null;
      el.classList.remove('pulling');
      show(0);
      if (armed) refresh.current();
      armed = false;
    };

    scroller.addEventListener('touchstart', start, { passive: true });
    scroller.addEventListener('touchmove', move, { passive: false });
    scroller.addEventListener('touchend', end);
    scroller.addEventListener('touchcancel', end);
    return () => {
      scroller.removeEventListener('touchstart', start);
      scroller.removeEventListener('touchmove', move);
      scroller.removeEventListener('touchend', end);
      scroller.removeEventListener('touchcancel', end);
    };
  }, []);

  return marker;
}
