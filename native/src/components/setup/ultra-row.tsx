import { router } from 'expo-router';
import { View } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { useUltraHands } from '@/state/ultra';
import { brand, radius, ROUNDED, spacing } from '@/theme';

/**
 * ULTRA bots (Premium), on Play with bots: every bot at the table plays without leaks, reads you in a few hands and
 * remembers you from your last ULTRA games. Without Premium the row opens the offer.
 */
export function UltraRow({ on, premium, onChange }: { on: boolean; premium: boolean; onChange: (on: boolean) => void }) {
  const known = useUltraHands();
  const line = !premium
    ? 'Hardest bots in FlipUp. They learn your game fast.'
    : known > 0
      ? `No leaks. They remember ${known.toLocaleString('en-US')} of your hands.`
      : 'No leaks. They learn your game fast and remember it.';
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: on ? brand.gold : 'rgba(255,255,255,0.14)', backgroundColor: on ? 'rgba(245,183,0,0.12)' : 'rgba(255,255,255,0.06)' }}>
      <View style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}>
        <Icon name="cpu.fill" size={20} color={brand.goldInk} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ThemedText variant="headline" style={{ fontFamily: ROUNDED, fontWeight: '800', color: brand.gold }}>
            ULTRA bots
          </ThemedText>
          {!premium && <Icon name="crown.fill" size={13} color={brand.gold} />}
        </View>
        <ThemedText variant="footnote" tone="secondaryLabel">
          {line}
        </ThemedText>
      </View>
      {premium && <Switch value={on} onValueChange={onChange} label="ULTRA bots" />}
    </View>
  );
  if (premium) return body;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="ULTRA bots, Premium. See FlipUp Premium."
      onPress={() => {
        haptic.tap();
        router.push({ pathname: '/premium', params: { reason: 'ultra' } });
      }}
    >
      {body}
    </PressableScale>
  );
}
