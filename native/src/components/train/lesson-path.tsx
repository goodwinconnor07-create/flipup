import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, cardColors, radius, ROUNDED, spacing, useColors, usePlainColors, useScheme } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';
import { trickOf } from '../ranges/words';
import { handsLabel, weaveAt, type Lesson, type Unit } from './path';

const NODE = 72;
const EDGE = 6;
const RING = NODE + 18;
/** How far a node swings from the middle at most. */
const SWING = 76;

const UNIT_COLORS = [cardColors.violet, cardColors.night, cardColors.gold, cardColors.violet] as const;

/**
 * The lessons as a path you walk down, the way Duolingo does it: each unit opens with a coloured band (its number,
 * name and what it teaches, and a button to the tricks you've collected), then its lessons as big round buttons
 * that weave left and right. Collected lessons are gold, the one you're on is violet with a ring for how far you
 * are and a bobbing Start over it, open ones are violet, and the rest are grey with a lock. Tapping a lesson opens
 * its card under it with Start.
 */
export function LessonPath({ units, onStart, onTricks }: { units: Unit[]; onStart: (lesson: Lesson) => void; onTricks: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  let index = 0;
  return (
    <View style={{ gap: spacing.xl }}>
      {units.map((unit) => (
        <View key={unit.family} style={{ gap: spacing.lg }}>
          <UnitBand unit={unit} onTricks={onTricks} />
          <View style={{ gap: spacing.md, alignItems: 'center' }}>
            {unit.lessons.map((lesson) => {
              const at = index++;
              const open = picked === lesson.concept;
              return (
                <View key={lesson.concept} style={{ alignSelf: 'stretch', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ transform: [{ translateX: weaveAt(at) * SWING }], alignItems: 'center' }}>
                    {lesson.state === 'current' && <StartBubble again={lesson.done > 0} />}
                    <Node
                      lesson={lesson}
                      picked={open}
                      onPress={() => {
                        haptic.select();
                        setPicked(open ? null : lesson.concept);
                      }}
                    />
                  </View>
                  {open && <LessonCard lesson={lesson} onStart={() => onStart(lesson)} />}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function UnitBand({ unit, onTricks }: { unit: Unit; onTricks: () => void }) {
  const colors = UNIT_COLORS[(unit.number - 1) % UNIT_COLORS.length];
  const gold = colors === cardColors.gold;
  const ink = gold ? brand.goldInk : '#ffffff';
  const soft = gold ? 'rgba(59,38,0,0.72)' : 'rgba(255,255,255,0.78)';
  return (
    <LivingCard colors={colors} radius={radius.lg} grain={0.08} shadow="soft" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: soft }}>
          UNIT {unit.number} · {unit.collected} OF {unit.lessons.length}
        </Text>
        <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 27, fontWeight: '800', color: ink }}>
          {unit.name}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 14, lineHeight: 19, color: soft }}>
          {unit.line}
        </Text>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Your tricks in ${unit.name}`}
        onPress={onTricks}
        style={{ width: 48, height: 48, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: gold ? 'rgba(59,38,0,0.12)' : 'rgba(255,255,255,0.18)' }}
      >
        <Icon name="book.fill" size={20} color={ink} />
      </PressableScale>
    </LivingCard>
  );
}

/** One lesson: a chunky round button that presses down onto its edge. */
function Node({ lesson, picked, onPress }: { lesson: Lesson; picked: boolean; onPress: () => void }) {
  const plain = usePlainColors();
  const dark = useScheme() === 'dark';
  const locked = lesson.state === 'locked';
  const done = lesson.state === 'done';
  const face = done ? brand.gold : locked ? plain.cellPressed : brand.violet;
  // A grey button's edge: darker than its face in light mode, the page's own cell grey in dark.
  const edge = done ? brand.goldDeep : locked ? (dark ? plain.cell : 'rgba(0,0,0,0.16)') : brand.violetDeep;
  const ink = done ? brand.goldInk : locked ? plain.tertiaryLabel : '#ffffff';
  const fraction = lesson.goal ? lesson.done / lesson.goal : 0;
  const state = done ? 'collected' : locked ? 'locked' : lesson.state === 'current' ? 'up next' : `${Math.round(fraction * 100)}% done`;
  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      {lesson.state === 'current' && <ProgressRing value={fraction} track={dark ? 'rgba(139,109,255,0.25)' : '#e4dcff'} />}
      <Pressable accessibilityRole="button" accessibilityLabel={`${lesson.trick.nick}, ${state}`} accessibilityState={{ expanded: picked }} onPress={onPress} hitSlop={6}>
        {({ pressed }) => (
          <View style={{ width: NODE, height: NODE + EDGE, borderRadius: NODE / 2, backgroundColor: edge }}>
            <View
              style={{
                width: NODE,
                height: NODE,
                borderRadius: NODE / 2,
                backgroundColor: face,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ translateY: pressed ? EDGE : 0 }],
              }}
            >
              <Icon name={locked ? 'lock.fill' : done ? 'crown.fill' : lesson.trick.icon} size={30} color={ink} />
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function ProgressRing({ value, track }: { value: number; track: string }) {
  const stroke = 6;
  const r = (RING - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = RING / 2;
  return (
    <Svg width={RING} height={RING} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Circle cx={mid} cy={mid} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {value > 0.005 && <Circle cx={mid} cy={mid} r={r} stroke={brand.gold} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.min(1, value))} transform={`rotate(-90 ${mid} ${mid})`} />}
    </Svg>
  );
}

/** "Start" floating over the lesson you're on, bobbing gently (still under Reduce Motion or off screen). */
function StartBubble({ again }: { again: boolean }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce || !focused) {
      cancelAnimation(y);
      y.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    y.set(withRepeat(withSequence(withTiming(-5, { duration: 700, easing: ease }), withTiming(0, { duration: 700, easing: ease })), -1));
    return () => cancelAnimation(y);
  }, [reduce, focused, y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ alignItems: 'center', marginBottom: -spacing.xxs }, bob]}>
      <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: colors.cell, borderWidth: 2, borderColor: brand.violet }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: '800', letterSpacing: 1, color: colors.accent }}>
          {again ? 'KEEP GOING' : 'START'}
        </Text>
      </View>
      <View style={{ width: 12, height: 12, marginTop: -7, transform: [{ rotate: '45deg' }], backgroundColor: colors.cell, borderRightWidth: 2, borderBottomWidth: 2, borderColor: brand.violet }} />
    </Animated.View>
  );
}

/** The card a tapped lesson opens: what it teaches, how far you are, and Start (or why it's locked). */
function LessonCard({ lesson, onStart }: { lesson: Lesson; onStart: () => void }) {
  const locked = lesson.state === 'locked';
  const done = lesson.state === 'done';
  const look = done ? cardColors.gold : locked ? cardColors.night : cardColors.violet;
  const ink = done ? brand.goldInk : '#ffffff';
  const soft = done ? 'rgba(59,38,0,0.75)' : 'rgba(255,255,255,0.78)';
  const dots = Array.from({ length: lesson.goal }, (_, i) => (lesson.done >= i + 1 ? 1 : lesson.done > i ? 0.5 : 0));
  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ alignSelf: 'stretch' }}>
      <LivingCard colors={look} radius={radius.lg} grain={0.08} shadow="soft" still={locked} style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={{ gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 27, fontWeight: '800', color: ink }}>
            {lesson.trick.nick}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, lineHeight: 20, color: soft }}>
            {lesson.trick.line}
          </Text>
        </View>
        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="lock.fill" size={14} color={soft} />
            <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: soft }}>
              Collect {lesson.before ? trickOf(lesson.before).nick : 'the lesson before'} to open this one.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }} accessible accessibilityLabel={bestPlays(lesson)}>
              {dots.map((d, i) => (
                <View key={i} style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: done ? 'rgba(59,38,0,0.18)' : 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                  <View style={{ width: `${d * 100}%`, height: 8, borderRadius: 4, backgroundColor: done ? brand.goldInk : brand.gold }} />
                </View>
              ))}
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: soft, marginLeft: spacing.xxs }}>
                {done ? 'Collected' : bestPlays(lesson)}
              </Text>
            </View>
            <PressableScale accessibilityRole="button" accessibilityLabel={`${done ? 'Practise' : 'Start'} ${lesson.trick.nick}, ${handsLabel(lesson.hands)}`} onPress={onStart} style={{ borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: done ? brand.goldDeep : brand.paperEdge, paddingBottom: 4 }}>
              <View style={{ minHeight: 50, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: done ? brand.goldInk : brand.paper }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '800', color: done ? brand.gold : brand.violet }}>
                  {done ? 'Practise' : lesson.done > 0 ? 'Keep going' : 'Start'} · {handsLabel(lesson.hands)}
                </Text>
              </View>
            </PressableScale>
          </>
        )}
      </LivingCard>
    </Animated.View>
  );
}

const bestPlays = (l: Lesson) => `${Math.floor(l.done)} of ${l.goal} best play${l.goal === 1 ? '' : 's'}`;
