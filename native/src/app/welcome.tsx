import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Announce } from '@/components/announce';
import { Button } from '@/components/button';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { cleanName, EMOJIS, isNameBlocked, LIMITS, NAME_BLOCKED } from '@/engine';
import { popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { finishAskName } from '@/state/ask-name';
import { saveProfile, useProfile } from '@/state/profile';
import { brand, ForceScheme, ROUNDED, spacing } from '@/theme';

/** The faces on offer here: the first three rows of the full picker (the profile has all of them, and any emoji). */
const FACES = EMOJIS.slice(0, 18);
const PER_ROW = 6;
const PIC = 120;
const SOFT = 'rgba(255,255,255,0.8)';
const QUIET = 'rgba(255,255,255,0.66)';

/**
 * The welcome (the owner's pick, 17 Nov 2026): one screen, shown once, before a player without a name reaches a
 * table. A face (saved as you tap) and a name, then Continue. From a join link it names the table you're headed to
 * and Continue sits you down there. No skip: a name is the one thing every table needs. Opened by `askForName()`.
 */
export default function WelcomeScreen() {
  return (
    <ForceScheme scheme="dark">
      <Welcome />
    </ForceScheme>
  );
}

function Welcome() {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const profile = useProfile();
  const { host, game, code } = useLocalSearchParams<{ host?: string; game?: string; code?: string }>();
  const [name, setName] = useState('');
  const done = useRef(false);
  const page = useRef<ComponentRef<typeof ScrollView>>(null);
  // While the keyboard is up it covers the home indicator's room, so the pinned button sits right on top of it.
  const [typing, setTyping] = useState(false);
  const face = profile.emoji || FACES[0];
  const clean = cleanName(name);
  const blocked = isNameBlocked(clean);
  const ok = clean.length > 0 && !blocked;

  // Leaving without a name tells whoever asked.
  useEffect(
    () => () => {
      if (!done.current) finishAskName(false);
    },
    [],
  );

  // The way Apple's own sign-up pages behave: the keyboard comes up, the page scrolls the name field into view above it,
  // and the button stays pinned just over the keyboard instead of hiding under it.
  useEffect(() => {
    const ios = process.env.EXPO_OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setTyping(true));
    const shown = Keyboard.addListener('keyboardDidShow', () => page.current?.scrollToEnd({ animated: true }));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setTyping(false));
    return () => {
      show.remove();
      shown.remove();
      hide.remove();
    };
  }, []);

  const go = () => {
    if (!ok) return;
    saveProfile({ name: clean, emoji: face });
    haptic.success();
    done.current = true;
    finishAskName(true);
    router.back();
  };

  return (
    <GrainBackground>
      <Stack.Screen options={{ headerShown: false, title: 'Welcome' }} />
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={page}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          // Dragging the page down puts the keyboard away, like Messages and Settings do.
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg }}
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Animated.View
              key={face}
              entering={reduce ? undefined : popIn()}
              style={{ width: PIC, height: PIC, borderRadius: PIC / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)' }}
            >
              <Text maxFontSizeMultiplier={1} style={{ fontSize: PIC * 0.55 }}>
                {face}
              </Text>
            </Animated.View>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={{ marginTop: spacing.md, fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
              Welcome to FlipUp
            </Text>
            <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 17, lineHeight: 23, color: SOFT, textAlign: 'center' }}>
              Poker night on your phones. Pick a face and a name for the table.
            </Text>
            {!host && <HowItWorks />}
            {!!host && (
              // From a join link: where Continue takes you, on its own line with room around it.
              <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.085)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ fontSize: 15, lineHeight: 20, color: '#ffffff', flexShrink: 1 }}>
                  <Text style={{ fontWeight: '700' }}>{host}’s table</Text>
                  {[game, code].filter(Boolean).map((t) => ` · ${t}`).join('')}
                </Text>
              </View>
            )}
          </View>

          <View accessibilityRole="radiogroup" accessibilityLabel="Your face" style={{ marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs }}>
            {FACES.map((e) => {
              const on = e === face;
              return (
                <View key={e} style={{ width: `${100 / PER_ROW}%`, alignItems: 'center' }}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={e}
                    onPress={() => {
                      haptic.select();
                      saveProfile({ emoji: e });
                    }}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? 'rgba(91,139,255,0.22)' : pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderWidth: 2,
                      borderColor: on ? brand.violetDark : 'transparent',
                    })}
                  >
                    <Text maxFontSizeMultiplier={1} style={{ fontSize: 28 }}>
                      {e}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
            <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.085)', borderWidth: 1, borderColor: blocked ? '#ff453a' : 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 18, color: QUIET }}>
                  Your name
                </Text>
                <Text
                  maxFontSizeMultiplier={1.4}
                  accessibilityLabel={`${name.length} of ${LIMITS.maxNameLength} letters`}
                  style={{ fontSize: 13, lineHeight: 18, color: name.length >= LIMITS.maxNameLength ? '#ffffff' : QUIET, fontVariant: ['tabular-nums'] }}
                >
                  {name.length}/{LIMITS.maxNameLength}
                </Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="What should we call you?"
                placeholderTextColor="rgba(255,255,255,0.45)"
                accessibilityLabel="Your name"
                maxLength={LIMITS.maxNameLength}
                autoComplete="given-name"
                textContentType="givenName"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={ok ? go : Keyboard.dismiss}
                maxFontSizeMultiplier={1.4}
                style={{ minHeight: 44, fontSize: 20, fontWeight: '600', color: '#ffffff', paddingVertical: spacing.xs }}
              />
            </View>
            <Announce text={blocked ? NAME_BLOCKED : null} />
            <Text maxFontSizeMultiplier={1.6} style={{ paddingHorizontal: spacing.md, fontSize: 13, lineHeight: 18, color: blocked ? '#ff6961' : QUIET }}>
              {blocked ? NAME_BLOCKED : 'Everyone at your table sees your name and face.'}
            </Text>
          </View>

        </ScrollView>

        {/* Pinned under the page, outside the scroll: it rides on top of the keyboard and is never hidden by it. */}
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: typing ? spacing.sm : insets.bottom + spacing.lg }}>
          <Button variant="party" tint="blue" size="lg" title={host ? `Sit down at ${host}'s table` : 'Continue'} disabled={!ok} onPress={go} />
          {!typing && (
            <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 13, lineHeight: 18, color: QUIET, textAlign: 'center' }}>
              You can change both on your profile.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </GrainBackground>
  );
}

/**
 * How FlipUp works, in three steps across one panel (23 Nov 2026, after EasyPoker's intro cards, cut to one strip):
 * host a table, send the code, friends sit down on their own phones. Not shown from a join link, where the table
 * pill says where you're going.
 */
function HowItWorks() {
  const steps = ['Host a table', 'Send the code', 'Friends sit down on their phones'];
  return (
    <View
      accessible
      accessibilityLabel={`How it works: ${steps.map((t, i) => `${i + 1}, ${t}`).join('. ')}`}
      style={{ marginTop: spacing.md, alignSelf: 'stretch', flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: 22, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.085)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {steps.map((t, i) => (
        <View key={t} style={{ flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
              {i + 1}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 17, fontWeight: '600', color: SOFT, textAlign: 'center' }}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}
