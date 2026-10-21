import { useEffect, useRef, useState } from 'react';
import { REACTIONS, reactionText, type Game, type Seat } from '../../game';
import { react } from '../../state/store';
import { chips } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { ChatIcon } from '../../ui/Icons';
import { playSound } from '../../ui/sound';

/** What a player's last move says in their speech bubble: "Call 150", "Fold". */
function bubbleText(last: NonNullable<Seat['last']>): string {
  const n = chips(last.amount);
  switch (last.move) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return `Call ${n}`;
    case 'bet':
      return `Bet ${n}`;
    case 'raise':
      return `Raise ${n}`;
    case 'allin':
      return `All in ${n}`;
    case 'sb':
      return `SB ${n}`;
    default:
      return `BB ${n}`;
  }
}

/** An iMessage-style bubble: blue for chips going in, grey for check and fold. */
export function Bubble({ last, street }: { last: NonNullable<Seat['last']>; street?: string }) {
  const text = bubbleText(last);
  const money = last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  // Keyed on the text, so every new move pops in.
  return (
    <span
      key={text}
      className={`bubble pop ${money ? 'bubble-blue' : 'bubble-grey'}${street && last.street !== street ? ' bubble-old' : ''}`}
      role="status"
    >
      {text}
    </span>
  );
}

/**
 * Each player's latest message (a quick message, or a bot's table talk), shown for a few seconds
 * after it arrives, or until that player's next move takes over their bubble.
 */
export function useReactions(game: Game): Record<string, string> {
  const seen = useRef<Record<string, number> | null>(null);
  const [active, setActive] = useState<Record<string, string>>({});
  const reactions = game.reactions;
  // A new move replaces whatever that player was saying.
  const moves = (game.hand?.seats ?? [])
    .map((s) => `${s.playerId}:${game.hand!.number}:${s.last ? `${s.last.move}-${s.last.amount ?? ''}-${s.last.street ?? ''}` : ''}`)
    .join('|');
  const lastMoves = useRef<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const part of moves ? moves.split('|') : []) {
      const [id, ...rest] = part.split(':');
      next[id] = rest.join(':');
    }
    const changed = Object.keys(next).filter(
      (id) => lastMoves.current[id] !== undefined && lastMoves.current[id] !== next[id] && next[id].split(':')[1],
    );
    lastMoves.current = next;
    if (changed.length)
      setActive((a) => {
        const out = { ...a };
        for (const id of changed) delete out[id];
        return out;
      });
  }, [moves]);

  // The moment the table is at: this hand, how many cards are out, whether the pot has been awarded.
  // A line said before the outcome ("c'mon!") is about that moment, so it's dropped when the moment passes.
  const moment = `${game.hand?.number ?? 0}-${game.hand?.board.length ?? 0}-${game.hand?.result ? 'over' : 'live'}`;
  const momentRef = useRef(moment);
  momentRef.current = moment;
  useEffect(() => {
    setActive((a) => {
      const keep = Object.entries(a).filter(([, v]) => !PRE_OUTCOME.has(talkEvent(v)));
      return keep.length === Object.keys(a).length ? a : Object.fromEntries(keep);
    });
  }, [moment]);

  // Bots talk one at a time, so two long lines never sit on top of each other, and the lines that
  // react to how a hand ended wait a beat, as if the bot had just seen the cards turn.
  const queue = useRef<QueuedLine[]>([]);
  const busyUntil = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const pumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (pumpTimer.current) clearTimeout(pumpTimer.current);
    },
    [],
  );
  const pump = () => {
    if (pumpTimer.current) clearTimeout(pumpTimer.current);
    pumpTimer.current = null;
    // Lines from an earlier moment are no longer worth saying.
    queue.current = queue.current.filter((q) =>
      PRE_OUTCOME.has(q.event) ? q.moment === momentRef.current : q.moment.split('-')[0] === momentRef.current.split('-')[0],
    );
    const next = queue.current[0];
    if (!next) return;
    const wait = Math.max(next.notBefore, busyUntil.current) - Date.now();
    if (wait > 0) {
      pumpTimer.current = setTimeout(pump, wait);
      return;
    }
    queue.current.shift();
    const hold = Math.min(3600, 1800 + next.text.length * 55);
    busyUntil.current = Date.now() + hold;
    setActive((a) => ({ ...a, [next.id]: next.value }));
    later(
      () =>
        setActive((a) => {
          if (a[next.id] !== next.value) return a;
          const { [next.id]: _gone, ...rest } = a;
          return rest;
        }),
      hold,
    );
    if (queue.current.length) pumpTimer.current = setTimeout(pump, hold);
  };

  useEffect(() => {
    const now = reactions ?? {};
    if (seen.current === null) {
      // Whatever was said before you arrived stays unsaid.
      seen.current = Object.fromEntries(Object.entries(now).map(([id, r]) => [id, r.n]));
      return;
    }
    for (const [id, r] of Object.entries(now)) {
      if (seen.current[id] === r.n) continue;
      seen.current[id] = r.n;
      const value = `${r.id}|${r.n}|${r.to ?? ''}`;
      if (r.id.startsWith('b:')) {
        const event = talkEvent(value);
        // One line per bot waiting at a time: the newest.
        queue.current = queue.current.filter((q) => q.id !== id);
        queue.current.push({
          id,
          value,
          event,
          text: reactionText(r.id),
          moment: momentRef.current,
          notBefore: Date.now() + (POST_OUTCOME.has(event) ? 500 + Math.random() * 500 : 0),
        });
        // A long queue means the table has moved on: keep the latest few.
        if (queue.current.length > 3) queue.current.shift();
        pump();
        continue;
      }
      // People's quick messages come straight out, with a pop.
      setActive((a) => ({ ...a, [id]: value }));
      playSound('pop');
      later(
        () =>
          setActive((a) => {
            if (a[id] !== value) return a;
            const { [id]: _gone, ...rest } = a;
            return rest;
          }),
        4000,
      );
    }
  }, [reactions]);
  return active;
}

interface QueuedLine {
  id: string;
  value: string;
  event: string;
  text: string;
  moment: string;
  notBefore: number;
}

/** Bot lines said before a hand's outcome is known. They're dropped when the next card lands or the pot goes. */
const PRE_OUTCOME = new Set(['allin', 'sweat', 'sweatWatch']);

/** Bot lines that react to how a hand ended. */
const POST_OUTCOME = new Set([
  'sweatWin',
  'sweatLose',
  'watched',
  'badBeat',
  'bigWin',
  'win',
  'lostToYou',
  'bluffWon',
  'bluffCaught',
  'revenge',
  'tiltJab',
  'showBluff',
  'showStrong',
  'showFold',
]);

/** "b:friendly:sweat:2|7" → "sweat" */
const talkEvent = (value: string) => (value.startsWith('b:') ? value.split(':')[2] : '');

/** Something said at the table, in the same bubble style as a move. */
export function ReactBubble({ id: value, game }: { id: string; game: Game }) {
  const [id, n, to] = value.split('|');
  const text = reactionText(id, game.players.find((p) => p.id === to)?.name);
  const emoji = !/[A-Za-z]/.test(text);
  return (
    <span key={`${id}-${n}`} className={`bubble bubble-grey bubble-react pop${emoji ? ' bubble-emoji' : ''}`} role="status">
      {text}
    </span>
  );
}

/** Quick messages: a small button, and a small panel of phrases and emoji that closes as soon as you pick one. */
export function ReactMenu() {
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const send = (id: string) => {
    if (cooling) return;
    haptic('light');
    react(id);
    setOpen(false);
    setCooling(true);
    setTimeout(() => setCooling(false), 2500);
  };
  return (
    <>
      <button type="button" className="react-btn press" aria-label="Quick messages" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChatIcon />
      </button>
      {open && (
        <>
          <div className="react-scrim" onClick={() => setOpen(false)} />
          <div className="react-pop rise" role="menu" aria-label="Quick messages">
            {REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="menuitem"
                className={`react-item press${/[A-Za-z]/.test(r.text) ? '' : ' react-emoji'}`}
                disabled={cooling}
                onClick={() => send(r.id)}
              >
                {r.text}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
