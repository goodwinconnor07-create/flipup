import { useEffect } from 'react';

/**
 * Keeps the screen on while `active`, so a phone doesn't dim and lock while you wait for your turn
 * (a locked phone times out and folds). The lock lets go whenever the page is hidden, so it's asked
 * for again when the page comes back. Does nothing where the browser doesn't have wake locks.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      try {
        const got = await navigator.wakeLock.request('screen');
        if (stopped) void got.release().catch(() => {});
        else lock = got;
      } catch {
        // Not allowed right now (low battery, hidden page): nothing to do.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
