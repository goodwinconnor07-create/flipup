import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { ThemedText } from '@/components/themed-text';
import { cleanName, EMOJIS, isNameBlocked, LIMITS, NAME_BLOCKED } from '@/engine';
import { popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { finishAskName } from '@/state/ask-name';
import { saveProfile, useProfile } from '@/state/profile';
import { radius, spacing, typography, useColors } from '@/theme';

/**
 * "What should we call you?": a name and a face, asked on top of the screen that needed them (joining a table,
 * opening one) so a new player never has to leave it. The face is saved as you pick it, the name with Continue.
 */
export default function YourNameSheet() {
  const colors = useColors();
  const reduce = useReduceMotion();
  const profile = useProfile();
  const [name, setName] = useState('');
  const done = useRef(false);
  const clean = cleanName(name);
  const blocked = isNameBlocked(clean);
  const ok = clean.length > 0 && !blocked;

  // Closing the sheet without a name tells whoever asked.
  useEffect(
    () => () => {
      if (!done.current) finishAskName(false);
    },
    [],
  );

  const go = () => {
    if (!ok) return;
    saveProfile({ name: clean });
    haptic.success();
    done.current = true;
    finishAskName(true);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Your name' }} />
      <View style={{ flex: 1, padding: spacing.md, gap: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Animated.View key={profile.emoji} entering={reduce ? undefined : popIn()}>
            <Avatar emoji={profile.emoji} size={88} />
          </Animated.View>
          <ThemedText variant="title2" accessibilityRole="header" style={{ textAlign: 'center' }}>
            What should we call you?
          </ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel" style={{ textAlign: 'center' }}>
            Everyone at the table sees your name and face.
          </ThemedText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.xxs }} style={{ flexGrow: 0 }}>
          {EMOJIS.map((e) => {
            const on = profile.emoji === e;
            return (
              <Pressable
                key={e}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={e}
                onPress={() => {
                  haptic.select();
                  saveProfile({ emoji: e });
                }}
                style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.blueBg : 'transparent', borderWidth: 2, borderColor: on ? colors.accent : 'transparent' }}
              >
                <Text maxFontSizeMultiplier={1} style={{ fontSize: 28 }}>
                  {e}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ gap: spacing.xs }}>
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
            autoFocus
            onSubmitEditing={go}
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
          {blocked && (
            <ThemedText variant="footnote" tone="red" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
              {NAME_BLOCKED}
            </ThemedText>
          )}
        </View>
        <Button variant="party" tint="blue" size="lg" title="Continue" disabled={!ok} onPress={go} />
      </View>
    </KeyboardAvoidingView>
  );
}
