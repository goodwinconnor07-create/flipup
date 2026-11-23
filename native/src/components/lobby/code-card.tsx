import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { normalizeTableCode, TABLE_CODE_LENGTH, tableCodeProblem } from '@/engine';
import { EASE_IN_OUT, enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { joinLink } from '@/state/api';
import { brand, radius, ROUNDED, spacing, useColors, useLobbyTint } from '@/theme';

import { haptic } from '../haptics';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import { GrowingQR } from '../growing-qr';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { Swap, SwapIcon } from '../swap';
import { ThemedText } from '../themed-text';
import { Announce } from '../announce';

/**
 * The first card on Play with friends: the game code friends type in Join, as the card's hero (23 Nov 2026, from
 * EasyPoker's PIN screen): "GAME CODE", the code centred at 64pt, the line on how friends join, then Share invite as
 * a white capsule (the thing a host came to do) with Copy and QR as round icons beside it. QR opens the code to scan under it (the same QR grows, motion rule 20). The
 * host changes the code by tapping it (a small pencil beside it says so): the card turns into a field for their own
 * code (six letters or numbers, in any mix) with Cancel and Done; Done asks the server for it and stays open with the
 * server's sentence when it's taken. `onChange` answers null when the code is the table's now, a sentence when it
 * isn't, or '' to just close. `hint` is a line under the code (how friends join). While the table is still opening
 * (`code` null) the buttons wait, and a failure says Start game will try again.
 */
export function CodeCard({
  code,
  failed,
  share,
  onChange,
  hint,
}: {
  code: string | null;
  failed?: boolean;
  /** A line under the code, such as how friends join. */
  hint?: string;
  /** What Share sends (who's hosting, the game, the code and the link). */
  share?: { message: string; url: string };
  /** Missing: the code can't be changed (a player who isn't the host). */
  onChange?: (code: string) => Promise<string | null>;
}) {
  const colors = useColors();
  const panel = usePanel();
  const reduce = useReduceMotion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = () => {
    if (!code) return;
    void Clipboard.setStringAsync(code);
    haptic.success();
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };
  const start = () => {
    if (!code) return;
    haptic.tap();
    setDraft(code);
    setError('');
    setQr(false);
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
    if (!onChange) return;
    const answer = await onChange(draft);
    setBusy(false);
    if (answer === '') return setEditing(false);
    if (answer) {
      haptic.failure();
      return setError(answer);
    }
    haptic.success();
    setEditing(false);
  };

  const helper = error || (editing ? `${TABLE_CODE_LENGTH} letters or numbers, in any mix. Friends type this to join.` : code ? (hint ?? 'Friends tap Join a game in FlipUp and type it in.') : '');
  const wait = !code;

  return (
    <Animated.View
      layout={reduce ? undefined : LinearTransition.duration(300).easing(EASE_IN_OUT)}
      style={{
        padding: spacing.md,
        paddingTop: spacing.sm,
        gap: spacing.xxs,
        borderRadius: PANEL_RADIUS,
        borderCurve: 'continuous',
        backgroundColor: panel.fill,
        borderWidth: 1,
        borderColor: panel.edge,
      }}
    >
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: spacing.md }}>
          <ThemedText variant="subhead" tone="secondaryLabel" style={{ flex: 1 }}>
            New game code
          </ThemedText>
          <TextButton title="Cancel" quiet onPress={cancel} />
          <TextButton title={busy ? 'Saving' : 'Done'} bold onPress={() => void done()} />
        </View>
      ) : (
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ textAlign: 'center', fontWeight: '800', letterSpacing: 1, marginTop: spacing.xs }}>
          GAME CODE
        </ThemedText>
      )}

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
      ) : code ? (
        <Pressable
          disabled={!onChange}
          onPress={start}
          accessibilityRole={onChange ? 'button' : undefined}
          accessibilityHint={onChange ? 'Change the game code' : undefined}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, opacity: pressed ? 0.6 : 1 })}
        >
        <Swap id={code} kind="text" style={{ alignItems: 'center', flexShrink: 1 }}>
          <Text
            accessibilityLabel={`Game code ${code.split('').join(' ')}`}
            maxFontSizeMultiplier={1}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{ fontFamily: ROUNDED, fontSize: 64, lineHeight: 72, fontWeight: '900', letterSpacing: 3, color: colors.label }}
          >
            {code}
          </Text>
        </Swap>
        {onChange && <Icon name="pencil" size={18} weight="semibold" color={colors.tertiaryLabel as string} />}
        </Pressable>
      ) : (
        <View style={{ height: 72, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText tone="secondaryLabel" style={{ textAlign: 'center' }}>
            {failed ? 'Couldn’t open your table. Start game will try again.' : 'Getting your code…'}
          </ThemedText>
        </View>
      )}

      <Announce text={error ? helper : null} />
      {helper ? (
        <ThemedText
          variant={editing || error ? 'footnote' : 'subhead'}
          tone={error ? 'red' : editing ? 'tertiaryLabel' : 'secondaryLabel'}
          accessibilityLiveRegion="polite"
          style={editing ? undefined : { textAlign: 'center' }}
        >
          {helper}
        </ThemedText>
      ) : null}

      {!editing && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm, opacity: wait ? 0.4 : 1 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Share the game code"
            disabled={wait}
            onPress={() => {
              if (!code || !share) return;
              void Share.share(share);
            }}
            style={{ height: 48, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <Icon name="square.and.arrow.up" size={17} weight="bold" color="#0b0b0f" />
            <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#0b0b0f' }}>
              Share invite
            </Text>
          </PressableScale>
          <RoundIcon name={copied ? 'checkmark' : 'doc.on.doc'} label={copied ? 'Copied' : code ? `Copy the game code ${code}` : 'Copy'} onPress={copy} />
          <RoundIcon
            name="qrcode"
            on={qr}
            label={qr ? 'Hide the QR code' : 'Show the QR code'}
            onPress={() => {
              if (!code) return;
              haptic.select();
              setQr(!qr);
            }}
          />
        </View>
      )}

      {qr && code && !editing && (
        <Animated.View
          entering={enter(reduce)}
          exiting={exit(reduce)}
          style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm }}
        >
          <GrowingQR link={joinLink(code)} big reduce={reduce} />
          <ThemedText variant="footnote" tone="secondaryLabel" style={{ textAlign: 'center' }}>
            Friends scan it from Join on FlipUp&apos;s Play tab.
          </ThemedText>
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** A round icon button beside Share invite (Copy, QR): the page's tint on a faint fill, 44pt. */
function RoundIcon({ name, label, on, onPress }: { name: 'doc.on.doc' | 'checkmark' | 'qrcode'; label: string; on?: boolean; onPress: () => void }) {
  const tint = useLobbyTint();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={on === undefined ? undefined : { selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <SwapIcon name={name} size={18} weight="semibold" color={tint.link} />
    </Pressable>
  );
}

/** A plain text button in a card's top row: the page's tint, semibold, a dim on press. */
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
  const tint = useLobbyTint();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <Swap id={title} kind="text">
        <ThemedText
          variant="body"
          style={{ fontWeight: bold ? '700' : '600', color: quiet ? (colors.secondaryLabel as string) : tint.link }}
        >
          {title}
        </ThemedText>
      </Swap>
    </Pressable>
  );
}
