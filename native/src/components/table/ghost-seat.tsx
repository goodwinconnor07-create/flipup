import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { variantOf, type Game, type Talk } from '@/engine';
import { usePlainColors } from '@/theme';

import { pinned, Thread } from './bubbles';
import { PlayingCard } from './playing-card';

// What the ghost says, a line at a time and never the same one twice in a row. All of it is for fun, picked at
// random on the phone, so nothing here is ever sent anywhere.
const SAYS = {
  deal: ['Boo.', 'Evening, mortals.', 'Deal me in. Oh wait.', "I'm already holding. Good luck.", 'Cards are cold tonight.'],
  street: ['Interesting board…', "I've seen worse. Not much worse.", 'Ooh, that changes things.', 'Careful now.', 'Hmm. Hmm hmm hmm.'],
  allIn: ['U sure about that all in?', 'All in? Bold. Very bold.', "That's a lot of chips to hand me.", "Don't say I didn't warn you."],
  win: ['Mine. All mine.', 'Told you.', 'Thank you for the chips.', 'Boo-yah.'],
  lose: ['Fine. Take it.', "Beginner's luck.", 'I let you have that.', 'Hmph.'],
} as const;

/** How long a line stays up, and how long the ghost keeps quiet after one (so it never chatters). */
const SHOW_MS = 3200;
const QUIET_MS = 4500;

/**
 * Ghost Hold'em's ghost speaks now and then: at the deal, as the board comes down, when someone goes all in
 * (always) and at the showdown (always). Returns the line on show, or null.
 */
function useGhostTalk(game: Game): Talk | null {
  const hand = game.hand;
  const [talk, setTalk] = useState<Talk | null>(null);
  const last = useRef({ said: '', at: 0, number: -1, board: -1, allIn: 0, result: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const allIn = hand ? hand.seats.filter((s) => s.allIn && !s.folded).length : 0;
  const board = hand?.board.length ?? 0;
  const result = !!hand?.result;
  const kept = hand?.result?.ghost?.kept ?? 0;

  useEffect(() => {
    if (!hand) return;
    const l = last.current;
    const say = (pool: readonly string[], chance: number, force = false) => {
      const now = Date.now();
      if (!force && (Math.random() > chance || now - l.at < QUIET_MS)) return;
      const fresh = pool.filter((x) => x !== l.said);
      const text = fresh[Math.floor(Math.random() * fresh.length)] ?? pool[0];
      l.said = text;
      l.at = now;
      // Said the way a bot says it: typing dots first, then the words come through the bubble.
      setTalk({ shown: [], typing: true });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const at = Date.now();
        setTalk({ typing: false, shown: [{ key: `ghost-${at}`, text, at, until: at + SHOW_MS, event: 'ghost', moment: 'ghost', rolling: true, who: 'Ghost' }] });
        timer.current = setTimeout(() => setTalk(null), SHOW_MS);
      }, 800);
    };
    if (hand.number !== l.number) {
      // A new hand: start counting again, and sometimes say hello.
      l.number = hand.number;
      l.board = board;
      l.allIn = allIn;
      l.result = result;
      if (!result) say(SAYS.deal, 0.45);
      return;
    }
    if (result && !l.result) {
      l.result = true;
      if (hand.result?.showdown) say(kept ? SAYS.win : SAYS.lose, 0.7, true);
    } else if (!result && allIn > l.allIn) say(SAYS.allIn, 1, true);
    else if (!result && board > l.board) say(SAYS.street, 0.4);
    l.allIn = allIn;
    l.board = board;
  }, [hand?.number, board, allIn, result]); // eslint-disable-line react-hooks/exhaustive-deps
  return talk;
}

/**
 * Ghost Hold'em's ghost, locked in at the left end of the seat row behind a divider while the other players cycle
 * past on the right of it. It has no chips and no turn: its face, its two cards (face down until a showdown) and,
 * every so often, a line of its own under them.
 */
export function GhostSeat({ game, compact = false }: { game: Game; compact?: boolean }) {
  const c = usePlainColors();
  const talk = useGhostTalk(game);
  const hand = game.hand;
  if (variantOf(game) !== 'ghost') return null;
  const shown = hand?.result?.ghost ?? null;
  const cards = shown?.cards ?? hand?.ghost ?? [null, null];
  const holding = hand && !hand.result ? (hand.carry ?? 0) : (game.ghostPot ?? 0);
  const size = compact ? 15 : 17;
  // Laid out exactly like a bot's seat: bubble over the face, name, a line, then its cards.
  return (
    <View accessibilityLabel="The ghost" style={{ width: 70, alignItems: 'center', zIndex: 5 }}>
      <View style={{ width: compact ? 48 : 56, height: compact ? 40 : 54, alignItems: 'center', justifyContent: 'center' }}>
        <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: compact ? 34 : 46 }}>
          👻
        </Text>
        {/* The ghost sits at the left edge, so its bubble starts at the seat's left side and grows rightwards (centred, it would run off the screen). */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: compact ? 34 : 48, left: -7, width: 180, height: 0 }}>
          {talk && <Thread talk={talk} room={170} place={pinned('flex-start')} />}
        </View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: compact ? 13 : 15, lineHeight: compact ? 15 : 17, fontWeight: '700', color: c.tertiaryLabel }}>
        Ghost
      </Text>
      {/* What it holds (just the number, like a stack), so it fits the seat on the smallest phone. */}
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: '100%', fontSize: size, lineHeight: size + 1, fontWeight: '700', color: c.label }}>
        {holding && !shown ? Math.round(holding).toLocaleString('en-US') : ' '}
      </Text>
      <View style={{ alignItems: 'center', gap: 4, minHeight: 52, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row' }}>
          {cards.map((card, i) => (
            <View key={card ?? i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
              {card ? <PlayingCard card={card} size="sm" flip delay={i * 800} ghost /> : <PlayingCard back size="sm" ghost />}
            </View>
          ))}
        </View>
        {shown && (
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: '100%', fontSize: 11, fontWeight: '600', color: c.secondaryLabel }}>
            {shown.name}
          </Text>
        )}
      </View>
    </View>
  );
}

/** The barrier between the ghost and the players who cycle past: a thin rounded line the height of the seats. */
export function GhostDivider({ compact = false }: { compact?: boolean }) {
  const c = usePlainColors();
  return <View accessible={false} style={{ width: 3, height: compact ? 96 : 118, marginHorizontal: 5, marginTop: 2, borderRadius: 2, backgroundColor: c.separator }} />;
}
