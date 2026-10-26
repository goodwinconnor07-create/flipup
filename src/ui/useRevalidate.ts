import { useEffect, useRef } from 'react';

/**
 * Stale-while-revalidate for a screen: the screen shows what it already has straight away, and this runs
 * `revalidate` in the background when it opens, when the window comes back into view, and when the phone gets its
 * connection back. A burst of those (focus and visibility fire together) runs it once. Only for data where a
 * slightly old copy costs nothing, like a friend's twin.
 */
export function useRevalidate(revalidate: () => unknown, minGapMs = 5000): void {
  const latest = useRef(revalidate);
  latest.current = revalidate;
  // Kept across remounts, so React's double-run of effects in development doesn't ask twice.
  const last = useRef(0);
  useEffect(() => {
    const run = () => {
      if (Date.now() - last.current < minGapMs) return;
      last.current = Date.now();
      void Promise.resolve(latest.current()).catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [minGapMs]);
}
