import { useEffect, useState } from 'react';

/** The time, ticking every `every` ms while mounted, for countdowns. */
export function useNow(every = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}
