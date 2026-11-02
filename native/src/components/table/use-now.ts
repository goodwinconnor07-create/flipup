import { useEffect, useState } from 'react';

import { toTableTime } from '@/engine';

/** The time, ticking every `every` ms while mounted, for countdowns. */
export function useNow(every = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

/** The time as a table sees it: a fast bots-only table's clock runs at twice the speed (toTableTime in the engine). */
export function useTableNow(fast: boolean | undefined, every = 250): number {
  return toTableTime(useNow(every), fast);
}
