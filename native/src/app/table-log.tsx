import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';

import { SUIT_COLOUR } from '@design/gameArt';
import { SheetScroll } from '@/components/sheet-scroll';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { cardsText, handLogText, rankLabel, suitOf, type Card } from '@/engine';
import { me as myDevice, useTable } from '@/state/session';
import { radius, spacing, useColors, useShadows } from '@/theme';

const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;

/** A log line with its cards ([Ah]) written as a rank and a suit in the deck's four colours. */
function CardLine({ text, bold, tone }: { text: string; bold?: boolean; tone?: string }) {
  const colors = useColors();
  const parts = text.split(/\[([2-9TJQKA][shdc])\]/);
  return (
    <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 15, lineHeight: 21, color: tone ?? colors.label, fontWeight: bold ? '700' : '400' }}>
      {parts.map((p, i) =>
        i % 2 ? (
          <Text key={i} style={{ fontWeight: '700', color: SUIT_COLOUR[SYMBOL[suitOf(p as Card)]] === '#16161d' ? colors.label : SUIT_COLOUR[SYMBOL[suitOf(p as Card)]] }}>
            {rankLabel(p as Card)}
            {SYMBOL[suitOf(p as Card)]}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

function HandBlock({ title, lines, mine, share }: { title: string; lines: string[]; mine?: string[]; share?: number }) {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <View style={{ gap: 4, padding: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card, backgroundColor: colors.cell }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
        <ThemedText variant="headline" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </ThemedText>
        {share !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share hand #${share}`}
            hitSlop={10}
            onPress={() => {
              haptic.tap();
              void Share.share({ message: handLogText(share, lines, mine) });
            }}
          >
            <Icon name="square.and.arrow.up" size={18} color={colors.accent} />
          </Pressable>
        )}
      </View>
      {mine && mine.length === 2 && <CardLine text={`Your hand: ${cardsText(mine)}`} bold />}
      {lines.slice(1).map((line, i) => (
        <CardLine key={i} text={line} bold={/^(Flop|Turn|River|Board):/.test(line)} tone={/ wins /.test(line) ? (colors.green as string) : undefined} />
      ))}
    </View>
  );
}

/** Every hand at this table, newest first, move by move. A finished hand can be shared as text. */
export default function TableLog() {
  const colors = useColors();
  const { game, logs } = useTable();
  const me = game?.players.find((p) => p.deviceId === myDevice);
  const live = game?.hand && !game.hand.result ? game.hand : null;
  const myLive = live?.seats.find((s) => s.playerId === me?.id)?.cards ?? [];
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Hand log' }} />
      {live && <HandBlock title={`Hand #${live.number} · now`} lines={live.log} mine={myLive} />}
      {logs === null ? (
        <ActivityIndicator accessibilityLabel="Loading the log" style={{ marginTop: spacing.lg }} />
      ) : logs.length === 0 && !live ? (
        <ThemedText tone="tertiaryLabel">No hands played yet.</ThemedText>
      ) : (
        [...logs].reverse().map((l) => <HandBlock key={l.number} title={`Hand #${l.number}`} lines={l.lines} mine={me ? l.holes[me.id] : undefined} share={l.number} />)
      )}
    </SheetScroll>
  );
}
