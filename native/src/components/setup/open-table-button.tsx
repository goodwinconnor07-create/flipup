import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, gradient, radius, ROUNDED, spacing } from '@/theme';

import { GRAIN_NIGHT } from '../grain-background';
import { PressableScale } from '../pressable-scale';

/** How far the button's chunky edge shows under it. */
const EDGE = 4;

/**
 * Open table, pinned to the bottom of the grain page over a fade into its darkest colour, so rows scroll away
 * under it. A solid light button with violet ink and a pale violet edge under it (the party look): on the night
 * page it's the brightest thing there, and it never stacks a second grainy violet layer on the violet glow.
 */
export function OpenTableButton({ title, line, busy, onPress }: { title: string; line?: string; busy?: boolean; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const night = GRAIN_NIGHT[2];
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        ...gradient(`linear-gradient(180deg, ${night}00 0%, ${night}e6 40%, ${night} 100%)`),
      }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={line ? `${title}, ${line}` : title}
        accessibilityState={{ busy: !!busy }}
        onPress={busy ? undefined : onPress}
        outerStyle={{ alignSelf: 'stretch' }}
        style={{ borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.paperEdge, paddingBottom: EDGE }}
      >
        <View
          style={{
            minHeight: 60,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: brand.paper,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xs,
          }}
        >
          {busy ? (
            <ActivityIndicator color={brand.violet} />
          ) : (
            <>
              <Text
                maxFontSizeMultiplier={1.3}
                style={{ fontFamily: ROUNDED, fontSize: 21, lineHeight: 25, fontWeight: '800', color: brand.violet }}
              >
                {title}
              </Text>
              {line && (
                <Text
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={{ fontSize: 13, lineHeight: 17, fontWeight: '600', color: brand.violetDeep }}
                >
                  {line}
                </Text>
              )}
            </>
          )}
        </View>
      </PressableScale>
    </View>
  );
}

/** Room to leave at the end of the page so its last row can scroll clear of the button. */
export const OPEN_BUTTON_ROOM = 60 + EDGE + spacing.xl + spacing.md + spacing.xxxl;
