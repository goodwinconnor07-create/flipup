import { useSyncExternalStore } from 'react';

/** Computers and tablets in landscape. Phones (and phones on their side) keep the phone layout. Matches desktop.css. */
const QUERY = '(min-width: 960px) and (min-height: 600px)';

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * The desktop layout is designed for a 1440×900 window. Other sizes scale it (smaller laptops shrink
 * it, big monitors enlarge everything), through the --desk-zoom variable that desktop.css uses.
 */
export function installDesktopScale(): void {
  const apply = () => {
    const root = document.documentElement;
    if (!window.matchMedia(QUERY).matches) {
      root.style.removeProperty('--desk-zoom');
      return;
    }
    const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 900);
    root.style.setProperty('--desk-zoom', Math.max(0.66, Math.min(1.5, scale)).toFixed(3));
  };
  apply();
  window.addEventListener('resize', apply);
}
