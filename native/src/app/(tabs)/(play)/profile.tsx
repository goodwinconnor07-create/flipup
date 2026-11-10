import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { popIn } from '@/motion/presets';

import { PressableScale } from '@/components/pressable-scale';
import { Swap } from '@/components/swap';
import { Row, Section } from '@/components/grouped-list';
import { PassportCard } from '@/components/home/passport';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { cleanName, FREE_VARIANTS, isNameBlocked, LIMITS, NAME_BLOCKED, VARIANTS } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { FRIENDS_ON } from '@/scope';
import { ensureMyCode, myPalCode, useMyUsername } from '@/state/pals';
import { usePremium } from '@/state/premium';
import { saveProfile, useProfile } from '@/state/profile';
import { usePokerRecord } from '@/state/record';
import { brand, gradient, ROUNDED, spacing, useColors, useScheme } from '@/theme';

const PIC = 108;

/**
 * Your profile, as on the web: your emoji (tap it to pick another) and your name, which everyone at the table sees;
 * then Settings, and FlipUp Premium. The name is saved with Save; the emoji as you pick it.
 */
export default function ProfileScreen() {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  // Row glyphs: a pale blue over the dark panels, the brand blue on light ones.
  const tint = dark ? '#cfe0ff' : brand.violet;
  const reduce = useReduceMotion();
  const profile = useProfile();
  const premium = usePremium();
  const { username } = useMyUsername();
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

  const record = usePokerRecord();
  const changed = clean !== profile.name;
  const stats = record.hands ? `${record.hands.toLocaleString('en-US')} hands · ${Math.round((record.won / record.hands) * 100)}% won` : 'Play a hand to start';

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      {/* The Games-app header: a deep blue glow behind your face that fades into the page. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 480, ...gradient(`linear-gradient(180deg, ${brand.violet} 0%, ${brand.violetDeep} 45%, ${colors.background as string} 100%)`), opacity: dark ? 1 : 0.9 }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl }}
      >
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
              style={{ width: PIC, height: PIC, borderRadius: PIC / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)' }}
            >
              <Text style={{ fontSize: PIC * 0.55 }} maxFontSizeMultiplier={1}>
                {profile.emoji}
              </Text>
            </Animated.View>
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet, borderWidth: 3, borderColor: '#ffffff' }}>
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
            autoFocus={first}
            onSubmitEditing={save}
            maxFontSizeMultiplier={1.3}
            style={{ fontFamily: ROUNDED, fontSize: 30, fontWeight: '800', textAlign: 'center', color: dark ? '#ffffff' : (colors.label as string), minWidth: 200, paddingVertical: spacing.xxs, borderWidth: 0 }}
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
              <View style={{ height: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)' }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '600', color: dark ? '#ffffff' : (colors.label as string) }}>
                  Tap your name or face to change
                </Text>
              </View>
            )}
          </Swap>
          {blocked && (
            <ThemedText variant="footnote" tone="red" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
              {NAME_BLOCKED}
            </ThemedText>
          )}
        </View>

        {record.hands > 0 && <PassportCard />}

        <Section header="Your poker">
          {record.hands === 0 && <Row title="Your stats" detail={stats} icon={{ symbol: 'chart.bar.xaxis', color: tint }} onPress={() => router.push('/stats')} />}
          {FRIENDS_ON && (
            <Row
              title="Username"
              detail={username ? `@${username}` : 'Choose one so friends can add you'}
              icon={{ symbol: 'person.badge.plus', color: tint }}
              onPress={() => router.push('/username')}
            />
          )}
          <Row title="Settings" detail="Sound, looks and your data" icon={{ symbol: 'gearshape.fill', color: tint }} onPress={() => router.push('/settings')} />
        </Section>

        <Section header="Premium">
          <Row
            title="FlipUp Premium"
            detail={premium ? 'Unlocked. Thank you for backing FlipUp.' : `Card packs and ${VARIANTS.length - FREE_VARIANTS} more games`}
            icon={{ symbol: 'crown.fill', color: brand.gold }}
            onPress={() => router.push('/premium')}
          />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
