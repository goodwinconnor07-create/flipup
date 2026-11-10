import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, gradient, radius, ROUNDED, spacing } from '@/theme';

import { GRAIN_NIGHT } from '../grain-background';
import { PressableScale } from '../pressable-scale';

/** How far the button's chunky edge shows under it. */
const EDGE = 4;

/**
 * Open table, pinned to the bottom of the grain page over a fade into the page's colour, so rows scroll away
 * under it. The `inverse` button (white, blue words) as a capsule, with a second line: on the night
 * page it's the brightest thing there.
 */
export function OpenTableButton({ title, line, busy, disabled, onPress }: { title: string; line?: string; busy?: boolean; disabled?: boolean; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const night = GRAIN_NIGHT[1];
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
        accessibilityState={{ busy: !!busy, disabled: !!disabled }}
        onPress={busy || disabled ? undefined : onPress}
        outerStyle={{ alignSelf: 'stretch' }}
        style={{ borderRadius: radius.full }}
      >
        <View
          style={{
            minHeight: 60,
            borderRadius: radius.full,
            // Waiting: a solid dim fill, never see-through, so rows scrolling under the fade can't show in it.
            backgroundColor: disabled ? '#1b2850' : brand.paper,
            borderWidth: disabled ? 1 : 0,
            borderColor: 'rgba(255,255,255,0.1)',
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
                style={{ fontFamily: ROUNDED, fontSize: 20, lineHeight: 24, fontWeight: '700', color: disabled ? 'rgba(255,255,255,0.5)' : brand.violet }}
              >
                {title}
              </Text>
              {line && (
                <Text
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={{ fontFamily: ROUNDED, fontSize: 13, lineHeight: 17, fontWeight: '600', color: disabled ? brand.violetDark : brand.violetDeep }}
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
