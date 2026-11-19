import { Color, router, Stack } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { popIn } from '@/motion/presets';

import { PressableScale } from '@/components/pressable-scale';
import { Swap } from '@/components/swap';
import { NativeMenu } from '@/components/native-menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { cleanName, FREE_VARIANTS, isNameBlocked, isVariant, LIMITS, NAME_BLOCKED, VARIANTS } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { saveProfile, useProfile } from '@/state/profile';
import { useStored } from '@/state/storage';
import { brand, gradient, ROUNDED, spacing, useColors, useScheme } from '@/theme';
import { Announce } from '@/components/announce';

const PIC = 150;

/**
 * Your profile, as on the web: your emoji (tap it to pick another) and your name, which everyone at the table sees;
 * then Settings, How to play (for the game Home shows) and FlipUp Premium. Your stats are the Hands tab. The name is
 * saved with Save; the emoji as you pick it.
 */
export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dark = useScheme() === 'dark';
  const reduce = useReduceMotion();
  const profile = useProfile();
  const premium = usePremium();
  const [name, setName] = useState(profile.name);
  const clean = cleanName(name);
  const blocked = isNameBlocked(clean);
  const ok = clean.length > 0 && !blocked;

  const save = () => {
    if (!ok) return;
    saveProfile({ name: clean, emoji: profile.emoji });
    haptic.success();
    // Stay here: a new player still has their emoji to pick, and Back is one tap away.
    Keyboard.dismiss();
  };

  // Light mode: Apple's grouped grey, so the white list rows stand out from the page (white on white hid them).
  const page = dark || process.env.EXPO_OS !== 'ios' ? colors.background : Color.ios.systemGroupedBackground;
  const changed = clean !== profile.name;
  // How to play opens the game Home has in the middle (`flipup.homegame`), else Texas Hold'em.
  const homeGame = useStored<string | null>('flipup.homegame', null);
  const game = isVariant(homeGame) ? homeGame : 'holdem';

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: page }}>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      {/* The Games-app header: a deep blue glow behind your face that fades into the page. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 480, ...gradient(`linear-gradient(180deg, ${brand.violet} 0%, ${brand.violetDeep} 45%, ${page as string} 100%)`), opacity: dark ? 1 : 0.9 }} />
      <NativeMenu
        transparent
        top={
          <View style={{ paddingTop: insets.top + 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Your emoji, ${profile.emoji}. Change it`}
            onPress={() => {
              haptic.tap();
              router.push('/emoji');
            }}
            style={({ pressed }) => ({ width: PIC, height: PIC, opacity: pressed ? 0.8 : 1 })}
          >
            <Animated.View
              key={profile.emoji}
              entering={reduce ? undefined : popIn()}
              style={{ width: PIC, height: PIC, borderRadius: PIC / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.94)', borderWidth: dark ? 1 : 0, borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)' }}
            >
              <Text style={{ fontSize: PIC * 0.55 }} maxFontSizeMultiplier={1}>
                {profile.emoji}
              </Text>
            </Animated.View>
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet, borderWidth: 3, borderColor: dark ? brand.violetDeep : '#ffffff' }}>
              <Icon name="pencil" size={14} color="#ffffff" />
            </View>
          </Pressable>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)'}
            accessibilityLabel="Your name"
            maxLength={LIMITS.maxNameLength}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={save}
            maxFontSizeMultiplier={1.3}
            style={{ fontFamily: ROUNDED, fontSize: 40, fontWeight: '800', textAlign: 'center', color: dark ? '#ffffff' : (colors.label as string), minWidth: 200, paddingVertical: spacing.xxs, borderWidth: 0 }}
          />
          <Swap id={changed ? 'save' : 'hint'} kind="text">
            {changed ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Save your name"
                disabled={!ok}
                onPress={save}
                style={{ height: 36, paddingHorizontal: 20, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? (ok ? '#ffffff' : 'rgba(255,255,255,0.3)') : ok ? brand.violet : 'rgba(0,0,0,0.12)' }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: dark ? brand.violetDeep : '#ffffff' }}>
                  Save name
                </Text>
              </PressableScale>
            ) : (
              // Plain text, not a pill: a filled capsule here read as a button that did nothing.
              <ThemedText variant="subhead" style={{ height: 36, lineHeight: 36, color: dark ? 'rgba(255,255,255,0.7)' : (colors.secondaryLabel as string) }}>
                Tap your name to change it
              </ThemedText>
            )}
          </Swap>
          <Announce text={blocked ? NAME_BLOCKED : null} />
          {blocked && (
            <ThemedText variant="footnote" tone="red" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
              {NAME_BLOCKED}
            </ThemedText>
          )}
        </View>
          </View>
        }
        groups={[
          {
            id: 'you',
            items: [
              { kind: 'link', id: 'settings', title: 'Settings', detail: 'Sound, looks and your data', onPress: () => router.push('/settings') },
              { kind: 'link', id: 'premium', title: 'FlipUp Premium', detail: premium ? 'Unlocked' : `Card packs and ${VARIANTS.length - FREE_VARIANTS} more games`, trailingCrown: true, onPress: () => router.push('/premium') },
              { kind: 'link', id: 'howto', title: 'How to play', detail: 'Every game, one hand at a time', onPress: () => router.push(`/how-to-play/${game}`) },
            ],
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}
