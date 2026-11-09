import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { variantOf, type Game } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePlainColors } from '@/theme';

import { bubbleOut, bubblePop } from './bubbles';
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
function useGhostTalk(game: Game): string | null {
  const hand = game.hand;
  const [line, setLine] = useState<string | null>(null);
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
      setLine(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setLine(null), SHOW_MS);
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
  return line;
}

/**
 * Ghost Hold'em's ghost, locked in at the left end of the seat row behind a divider while the other players cycle
 * past on the right of it. It has no chips and no turn: its face, its two cards (face down until a showdown) and,
 * every so often, a line of its own under them.
 */
export function GhostSeat({ game, compact = false }: { game: Game; compact?: boolean }) {
  const c = usePlainColors();
  const reduce = useReduceMotion();
  const line = useGhostTalk(game);
  const hand = game.hand;
  if (variantOf(game) !== 'ghost') return null;
  const shown = hand?.result?.ghost ?? null;
  const cards = shown?.cards ?? hand?.ghost ?? [null, null];
  return (
    <View accessibilityLabel="The ghost" style={{ width: 66, alignItems: 'center', zIndex: 5 }}>
      <View style={{ width: compact ? 48 : 56, height: compact ? 40 : 54, alignItems: 'center', justifyContent: 'center' }}>
        <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: compact ? 34 : 46 }}>
          👻
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: '600', color: c.label }}>
        Ghost
      </Text>
      {/* No chips: the ghost only holds cards. */}
      <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
        {cards.map((card, i) => (card ? <PlayingCard key={card} card={card} size="sm" flip /> : <PlayingCard key={i} back size="sm" />))}
      </View>
      {shown && (
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ marginTop: 3, fontSize: 11, fontWeight: '600', color: c.secondaryLabel }}>
          {shown.name}
        </Text>
      )}
      {line && (
        <Animated.View
          key={line}
          entering={reduce ? FadeIn.duration(150) : bubblePop}
          exiting={bubbleOut}
          pointerEvents="none"
          style={{ position: 'absolute', top: compact ? 112 : 130, left: 0, maxWidth: 190 }}
        >
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: c.cell, borderWidth: 1, borderColor: c.separator }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: '600', color: c.label }}>
              {line}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** The barrier between the ghost and the players who cycle past: a thin rounded line the height of the seats. */
export function GhostDivider({ compact = false }: { compact?: boolean }) {
  const c = usePlainColors();
  return <View accessible={false} style={{ width: 3, height: compact ? 96 : 118, marginHorizontal: 5, marginTop: 2, borderRadius: 2, backgroundColor: c.separator }} />;
}
