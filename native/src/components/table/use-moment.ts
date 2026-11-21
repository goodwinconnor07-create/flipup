import { useEffect, useState } from 'react';

import { toTableTime, type Game } from '@/engine';

/**
 * The table's time, ticking every 100ms while a moment plays (a die, a red river, the ghost, the votes being
 * read out) and not at all otherwise. Screens hand it to `visibleBoard()` and friends.
 */
export function useMomentNow(game: Game): number {
  const moment = game.hand?.moment ?? null;
  const key = moment ? `${game.hand!.number}:${moment.kind}:${moment.at}` : '';
  const fast = game.fast;
  const [now, setNow] = useState(() => toTableTime(Date.now(), fast));
  useEffect(() => {
    if (!moment) return;
    const tick = () => {
      const t = toTableTime(Date.now(), fast);
      setNow(t);
      if (t >= moment.until + 150) clearInterval(id);
    };
    const id = setInterval(tick, 100);
    tick();
    return () => clearInterval(id);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return now;
}
