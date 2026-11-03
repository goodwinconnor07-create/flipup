import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { CODE_ALPHABET, CODE_LENGTH } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, usePlainColors } from '@/theme';

import { haptic } from './haptics';
import { ThemedText } from './themed-text';

// Typing a 5-letter code (a table, a party or a friend): five boxes over the iPhone's own keyboard. A hidden text
// field takes the typing (and a pasted code); the boxes show it. Codes never use vowels or Y, so those letters are
// dropped as you type, with a word under the boxes saying why.

export interface CodeState {
  code: string;
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
}

/** The code typed so far. `run` is called once all five letters are in, and returns an error sentence, or null when it worked. */
export function useCode(run: (code: string) => Promise<string | null>): CodeState {
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
    if (busy || code.length >= CODE_LENGTH || !CODE_ALPHABET.includes(letter)) return;
    const next = code + letter;
    setCode(next);
    setError('');
    if (next.length === CODE_LENGTH) void submit(next);
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
    const next = upper.split('').filter((ch) => CODE_ALPHABET.includes(ch)).join('').slice(0, CODE_LENGTH);
    setError(/[A-Z]/.test(upper) && upper.length > next.length && next.length < CODE_LENGTH ? 'Codes have no vowels or Y.' : '');
    setCode(next);
    if (next.length === CODE_LENGTH && next !== code) void submit(next);
  };

  return { code, busy, error, misses, type, erase, fill, setText, setError };
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
  useEffect(() => {
    if (focus) {
      const t = setTimeout(() => input.current?.focus(), 350);
      return () => clearTimeout(t);
    }
    input.current?.blur();
  }, [focus]);

  return (
    <View style={{ gap: spacing.md }}>
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }, shaking]}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const letter = code[i];
          const next = i === code.length && !busy;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                maxWidth: 60,
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
          value={code}
          onChangeText={state.setText}
          editable={!busy}
          accessibilityLabel={label}
          accessibilityHint="Five letters"
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          keyboardType="ascii-capable"
          returnKeyType="done"
          caretHidden
          maxLength={CODE_LENGTH + 4}
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
            Five letters, no vowels.
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
