import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { ALT_ICONS, canChangeIcon, currentIcon, DEFAULT_ICON, setIcon } from '@/state/app-icon';
import { usePremium } from '@/state/premium';
import { brand, radius, spacing, useColors } from '@/theme';

/** App icon (Premium): FlipUp's own icon or one of five others for the home screen. iOS confirms the change itself. */
export default function AppIconSheet() {
  const premium = usePremium();
  const colors = useColors();
  const [now, setNow] = useState(currentIcon());
  const able = canChangeIcon();
  const pick = async (id: string) => {
    if (id !== 'default' && !premium) {
      haptic.tap();
      router.push({ pathname: '/premium', params: { reason: 'icon' } });
      return;
    }
    haptic.select();
    if (await setIcon(id)) setNow(id);
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      {!able && (
        <ThemedText variant="footnote" tone="secondaryLabel">
          This device can't change app icons.
        </ThemedText>
      )}
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' }}>
        {[DEFAULT_ICON, ...ALT_ICONS].map((i) => {
          const on = i.id === now;
          const locked = i.id !== 'default' && !premium;
          return (
            <PressableScale key={i.id} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !able }} accessibilityLabel={`${i.name}${locked ? ', Premium' : ''}`} disabled={!able} onPress={() => void pick(i.id)} style={{ alignItems: 'center', gap: 6, width: 100 }}>
              <View style={{ padding: 3, borderRadius: radius.lg, borderWidth: 3, borderColor: on ? colors.accent : 'transparent' }}>
                <Image source={i.preview} style={{ width: 76, height: 76, borderRadius: 17 }} />
                {locked && (
                  <View style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <Icon name="crown.fill" size={11} color={brand.gold} />
                  </View>
                )}
              </View>
              <ThemedText variant="subhead" style={{ fontWeight: on ? '700' : '500' }}>
                {i.name}
              </ThemedText>
              <ThemedText variant="caption1" tone="secondaryLabel" numberOfLines={1}>
                {i.line}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
    </SheetScroll>
  );
}
