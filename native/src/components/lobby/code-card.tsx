import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { normalizeTableCode, TABLE_CODE_LENGTH, tableCodeProblem } from '@/engine';
import { brand, radius, ROUNDED, spacing, useColors } from '@/theme';

import { haptic } from '../haptics';
import { ThemedText } from '../themed-text';

/**
 * `onChange` answers null when the code is the table's now, a sentence to show when it isn't, or '' to just close.
 *
 * The lobby's first card: the game code friends type on their Join tab, big, with Copy and Change as plain text
 * buttons in the card's top row (no pills). Change turns the card into a field for the host's own code (six
 * letters or numbers, in any mix), with Cancel and Done; Done asks the server for it and stays open with the
 * server's sentence when it's taken. Only the host sees Change.
 */
export function CodeCard({ code, host, onChange }: { code: string; host: boolean; onChange: (code: string) => Promise<string | null> }) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = () => {
    void Clipboard.setStringAsync(code);
    haptic.success();
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };
  const start = () => {
    haptic.tap();
    setDraft(code);
    setError('');
    setEditing(true);
  };
  const cancel = () => {
    if (busy) return;
    haptic.tap();
    setEditing(false);
    setError('');
  };
  const done = async () => {
    if (busy) return;
    if (draft === code) return setEditing(false);
    const problem = tableCodeProblem(draft);
    if (problem) {
      haptic.failure();
      return setError(problem);
    }
    setBusy(true);
    const answer = await onChange(draft);
    setBusy(false);
    // An empty answer: the host thought better of it (the lobby's confirm), so the card just closes.
    if (answer === '') return setEditing(false);
    if (answer) {
      haptic.failure();
      setError(answer);
      return;
    }
    haptic.success();
    setEditing(false);
  };

  const helper = error || (editing ? `${TABLE_CODE_LENGTH} letters or numbers, in any mix. Friends type this to join.` : '');

  return (
    <View
      style={{
        padding: spacing.md,
        paddingTop: spacing.sm,
        gap: spacing.xxs,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.cell,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: spacing.md }}>
        <ThemedText variant="subhead" tone="secondaryLabel" style={{ flex: 1 }}>
          {editing ? 'New game code' : 'Game code'}
        </ThemedText>
        {editing ? (
          <>
            <TextButton title="Cancel" quiet onPress={cancel} />
            {busy ? <ActivityIndicator color={brand.violetDark} /> : <TextButton title="Done" bold onPress={() => void done()} />}
          </>
        ) : (
          <>
            <TextButton title={copied ? 'Copied' : 'Copy'} onPress={copy} label={`Copy the game code ${code}`} />
            {host && <TextButton title="Change" onPress={start} label="Change the game code" />}
          </>
        )}
      </View>

      {editing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={(t) => {
            setDraft(normalizeTableCode(t));
            setError('');
          }}
          onSubmitEditing={() => void done()}
          editable={!busy}
          accessibilityLabel="New game code"
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          keyboardType="ascii-capable"
          returnKeyType="done"
          maxLength={TABLE_CODE_LENGTH + 4}
          selectionColor={brand.violetDark}
          maxFontSizeMultiplier={1}
          style={{
            marginTop: spacing.xxs,
            height: 64,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: error ? (colors.red as string) : brand.violetDark,
            backgroundColor: colors.background,
            color: colors.label,
            fontFamily: ROUNDED,
            fontSize: 38,
            fontWeight: '800',
            letterSpacing: 2,
          }}
        />
      ) : (
        <Text
          accessibilityLabel={`Game code ${code.split('').join(' ')}`}
          maxFontSizeMultiplier={1}
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ fontFamily: ROUNDED, fontSize: 48, lineHeight: 56, fontWeight: '800', letterSpacing: 2, color: colors.label }}
        >
          {code}
        </Text>
      )}

      {helper ? (
        <ThemedText variant="footnote" tone={error ? 'red' : 'tertiaryLabel'} accessibilityLiveRegion="polite">
          {helper}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** A plain text button in a card's top row: violet, semibold, a dim on press. */
export function TextButton({
  title,
  onPress,
  label,
  quiet,
  bold,
}: {
  title: string;
  onPress: () => void;
  label?: string;
  quiet?: boolean;
  bold?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <ThemedText
        variant="body"
        style={{ fontWeight: bold ? '700' : '600', color: quiet ? (colors.secondaryLabel as string) : brand.violetDark }}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}
