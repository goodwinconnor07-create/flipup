import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { CODE_ALPHABET, CODE_LENGTH, isCode, normalizeTableCode, TABLE_CODE_LENGTH } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, usePlainColors } from '@/theme';

import { haptic } from './haptics';
import { ThemedText } from './themed-text';

// Typing a code over the iPhone's own keyboard: a hidden text field takes the typing (and a pasted code); the boxes
// show it. A table code is six letters or numbers (ACES42); a party code is five letters with no vowels or Y, so
// those are dropped as you type, with a word under the boxes saying why. An older five-letter code (a party, or a
// table opened on the web) still goes in at a table code's boxes: type it and press Go.

/** Which code the boxes take. */
export type CodeKind = 'table' | 'party';

export interface CodeState {
  code: string;
  /** How many boxes. */
  length: number;
  kind: CodeKind;
  /** The keyboard's Go: looks up an older five-letter code at a table code's six boxes. */
  go: () => void;
  busy: boolean;
  error: string;
  /** Counts wrong codes, so each one shakes the boxes again. */
  misses: number;
  type: (letter: string) => void;
  erase: () => void;
  /** Puts a whole code in (from a QR scan) and looks it up. */
  fill: (code: string) => void;
  /** Takes whatever is in the text field: upper-cased, only code letters, at most five. */
  setText: (text: string) => void;
  setError: (error: string) => void;
  /** Empties the boxes and stops looking, for a screen that's shown again after a code took you somewhere. */
  reset: () => void;
}

/** The code typed so far. `run` is called once all five letters are in, and returns an error sentence, or null when it worked. */
export function useCode(run: (code: string) => Promise<string | null>, kind: CodeKind = 'party'): CodeState {
  const length = kind === 'table' ? TABLE_CODE_LENGTH : CODE_LENGTH;
  const allowed = (ch: string) => (kind === 'table' ? /^[A-Z0-9]$/.test(ch) : CODE_ALPHABET.includes(ch));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [misses, setMisses] = useState(0);
  const looking = useRef(false);

  const submit = async (value: string) => {
    if (looking.current) return;
    looking.current = true;
    setBusy(true);
    setError('');
    let problem: string | null;
    try {
      problem = await run(value);
    } catch {
      problem = "Couldn't look that up. Try again.";
    }
    looking.current = false;
    if (!problem) {
      haptic.success();
      return;
    }
    // A wrong code starts over, so there's nothing to backspace through.
    setBusy(false);
    setCode('');
    setError(problem);
    setMisses((n) => n + 1);
    haptic.failure();
  };

  const type = (letter: string) => {
    if (busy || code.length >= length || !allowed(letter)) return;
    const next = code + letter;
    setCode(next);
    setError('');
    if (next.length === length) void submit(next);
  };

  const erase = () => {
    if (busy) return;
    setCode((c) => c.slice(0, -1));
    setError('');
  };

  const fill = (value: string) => {
    if (busy || looking.current) return;
    setCode(value);
    void submit(value);
  };

  const setText = (text: string) => {
    if (busy) return;
    const upper = text.toUpperCase();
    const next = kind === 'table' ? normalizeTableCode(upper) : upper.split('').filter((ch) => CODE_ALPHABET.includes(ch)).join('').slice(0, CODE_LENGTH);
    setError(kind === 'party' && /[A-Z]/.test(upper) && upper.length > next.length && next.length < CODE_LENGTH ? 'Party codes have no vowels or Y.' : '');
    setCode(next);
    if (next.length === length && next !== code) void submit(next);
  };

  const reset = () => {
    looking.current = false;
    setBusy(false);
    setCode('');
    setError('');
  };

  const go = () => {
    if (busy || code.length === length) return;
    if (kind === 'table' && isCode(code)) void submit(code);
    else if (code.length) setError(kind === 'table' ? `Codes are ${length} letters or numbers.` : `Codes are ${length} letters.`);
  };

  return { code, length, kind, go, busy, error, misses, type, erase, fill, setText, setError, reset };
}

/** The five boxes over a hidden text field, so the iPhone keyboard types into them, and the spinner or error under them. */
export function CodePad({ state, label, focus = true }: { state: CodeState; label: string; focus?: boolean }) {
  const { code, busy, error, misses } = state;
  const c = usePlainColors();
  const reduce = useReduceMotion();
  // A wrong code shakes the boxes, as the web's `shake` keyframes do.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!misses || reduce) return;
    const step = { duration: 56, easing: Easing.inOut(Easing.quad) };
    shake.set(withSequence(withTiming(-8, step), withTiming(8, step), withTiming(-6, step), withTiming(6, step), withTiming(-3, step), withTiming(0, step)));
  }, [misses]); // eslint-disable-line react-hooks/exhaustive-deps
  const shaking = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  // The keyboard comes up with the screen, the way the phone's own code fields do: the field asks for focus as
  // it mounts (autoFocus) and whenever the tab comes back. If iOS ignored that ask mid-transition, one retry
  // follows once the transition has settled, but only when the field still isn't focused.
  useEffect(() => {
    if (!focus) {
      input.current?.blur();
      return;
    }
    input.current?.focus();
    const t = setTimeout(() => {
      if (!input.current?.isFocused()) input.current?.focus();
    }, 300);
    return () => clearTimeout(t);
  }, [focus]);

  return (
    <View style={{ gap: spacing.md }}>
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }, shaking]}>
        {Array.from({ length: state.length }, (_, i) => {
          const letter = code[i];
          const next = i === code.length && !busy;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                maxWidth: state.length > 5 ? 54 : 60,
                height: 72,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: next ? c.surface : letter ? c.blueBg : c.cellPressed,
                borderWidth: 3,
                borderColor: error ? c.red : next ? c.accent : 'transparent',
              }}
            >
              {letter ? (
                <Animated.Text key={`${i}-${letter}`} entering={reduce ? undefined : ZoomIn.springify().mass(1).stiffness(450).damping(22)} maxFontSizeMultiplier={1} style={{ fontSize: 34, fontWeight: '700', color: c.label }}>
                  {letter}
                </Animated.Text>
              ) : next ? (
                <Caret color={c.accent} still={reduce} />
              ) : null}
            </View>
          );
        })}
        {/* The field that takes the typing, laid over the boxes so a tap on them brings the keyboard back. */}
        <TextInput
          ref={input}
          autoFocus={focus}
          value={code}
          onChangeText={state.setText}
          editable={!busy}
          accessibilityLabel={label}
          accessibilityHint={state.kind === 'table' ? 'Six letters or numbers' : 'Five letters'}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          keyboardType="ascii-capable"
          returnKeyType="go"
          onSubmitEditing={state.go}
          blurOnSubmit={false}
          caretHidden
          maxLength={state.length + 4}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 1, borderWidth: 0, backgroundColor: 'transparent', outlineWidth: 0 }}
        />
      </Animated.View>

      <View accessibilityLiveRegion="polite" style={{ minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
        {busy ? (
          <ActivityIndicator accessibilityLabel="Looking it up" />
        ) : error ? (
          <ThemedText accessibilityRole="alert" variant="subhead" tone="red" style={{ textAlign: 'center' }}>
            {error}
          </ThemedText>
        ) : (
          <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
            {state.kind === 'table' ? 'Six letters or numbers, like ACES42.' : 'Five letters, no vowels.'}
          </ThemedText>
        )}
      </View>

    </View>
  );
}

/** The blinking cursor in the box waiting for a letter (the web's `code-caret`: on, off, each half a second). */
function Caret({ color, still }: { color: string; still: boolean }) {
  const on = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    on.set(withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 500 }), withTiming(1, { duration: 0 })), -1));
  }, [still]); // eslint-disable-line react-hooks/exhaustive-deps
  const look = useAnimatedStyle(() => ({ opacity: on.get() }));
  return <Animated.View style={[{ width: 3, height: 34, borderRadius: 2, backgroundColor: color }, look]} />;
}
