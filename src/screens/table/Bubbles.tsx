import { useEffect, useReducer, useRef, useState } from 'react';
import { BEFORE_MOVE, botSay, ChatLane, quickSay, REACTIONS, reactionBeats, reactionText, ticker, widestWindow, windowAt, worthKeeping, worthSaying, type Game, type Message, type Seat, type Talk } from '../../game';
import { react, useApp } from '../../state/store';
import { chips } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { ChatIcon } from '../../ui/Icons';
import { playSound } from '../../ui/sound';

/** What a player's last move says in their speech bubble: "Call 150", "Fold". */
export function bubbleText(last: NonNullable<Seat['last']>): string {
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
    >
      {text}
    </span>
  );
}

/**
 * What each seat is saying: the bots' lines come out as short messages, one after another with a moment of
 * typing dots in front of each, and answer each other (see ChatLane in the game folder for the timing).
 * A seat's messages go when its next move takes over its bubble, or a few seconds after the last one.
 */
export function useReactions(game: Game, canShow: { current: (id: string) => boolean }): { say: Record<string, Talk>; quiet: Record<string, string> } {
  const laneRef = useRef<ChatLane | null>(null);
  laneRef.current ??= new ChatLane();
  const chat = laneRef.current;
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  // When a seat's messages run their course, the move they covered stays hidden: otherwise the bubble
  // goes back to "Bet 175" and it looks like the player bet again. A new move shows as normal.
  const [quiet, setQuiet] = useState<Record<string, string>>({});
  const talkOn = useApp((s) => s.talk);
  const talkRef = useRef(talkOn);
  talkRef.current = talkOn;
  const gameRef = useRef(game);
  gameRef.current = game;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Moves the conversation along to now, then wakes up again when something next changes.
  const run = useRef(() => {});
  run.current = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const now = Date.now();
    const changed = chat.advance(now);
    for (const who of chat.takeRetired()) {
      const g = gameRef.current;
      const seat = g.hand?.seats.find((x) => x.playerId === who);
      if (g.hand && seat?.last) setQuiet((q) => ({ ...q, [who]: moveSig(g.hand!.number, seat.last) }));
    }
    if (changed) redraw();
    const due = chat.nextDue(now);
    if (due !== null) timer.current = setTimeout(() => run.current(), Math.max(8, due - now));
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // A new move replaces whatever that player was saying.
  const moves = (game.hand?.seats ?? [])
    .map((x) => `${x.playerId}:${game.hand!.number}:${x.last ? `${x.last.move}-${x.last.amount ?? ''}-${x.last.street ?? ''}` : ''}`)
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
    if (!changed.length) return;
    // Lines about the move that was just made are stale now.
    for (const id of changed) chat.clear(id, (q) => BEFORE_MOVE.has(q.event));
    redraw();
    run.current();
  }, [moves]);

  // The moment the table is at: this hand, how many cards are out, whether the pot has been awarded.
  // A line said before the outcome ("c'mon!") is about that moment, so it's dropped when the moment passes;
  // any other line is dropped once its hand is over.
  const moment = `${game.hand?.number ?? 0}-${game.hand?.board.length ?? 0}-${game.hand?.result ? 'over' : 'live'}`;
  const momentRef = useRef(moment);
  momentRef.current = moment;
  useEffect(() => {
    chat.retain(worthSaying(moment), worthKeeping(moment));
    redraw();
    run.current();
  }, [moment]);

  // What's said arrives as a new line id for that player; whatever was said before you arrived stays unsaid.
  const seen = useRef<Record<string, number> | null>(null);
  const reactions = game.reactions;
  useEffect(() => {
    const now = reactions ?? {};
    if (seen.current === null) {
      seen.current = Object.fromEntries(Object.entries(now).map(([id, r]) => [id, r.n]));
      return;
    }
    const at = Date.now();
    for (const [who, r] of Object.entries(now)) {
      if (seen.current[who] === r.n) continue;
      seen.current[who] = r.n;
      if (!r.id.startsWith('b:')) {
        // People's quick messages come straight out, with a pop.
        chat.push(quickSay({ who, lineId: r.id, n: r.n, text: reactionText(r.id), at, moment: momentRef.current }));
        playSound('pop');
        continue;
      }
      // Bot talk is switched off on this phone: nothing is queued or shown. Nor is anything said by someone who
      // can't be seen (a player out of the row, with someone else on turn): it would only hold up the others.
      if (!talkRef.current || !canShow.current(who)) continue;
      const name = gameRef.current.players.find((p) => p.id === r.to)?.name;
      chat.push(botSay({ who, lineId: r.id, n: r.n, beats: reactionBeats(r.id, name), at, moment: momentRef.current, sig: lastMoves.current[who] ?? '', luck: Math.random() }));
    }
    run.current();
  }, [reactions]);

  const say: Record<string, Talk> = {};
  const now = Date.now();
  for (const p of game.players) {
    const talk = chat.talk(p.id, now);
    if (talk) say[p.id] = talk;
  }
  return { say, quiet };
}

/** Which move a seat's bubble is showing, so it can be told apart from the next one. */
export const moveSig = (hand: number, last: NonNullable<Seat['last']> | null) => (last ? `${hand}:${last.move}-${last.amount ?? ''}-${last.street ?? ''}` : '');

const emojiOnly = (text: string) => !/[A-Za-z]/.test(text);

/**
 * A line, said the way a game character says it: the words come through the bubble a few at a time, each one
 * sliding in at the end as the oldest slides away, then the last words hold a moment and the bubble goes. The
 * bubble is as wide as the widest few words from the start, so it never changes size or reaches into a neighbour.
 */
function Ticker({ text, until }: { text: string; until: number }) {
  const { words, at } = ticker(text);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t0 = Date.now();
    const timers = at.slice(1).map((ms, i) => setTimeout(() => setShown(i + 1), Math.max(0, ms - (Date.now() - t0))));
    // A moment before the lane takes the bubble down, it fades.
    const out = setTimeout(() => setLeaving(true), Math.max(0, until - t0 - 260));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(out);
    };
  }, []);
  const [first, last] = windowAt(words, shown);
  return (
    <span className={`bubble bubble-grey bubble-react bubble-ticker pop${leaving ? ' bubble-leaving' : ''}`} aria-label={text}>
      <span className="tk-size" aria-hidden>
        {widestWindow(words)}
      </span>
      <span className="tk-words" aria-hidden>
        {words.slice(0, last + 1).map((w, i) => (
          <span key={i} className={`tk-word${i < first ? ' tk-gone' : ''}`}>
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * A seat's table talk, in the same bubble style as a move: the last couple of messages stacked, newest at
 * the bottom nearest the face, and the typing dots under them while the next one is on its way.
 */
export function Thread({ talk }: { talk: Talk }) {
  // One bubble per seat, so nothing stacks or reaches into a neighbour: the newest message (or the dots) is all there is.
  const items: (Message | null)[] = [...talk.shown, ...(talk.typing ? [null] : [])].slice(-1);
  return (
    <span className="thread" role="status" aria-live="polite">
      {items.map((m, i) =>
        m?.rolling ? (
          <Ticker key={m.key} text={m.text} until={m.until} />
        ) : m ? (
          <span key={m.key} className={`bubble bubble-grey bubble-react pop${emojiOnly(m.text) ? ' bubble-emoji' : ''}${i < items.length - 1 ? ' bubble-older' : ''}`}>
            {m.text}
          </span>
        ) : (
          <span key="typing" className="bubble bubble-grey bubble-typing pop" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ),
      )}
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
    setTimeout(() => setCooling(false), 1800);
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
