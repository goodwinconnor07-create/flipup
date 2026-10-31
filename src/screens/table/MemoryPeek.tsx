// Memory Poker: the 20 cards taken out of the deck, on the felt where the board goes, until the hand is dealt.

import { rankOf, suitOf, type Card, type Game } from '../../game';
import { toTableTime } from '../../state/clock';
import { PlayingCard, useNow } from '../../ui/components';

const SUIT_ORDER = 's h d c';

/** Sorted by suit, then high to low, so the gaps are easier to take in at a glance. */
const sorted = (cards: Card[]) => [...cards].sort((a, b) => SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b)) || rankOf(b) - rankOf(a));

export function MemoryPeek({ game, pack }: { game: Game; pack?: string }) {
  const cards = game.memory?.cards ?? [];
  return (
    <div className="memory-peek pop" role="img" aria-label={`Cards taken out: ${cards.join(' ')}`}>
      {sorted(cards).map((c, i) => (
        <PlayingCard key={c} card={c} size="sm" flip delay={i * 25} pack={pack} />
      ))}
    </div>
  );
}

/** "Remember them · 6s" under the cards. */
export function MemoryCountdown({ game }: { game: Game }) {
  const now = toTableTime(useNow(250), game.fast);
  const secs = Math.max(0, Math.ceil(((game.memory?.until ?? now) - now) / 1000));
  return <span className="hand-pill memory-count">🧠 Remember these 20 · {secs}s</span>;
}
