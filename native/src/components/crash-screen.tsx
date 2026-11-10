import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, radius, ROUNDED, spacing } from '@/theme';

/**
 * What a screen shows when drawing it throws (Expo Router's `ErrorBoundary` on the root layout and the table):
 * a plain page on night blue with Try again and a way out, instead of the app closing. It leans on nothing but
 * React Native and the brand constants, so it can't fail the same way the screen did.
 */
export function CrashScreen({
  error,
  retry,
  title = 'Something went wrong',
  line = 'Sorry about that. Try again, or head back to Play.',
  onLeave,
  leaveTitle = 'Back to Play',
}: {
  error: Error;
  retry: () => Promise<void>;
  title?: string;
  line?: string;
  /** Runs before going Home (the table leaves its table first). */
  onLeave?: () => void;
  leaveTitle?: string;
}) {
  const insets = useSafeAreaInsets();
  console.warn('[screen error]', error);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: brand.violetNight,
        paddingTop: insets.top + spacing.xxl,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <Text accessibilityRole="header" style={{ fontFamily: ROUNDED, fontSize: 28, fontWeight: '800', color: '#ffffff' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: ROUNDED, fontSize: 17, color: 'rgba(255,255,255,0.8)' }}>{line}</Text>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Big title="Try again" loud onPress={() => void retry()} />
        <Big
          title={leaveTitle}
          onPress={() => {
            try {
              onLeave?.();
            } catch {
              // Going Home matters more than tidying up.
            }
            router.replace('/');
          }}
        />
      </View>
    </View>
  );
}

function Big({ title, loud, onPress }: { title: string; loud?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: loud ? brand.paper : 'rgba(255, 255, 255, 0.16)',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '700', color: loud ? brand.violet : '#ffffff' }}>{title}</Text>
    </Pressable>
  );
}
