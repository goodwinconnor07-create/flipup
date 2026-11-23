import { View } from 'react-native';

import { myPlayer, type Game } from '@/engine';
import { brand, spacing } from '@/theme';

import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { useTableNow } from './use-now';

/** Whether it's your move at this table right now. */
export function isMyTurn(game: Game | null | undefined, deviceId: string): boolean {
  const hand = game?.hand;
  const me = game ? myPlayer(game, deviceId) : undefined;
  return !!hand && !hand.result && !!me && hand.toAct === me.id;
}

/**
 * The gold bar at the top of the table menu while it's your move (23 Nov 2026, from EasyPoker's menu): "Your turn",
 * the seconds you have left and a line that drains with them. A tap closes the menu, so a look at the hand rankings
 * mid-hand doesn't cost a timeout. Without a turn clock it's the words alone.
 */
export function YourTurnBar({ game, onPress }: { game: Game; onPress: () => void }) {
  const now = useTableNow(game.fast, 250);
  const hand = game.hand;
  const total = game.settings.turnSeconds * 1000;
  const live = !!hand?.deadline && total > 0;
  // A fast table's clock runs twice as fast: show real seconds.
  const leftMs = live ? Math.max(0, hand!.deadline! - now) / (game.fast ? 2 : 1) : 0;
  const share = live ? Math.max(0, Math.min(1, (hand!.deadline! - now) / total)) : 0;
  const seconds = Math.ceil(leftMs / 1000);
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={live ? `Your turn, ${seconds} seconds left. Go back to the table` : 'Your turn. Go back to the table'}
      outerStyle={{ marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs }}
      style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: brand.gold, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: live ? 10 : 12 }}>
        <Icon name="timer" size={22} color={brand.goldInk} weight="bold" />
        <View style={{ flex: 1 }}>
          <ThemedText variant="headline" style={{ color: brand.goldInk, fontWeight: '800' }}>
            Your turn
          </ThemedText>
          <ThemedText variant="footnote" style={{ color: brand.goldInk, opacity: 0.78, fontWeight: '600' }}>
            Tap to go back to the table
          </ThemedText>
        </View>
        {live && (
          <ThemedText variant="title2" style={{ color: brand.goldInk, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {seconds}
          </ThemedText>
        )}
      </View>
      {live && (
        <View style={{ height: 4, backgroundColor: 'rgba(59, 38, 0, 0.18)' }}>
          <View style={{ height: 4, width: `${share * 100}%`, backgroundColor: brand.goldInk }} />
        </View>
      )}
    </PressableScale>
  );
}
