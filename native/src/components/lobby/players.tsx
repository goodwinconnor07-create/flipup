import { useState } from 'react';
import { View } from 'react-native';

import { MAX_SEATS } from '@/engine';
import { ROUNDED, spacing, useShadows } from '@/theme';

import { PANEL_RADIUS, usePanel } from '../grouped-list';
import type { LabBot } from '@/state/bot-lab';

import { FloatTable } from '../setup/float-table';
import { ThemedText } from '../themed-text';

export interface PlayerLine {
  key: string;
  name: string;
  emoji: string;
  /** Who they are: You · Host, Bot, Ready, Offline. Read out by VoiceOver; bots are told apart by it. */
  line: string;
  you?: boolean;
  /** A Premium player's gold name. */
  gold?: boolean;
  /** A tap on a person: their menu (Report, Block, and the host's Remove). */
  onMore?: () => void;
  /** A bot the host may take off: its menu's Remove pops it out, then this runs. */
  onRemove?: () => void;
  /** Swaps this bot for another random one (offered in its menu while set). */
  onSwap?: () => void;
}

/**
 * Who's at the table, as the same small floating group as Play with bots (12 Nov 2026, the owner's ask): every face
 * in a filled circle with its name, evenly spaced, drifting softly, with an Add Bot button the same size at the end
 * for the host. People come first and wear a solid white ring (you, gold); bots follow with a faint one. A tap or a
 * long press opens a person's menu, or a bot's (Remove, and Swap where the page can). Friends come in with the game code.
 */
export function Players({ rows, onAdd, onAddLab }: { rows: PlayerLine[]; onAdd?: () => void; /** Seats a Bot Lab bot; the Add button then opens the add menu. */ onAddLab?: (bot: LabBot) => void }) {
  const panel = usePanel();
  const shadows = useShadows();
  // Bots on their way out: still drawn while they pop out, then their `onRemove` runs.
  const [leaving, setLeaving] = useState<string[]>([]);
  const people = rows.filter((r) => r.line !== 'Bot').length;
  const bots = rows.length - people;
  const room = MAX_SEATS - rows.length;
  // People always come first (you at the front), then the bots, each group in the order they sat down.
  const rank = (r: PlayerLine) => (r.you ? 0 : r.line === 'Bot' ? 2 : 1);
  const ordered = rows.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map((x) => x.r);
  const detail = [`${people} ${people === 1 ? 'person' : 'people'}`, bots ? `${bots} ${bots === 1 ? 'bot' : 'bots'}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          Players
        </ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel">
          {detail}
        </ThemedText>
      </View>
      <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', boxShadow: shadows.card }}>
        <View
          style={{
            borderRadius: PANEL_RADIUS,
            borderCurve: 'continuous',
            backgroundColor: panel.fill,
            borderWidth: 1,
            borderColor: panel.edge,
            overflow: 'hidden',
            paddingHorizontal: spacing.sm,
            paddingTop: spacing.xs,
            paddingBottom: spacing.xs,
          }}
        >
          <FloatTable
            seats={ordered.map((r) => ({
              key: r.key,
              emoji: r.emoji,
              name: r.name,
              you: r.you,
              gold: r.gold,
              person: !r.you && r.line !== 'Bot',
              removable: !!r.onRemove,
              onPress: r.onRemove || r.you ? undefined : r.onMore,
              leaving: leaving.includes(r.key),
            }))}
            canRemove
            onHold={(key) => setLeaving((l) => (l.includes(key) ? l : [...l, key]))}
            onGone={(key) => {
              setLeaving((l) => l.filter((k) => k !== key));
              rows.find((r) => r.key === key)?.onRemove?.();
            }}
            onSwap={rows.some((r) => r.onSwap) ? (key) => rows.find((r) => r.key === key)?.onSwap?.() : undefined}
            onAdd={onAdd && room > 0 ? onAdd : undefined}
            onAddLab={onAdd && room > 0 ? onAddLab : undefined}
          />
        </View>
      </View>
    </View>
  );
}
