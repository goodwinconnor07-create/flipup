import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { SheetScroll } from '@/components/sheet-scroll';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { EMOJIS, firstEmoji } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { saveProfile, useProfile } from '@/state/profile';
import { radius, spacing, useColors } from '@/theme';

const PER_ROW = 8;

/** Picking your emoji, as on the web: the grid, or type any emoji (free for everyone). Each pick is saved at once. */
export default function EmojiSheet() {
  const colors = useColors();
  const reduce = useReduceMotion();
  const profile = useProfile();
  const [typed, setTyped] = useState('');
  const custom = !(EMOJIS as readonly string[]).includes(profile.emoji);
  const pick = (emoji: string) => {
    haptic.select();
    saveProfile({ emoji });
  };
  return (
    <SheetScroll keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Your emoji' }} />
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Animated.View key={profile.emoji} entering={reduce ? undefined : ZoomIn.springify().mass(1).stiffness(300).damping(18)}>
          <Avatar emoji={profile.emoji} size={96} />
        </Animated.View>
        <ThemedText variant="headline">{profile.name.trim() || 'You'}</ThemedText>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Emoji" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs }}>
        {EMOJIS.map((e) => {
          const on = profile.emoji === e;
          return (
            <View key={e} style={{ width: `${100 / PER_ROW}%`, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={e}
                onPress={() => pick(e)}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.blueBg : pressed ? colors.cellPressed : 'transparent',
                  borderWidth: 2,
                  borderColor: on ? colors.accent : 'transparent',
                })}
              >
                <Text maxFontSizeMultiplier={1} style={{ fontSize: 26 }}>
                  {e}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs, paddingLeft: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: custom ? colors.blueBg : colors.cellPressed }}>
          {custom ? (
            <Text maxFontSizeMultiplier={1} style={{ fontSize: 24 }}>
              {profile.emoji}
            </Text>
          ) : (
            <Icon name="plus" size={16} color={colors.tertiaryLabel} />
          )}
        </View>
        <TextInput
          value={typed}
          onChangeText={(text) => {
            const found = firstEmoji(text);
            setTyped(found ?? '');
            if (found) pick(found);
          }}
          placeholder="Or type any emoji"
          placeholderTextColor={colors.tertiaryLabel}
          accessibilityLabel="Type any emoji"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          maxFontSizeMultiplier={1.5}
          style={{ flex: 1, minHeight: 44, fontSize: 17, color: colors.label }}
        />
      </View>

      <Button variant="primary" title="Done" onPress={() => router.back()} />
    </SheetScroll>
  );
}
