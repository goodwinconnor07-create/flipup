import { Platform, Pressable, View } from 'react-native';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import Animated from 'react-native-reanimated';

import { MAX_SEATS } from '@/engine';
import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { ThemedText } from '../themed-text';

const WEB = Platform.OS === 'web';

export interface PlayerLine {
  key: string;
  name: string;
  emoji: string;
  /** Under the name: You · Host, Bot, Ready. */
  line: string;
  you?: boolean;
  /** The … on the row: Remove, and Report or Block for a person. */
  onMore?: () => void;
}

/**
 * Who's at the table, as a plain list (the owner's reference): each seat's face, name and a small line, a … on the
 * others, and Add a bot as the last row. Friends come in with the game code, so there's no invite row. Rows come and
 * go with a short rise and fade (motion rules 1, 15).
 */
export function Players({ rows, onAdd }: { rows: PlayerLine[]; onAdd?: () => void }) {
  const colors = useColors();
  const panel = usePanel();
  const shadows = useShadows();
  const reduce = useReduceMotion();
  const people = rows.filter((r) => r.line !== 'Bot').length;
  const bots = rows.length - people;
  const room = MAX_SEATS - rows.length;
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
        <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            // The web build's Reanimated takes animated rows out of the layout, so they only animate on the phone.
            <Animated.View key={r.key} entering={WEB ? undefined : enter(reduce)} exiting={WEB ? undefined : exit(reduce)}>
              {i > 0 && <View style={{ height: 0.5, marginLeft: 64, backgroundColor: colors.separator }} />}
              <Row row={r} />
            </Animated.View>
          ))}
          {onAdd && <Animated.View>
            <View style={{ height: 0.5, marginLeft: 64, backgroundColor: colors.separator }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={room > 0 ? 'Add a bot' : `Table full, ${MAX_SEATS} seats`}
              disabled={room <= 0}
              onPress={() => {
                haptic.tap();
                onAdd();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                minHeight: 56,
                backgroundColor: pressed ? colors.cellPressed : 'transparent',
                opacity: room > 0 ? 1 : 0.4,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.cellPressed,
                }}
              >
                <Icon name="plus" size={16} color={brand.violetDark} />
              </View>
              <ThemedText style={{ fontWeight: '600', color: brand.violetDark }}>
                {room > 0 ? 'Add a bot' : `Table full · ${MAX_SEATS} seats`}
              </ThemedText>
            </Pressable>
          </Animated.View>}
        </View>
      </View>
      {people === 1 && onAdd && (
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
          Friends join from Join on the Play tab with the game code. Bots fill in until they do.
        </ThemedText>
      )}
    </View>
  );
}

function Row({ row: r }: { row: PlayerLine }) {
  const colors = useColors();
  const panel = usePanel();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        minHeight: 60,
      }}
    >
      <Avatar emoji={r.emoji} size={36} />
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText numberOfLines={1} style={{ fontWeight: '600' }}>
          {r.name}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" style={r.you ? { color: brand.violetDark } : undefined}>
          {r.line}
        </ThemedText>
      </View>
      {r.onMore && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${r.name}, more`}
          onPress={r.onMore}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
        >
          <Icon name="ellipsis" size={18} color={colors.secondaryLabel} />
        </Pressable>
      )}
    </View>
  );
}
