// What each seat is saying, as on the web (src/screens/table/Bubbles.tsx): the bots' lines come out one after
// another with a moment of typing dots in front of each, and answer each other. The timing is ChatLane's, shared
// with the web in src/game/chat.ts. A seat's messages go when its next move takes over its bubble.
import { useEffect, useReducer, useRef, useState } from 'react';

import {
  BEFORE_MOVE,
  botSay,
  ChatLane,
  quickSay,
  reactionBeats,
  reactionText,
  worthKeeping,
  worthSaying,
  type Game,
  type Seat,
  type Talk,
} from '@/engine';
import { useTalkOn } from '@/state/prefs';

import { playSound } from './sounds';

/** Which move a seat's bubble is showing, so it can be told apart from the next one. */
export const moveSig = (hand: number, last: NonNullable<Seat['last']> | null | undefined) =>
  last ? `${hand}:${last.move}-${last.amount ?? ''}-${last.street ?? ''}` : '';

/**
 * `canShow(id)` says whether a seat is on screen: a line from someone out of view would only hold up the rest.
 * `quiet` holds, per seat, the move whose talk has run its course: that move stays hidden rather than popping back.
 */
export function useReactions(game: Game, canShow: (id: string) => boolean): { say: Record<string, Talk>; quiet: Record<string, string> } {
  // One conversation for as long as the table is on screen.
  const [chat] = useState(() => new ChatLane());
  const [now, redraw] = useReducer((_previous: number, at: number) => at, 0);
  const [quiet, setQuiet] = useState<Record<string, string>>({});
  const talkOn = useTalkOn();
  const talkRef = useRef(talkOn);
  useEffect(() => {
    talkRef.current = talkOn;
  }, [talkOn]);
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  const canShowRef = useRef(canShow);
  useEffect(() => {
    canShowRef.current = canShow;
  }, [canShow]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Moves the conversation along to now, then wakes up again when something next changes.
  const run = useRef(() => {});
  useEffect(() => {
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
      if (changed) redraw(now);
      const due = chat.nextDue(now);
      if (due !== null) timer.current = setTimeout(() => run.current(), Math.max(8, due - now));
    };
  }, [chat]);
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
    for (const id of changed) chat.clear(id, (q) => BEFORE_MOVE.has(q.event));
    redraw(Date.now());
    run.current();
  }, [moves]); // eslint-disable-line react-hooks/exhaustive-deps

  // A line said before the outcome ("c'mon!") is dropped when its moment passes; any other once its hand is over.
  const moment = `${game.hand?.number ?? 0}-${game.hand?.board.length ?? 0}-${game.hand?.result ? 'over' : 'live'}`;
  const momentRef = useRef(moment);
  useEffect(() => {
    momentRef.current = moment;
  }, [moment]);
  useEffect(() => {
    chat.retain(worthSaying(moment), worthKeeping(moment));
    redraw(Date.now());
    run.current();
  }, [moment]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!talkRef.current || !canShowRef.current(who)) continue;
      const name = gameRef.current.players.find((p) => p.id === r.to)?.name;
      chat.push(
        botSay({
          who,
          lineId: r.id,
          n: r.n,
          beats: reactionBeats(r.id, name),
          at,
          moment: momentRef.current,
          sig: lastMoves.current[who] ?? '',
          luck: Math.random(),
        }),
      );
    }
    run.current();
  }, [reactions]); // eslint-disable-line react-hooks/exhaustive-deps

  const say: Record<string, Talk> = {};
  for (const p of game.players) {
    const talk = chat.talk(p.id, now);
    if (talk) say[p.id] = talk;
  }
  return { say, quiet };
}
