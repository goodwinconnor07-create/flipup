import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { isUsername, normalizeUsername, USERNAME_MAX } from '@/engine';
import { radius, spacing, typography, useColors } from '@/theme';

import { Button } from './button';
import { haptic } from './haptics';
import { ThemedText } from './themed-text';

/**
 * A sheet's worth of username: a big title, one line under it, an "@" field that opens the keyboard with the sheet,
 * and the button. `run` saves or looks the name up and returns a sentence when it can't.
 */
export function UsernameSheet({ title, line, button, start = '', run }: { title: string; line: string; button: string; start?: string; run: (username: string) => Promise<string | null> }) {
  const colors = useColors();
  const [text, setText] = useState(start);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const value = normalizeUsername(text);
  const ok = isUsername(value);
  const go = async () => {
    if (busy) return;
    if (!ok) {
      setError('Use 2 to 20 letters, numbers, dots or underscores, starting with a letter.');
      haptic.failure();
      return;
    }
    setBusy(true);
    setError('');
    const problem = await run(value).catch((e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.'));
    setBusy(false);
    if (problem) {
      setError(problem);
      haptic.failure();
    } else haptic.success();
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl, gap: spacing.lg }} bounces={false}>
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          {line}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', overflow: 'hidden', minHeight: 64, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, borderWidth: 3, borderColor: error ? colors.red : 'transparent' }}>
        <Text maxFontSizeMultiplier={1.4} style={{ ...typography.title2, color: colors.tertiaryLabel }}>
          @
        </Text>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t.replace(/\s/g, '').toLowerCase());
            setError('');
          }}
          placeholder="username"
          placeholderTextColor={colors.quaternaryLabel}
          accessibilityLabel="Username"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="username"
          keyboardType="ascii-capable"
          returnKeyType="done"
          maxLength={USERNAME_MAX + 1}
          onSubmitEditing={() => void go()}
          maxFontSizeMultiplier={1.4}
          style={{ ...typography.title2, flex: 1, minWidth: 0, width: '100%', color: colors.label, paddingVertical: spacing.sm, paddingLeft: 2, outlineWidth: 0 } as object}
        />
      </View>
      <View style={{ minHeight: 22 }} accessibilityLiveRegion="polite">
        {error ? (
          <ThemedText accessibilityRole="alert" variant="subhead" tone="red" style={{ textAlign: 'center' }}>
            {error}
          </ThemedText>
        ) : null}
      </View>
      <Button variant="party" tint="blue" size="lg" title={button} loading={busy} disabled={!value} onPress={() => void go()} />
    </ScrollView>
  );
}
