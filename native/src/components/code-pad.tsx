import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { CODE_ALPHABET, CODE_LENGTH } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, usePlainColors } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

// Typing a 5-letter code (a table, a party or a friend), as the web's CodePad: five boxes and a keyboard laid out
// like the phone's own, so every letter is where you'd expect it. Codes never use vowels or Y, so those keys are
// greyed out. The phone's keyboard never opens.

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

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

  return { code, busy, error, misses, type, erase, fill };
}

/** The five boxes, the spinner or error under them, and the keyboard. */
export function CodePad({ state, label }: { state: CodeState; label: string }) {
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

  return (
    <View style={{ gap: spacing.md }}>
      <Animated.View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${label}: ${code.split('').join(' ') || 'empty'}`}
        style={[{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }, shaking]}
      >
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
            Codes have no vowels, so those keys are off.
          </ThemedText>
        )}
      </View>

      <View accessibilityLabel={`${label} letters`} style={{ gap: spacing.xs }}>
        {ROWS.map((row, r) => (
          <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {row.split('').map((letter) => {
              const usable = CODE_ALPHABET.includes(letter);
              return (
                <Key key={letter} label={letter} disabled={busy || !usable} hidden={!usable} onPress={() => state.type(letter)}>
                  <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 22, fontWeight: '600', color: c.label }}>
                    {letter}
                  </Text>
                </Key>
              );
            })}
            {r === ROWS.length - 1 && (
              <Key label="Delete" wide disabled={busy || code.length === 0} onPress={state.erase}>
                <Icon name="delete.left" size={20} color={c.label} />
              </Key>
            )}
          </View>
        ))}
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

/** One key: a grey tile that darkens while pressed, with a light tap. Unusable letters are faded and skipped by VoiceOver. */
function Key({ label, children, disabled, hidden, wide, onPress }: { label: string; children: React.ReactNode; disabled?: boolean; hidden?: boolean; wide?: boolean; onPress: () => void }) {
  const c = usePlainColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: wide ? 1.5 : 1,
        maxWidth: wide ? 66 : 44,
        height: 52,
        borderRadius: radius.sm,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.separator : c.cell,
        opacity: hidden ? 0.3 : disabled ? 0.5 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
