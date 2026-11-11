import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { addedLine, balancedBotPool, botFace, BOTS, lineBeats, sayAndReadMs, type Message } from '@/engine';
<<<<<<< HEAD
=======
import { knownBots } from '@/state/table-feel';
>>>>>>> origin/main
import { useColors } from '@/theme';

import { AddFace, BotPill, BUBBLE_ROOM, Face, FaceBubble, FaceRow } from './faces';
import { SetupRowTitle } from './setup-header';

/** A bot in the row. `greet` is its first word, said once a moment after it sits down. */
export interface RowBot {
  key: string;
  name: string;
  emoji: string;
  greet?: string;
}

/**
 * Slot 2 of Play with friends, and the lobby's second row: the bots. Same faces as the friends row, each with a
 * small BOT pill on its bottom edge, then a circle with a plus that sits a random bot down, until the table is
 * full. A tap on a bot takes it off. A bot that has just sat down says something a moment later in a bubble over
 * its face; the bubble never gets in the way of a tap.
 */
export function BotsRow({
  bots,
  canAdd,
  onAdd,
  onRemove,
  detail,
  hideTitle,
}: {
  bots: RowBot[];
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (bot: RowBot) => void;
  detail?: string;
  /** Inside a card that has its own heading (Play with bots). */
  hideTitle?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 4 }}>
      {!hideTitle && <SetupRowTitle big title="Bots" detail={detail ?? (bots.length ? 'Tap a bot to take it off' : 'Fill the seats your friends leave')} />}
      <FaceRow top={BUBBLE_ROOM}>
        {bots.map((b) => (
          <BotFace key={b.key} bot={b} onRemove={() => onRemove(b)} />
        ))}
        {canAdd && <AddFace label="Add a bot" name={bots.length ? 'Add' : 'Add a bot'} tint={colors.accent as string} onPress={onAdd} />}
      </FaceRow>
    </View>
  );
}

/** When a new bot speaks: typing dots almost at once, its line 0.8 to 1.5s after it sat down. */
const TYPE_AT = 250;
const SAY_MIN = 800;
const SAY_SPREAD = 700;

function BotFace({ bot, onRemove }: { bot: RowBot; onRemove: () => void }) {
  const [say, setSay] = useState<{ typing: boolean; message: Message | null } | null>(null);
  useEffect(() => {
    const text = bot.greet;
    if (!text) return;
    const at = SAY_MIN + Math.random() * SAY_SPREAD;
    const lasts = sayAndReadMs(lineBeats(text));
    const message: Message = { key: `${bot.key}:hi`, text, at, until: at + lasts, event: 'addedToTable', moment: 'setup', rolling: true };
    const timers = [
      setTimeout(() => setSay({ typing: true, message: null }), TYPE_AT),
      setTimeout(() => setSay({ typing: false, message }), at),
      setTimeout(() => setSay(null), at + lasts),
    ];
    return () => timers.forEach(clearTimeout);
  }, [bot.greet]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Face
      emoji={bot.emoji}
      name={bot.name}
      label={`${bot.name}, bot. Tap to take it off the table`}
      onPress={onRemove}
      pill={<BotPill />}
      bubble={say ? <FaceBubble say={say} /> : undefined}
    />
  );
}

/**
 * A random bot for the row: one from `BOTS` nobody has picked yet, with a face nobody at the table has (always the
 * bot face, never a picker emoji), and the line it says on sitting down, to `you` by name.
 */
export function randomBot(have: { name: string; emoji: string }[], you: string | undefined): RowBot | null {
  const names = new Set(have.map((b) => b.name.toLowerCase()));
  const faces = new Set(have.map((b) => b.emoji));
  const free = BOTS.filter((b) => !names.has(b.name.toLowerCase()));
  const fresh = free.filter((b) => !faces.has(botFace(b.emoji)));
  const pool = balancedBotPool(fresh.length ? fresh : free, have);
  if (!pool.length) return null;
  // Now and then a bot you've played before sits down again, so the regulars become people you know.
  const known = new Set(knownBots());
  const old = pool.filter((b) => known.has(b.name.toLowerCase()));
  const pick = old.length && Math.random() < 0.35 ? old[Math.floor(Math.random() * old.length)] : pool[Math.floor(Math.random() * pool.length)];
  return { key: `${pick.name}:${Date.now()}`, name: pick.name, emoji: botFace(pick.emoji), greet: addedLine(pick.style, you, Math.random).text };
}
