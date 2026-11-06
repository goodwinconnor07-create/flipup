import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { cleanName, FREE_VARIANTS, isNameBlocked, LIMITS, NAME_BLOCKED, VARIANTS } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { FRIENDS_ON } from '@/scope';
import { ensureMyCode, myPalCode, useMyUsername } from '@/state/pals';
import { usePremium } from '@/state/premium';
import { saveProfile, useProfile } from '@/state/profile';
import { useStreak } from '@/state/streak';
import { party, radius, spacing, typography, useColors } from '@/theme';

const PIC = 140;

/**
 * Your profile, as on the web: your emoji (tap it to pick another) and your name, which everyone at the table sees;
 * then your streak and Settings, and FlipUp Premium. The name is saved with Save; the emoji as you pick it.
 */
export default function ProfileScreen() {
  const colors = useColors();
  const reduce = useReduceMotion();
  const profile = useProfile();
  const premium = usePremium();
  const { username } = useMyUsername();
  const streak = useStreak();
  const [name, setName] = useState(profile.name);
  const clean = cleanName(name);
  const blocked = isNameBlocked(clean);
  const ok = clean.length > 0 && !blocked;
  const first = !profile.name.trim();

  const save = () => {
    if (!ok) return;
    saveProfile({ name: clean, emoji: profile.emoji });
    haptic.success();
    // Friends see the new name on your friend code.
    if (FRIENDS_ON && myPalCode()) void ensureMyCode().catch(() => undefined);
    // Stay here: a new player still has their emoji to pick, and Back is one tap away.
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: first ? 'Your profile' : 'Profile' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}
      >
        <View style={{ alignItems: 'center', gap: spacing.lg }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Your emoji, ${profile.emoji}. Change it`}
            onPress={() => {
              haptic.tap();
              router.push('/emoji');
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Animated.View key={profile.emoji} entering={reduce ? undefined : ZoomIn.springify().mass(1).stiffness(300).damping(18)}>
              <Avatar emoji={profile.emoji} size={PIC} />
            </Animated.View>
            <View
              style={{
                position: 'absolute',
                right: 4,
                bottom: 4,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.accent,
                borderWidth: 3,
                borderColor: colors.background,
              }}
            >
              <Icon name="pencil" size={17} color={colors.onColor} />
            </View>
          </Pressable>
          <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.tertiaryLabel}
              accessibilityLabel="Your name"
              maxLength={LIMITS.maxNameLength}
              autoComplete="given-name"
              textContentType="givenName"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              autoFocus={first}
              onSubmitEditing={save}
              maxFontSizeMultiplier={1.4}
              style={{
                ...typography.title1,
                textAlign: 'center',
                color: colors.label,
                minHeight: 60,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: colors.cell,
                borderWidth: 2,
                borderColor: blocked ? colors.red : 'transparent',
              }}
            />
            <ThemedText
              variant="footnote"
              tone={blocked ? 'red' : 'tertiaryLabel'}
              accessibilityLiveRegion="polite"
              style={{ textAlign: 'center' }}
            >
              {blocked ? NAME_BLOCKED : 'Everyone at the table sees your name and emoji.'}
            </ThemedText>
          </View>
          <View style={{ alignSelf: 'stretch' }}>
            <Button variant="party" tint="blue" size="lg" title="Save" disabled={!ok || clean === profile.name} onPress={save} />
          </View>
        </View>

        <Section>
          {FRIENDS_ON && (
            <Row
              title="Username"
              subtitle="Friends add you by it"
              detail={username ? `@${username}` : 'Choose'}
              icon={{ symbol: 'person.badge.plus', color: colors.pink as string }}
              onPress={() => router.push('/username')}
            />
          )}
          <Row
            title="Streak"
            subtitle={streak.today ? 'You played today.' : 'Play a hand today to keep it.'}
            detail={`${streak.days} ${streak.days === 1 ? 'day' : 'days'}`}
            icon={{ symbol: 'flame.fill', color: party.orange }}
            onPress={() => router.push('/streak')}
          />
          <Row
            title="Settings"
            icon={{ symbol: 'gearshape.fill', color: colors.slate as string }}
            onPress={() => router.push('/settings')}
          />
        </Section>

        <Section>
          <Row
            title="FlipUp Premium"
            subtitle={
              premium
                ? 'Unlocked. Thank you for backing FlipUp.'
                : `Card packs, bubble effects and ${VARIANTS.length - FREE_VARIANTS} more games`
            }
            icon={{ symbol: 'crown.fill', color: colors.gold as string }}
            onPress={() => router.push('/premium')}
          />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
