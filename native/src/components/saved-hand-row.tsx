import { View } from 'react-native';

import { variantInfo } from '@/engine';
import type { Replay } from '@/state/replays';
import { brand, radius, ROUNDED, spacing } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { signed } from './share/data';
import { SwapIcon } from './swap';
import { PlayingCard } from './table/playing-card';
import { ThemedText } from './themed-text';

/**
 * One saved hand as a row: your two cards, what you made (a star first when it's starred), the game, the hand's
 * number and day, the chips won or lost, and a play mark (a red remove button while the list is being edited).
 * Saved hands lists them.
 */
export function SavedHandRow({ replay: r, starred, editing, onPress, onLongPress, onRemove }: { replay: Replay; starred: boolean; editing?: boolean; onPress: () => void; onLongPress?: () => void; onRemove?: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Hand ${r.number}, ${variantInfo(r.variant).name}, ${signed(r.net)} chips. Watch it back.`}
      accessibilityHint={onLongPress ? 'Long press to share or remove' : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {(r.holes[r.me] ?? []).slice(0, 2).map((c) => (
          <PlayingCard key={c} card={c} size="sm" width={30} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {starred && <Icon name="star.fill" size={12} color={brand.gold} />}
          <ThemedText variant="callout" numberOfLines={1} style={{ fontWeight: '700' }}>
            {r.myHand ?? (r.showdown ? 'Showdown' : r.net > 0 ? 'Took it down' : 'Folded')}
          </ThemedText>
        </View>
        <ThemedText variant="caption1" tone="secondaryLabel" numberOfLines={1}>
          {variantInfo(r.variant).name} · Hand {r.number} · {new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </ThemedText>
      </View>
      <ThemedText style={{ fontFamily: ROUNDED, fontSize: 19, fontWeight: '800', color: r.net > 0 ? brand.gold : '#ffffff' }}>{signed(r.net)}</ThemedText>
      {editing && onRemove ? (
        <PressableScale accessibilityRole="button" accessibilityLabel={`Remove hand ${r.number}`} onPress={onRemove} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ff453a', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trash.fill" size={15} color="#ffffff" />
        </PressableScale>
      ) : (
        <SwapIcon name="play.fill" size={14} color="rgba(255,255,255,0.6)" />
      )}
    </PressableScale>
  );
}
