// + Add Bot's menu in the lobbies: a small card that pops out of the Add button with a random bot first, then the
// bots you made in Bot Lab (a tap seats one), and a way into Bot Lab at the end.
//
// Motion (docs/MOTION.md): it grows from 95% out of the button it came from (rules 9 and 10), ease-out in 250ms,
// and closes quicker (200ms, rule 15) back towards it. No bounce. Under Reduce Motion it only fades.
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { labPersona, MAX_LAB_BOTS } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useLabBots, type LabBot } from '@/state/bot-lab';
import { brand, motion, ROUNDED, spacing } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { Face } from './face';

export interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WIDTH = 288;
const MAX_H = 380;

export function BotPicker({
  anchor,
  seated,
  onRandom,
  onLab,
  onClose,
}: {
  anchor: Anchor;
  /** Names already at the table, so a bot you seated shows as there. */
  seated: string[];
  onRandom: () => void;
  onLab: (bot: LabBot) => void;
  /** Runs once the menu has closed. */
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  // Somewhere to go once the menu has gone (Bot Lab), so the new page never opens under it.
  const [toLab, setToLab] = useState(false);
  const finish = () => {
    onClose();
    if (toLab) router.push('/bot-lab');
  };
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const bots = useLabBots();
  const here = new Set(seated.map((n) => n.toLowerCase()));

  // Below the button when there's room, else above it; kept on screen sideways.
  const room = height - (anchor.y + anchor.h) - insets.bottom - spacing.md;
  const below = room >= Math.min(MAX_H, 220) || anchor.y < height / 2;
  const left = Math.max(spacing.md, Math.min(width - WIDTH - spacing.md, anchor.x + anchor.w / 2 - WIDTH / 2));
  const maxH = Math.max(160, Math.min(MAX_H, below ? room : anchor.y - insets.top - spacing.md));
  // The card grows out of the button: its origin is the button's centre, measured from the card's own corner.
  const originX = anchor.x + anchor.w / 2 - left;

  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: motion.base, easing: EASE_OUT }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (closing) t.set(withTiming(0, { duration: motion.exit, easing: EASE_OUT }, (done) => done && runOnJS(finish)()));
  }, [closing]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ scale: reduce ? 1 : motion.popFrom + (1 - motion.popFrom) * t.get() }] }));
  const shade = useAnimatedStyle(() => ({ opacity: t.get() }));

  const close = () => setClosing(true);
  const row = (key: string, title: string, sub: string, lead: ReactNode, onPress: () => void, off = false) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={() => {
        haptic.tap();
        onPress();
        close();
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: 14, backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent', opacity: off ? 0.45 : 1 })}
    >
      {lead}
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
          {title}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 13, color: 'rgba(255,255,255,0.66)' }}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
  const round = (icon: 'dice.fill' | 'flask.fill') => (
    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(91,139,255,0.18)' }}>
      <Icon name={icon} size={18} color={brand.violetDark} />
    </View>
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }, shade]}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          {
            position: 'absolute',
            left,
            width: WIDTH,
            maxHeight: maxH,
            ...(below ? { top: anchor.y + anchor.h + 8 } : { bottom: height - anchor.y + 8 }),
            transformOrigin: `${originX}px ${below ? 0 : '100%'}`,
            borderRadius: 22,
            borderCurve: 'continuous',
            backgroundColor: '#18234a',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          },
          card,
        ]}
      >
        <ScrollView bounces={false} contentContainerStyle={{ padding: spacing.xs }}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff', paddingHorizontal: spacing.sm, paddingTop: 6, paddingBottom: 4 }}>
            Add a bot
          </Text>
          {row('random', 'Random bot', 'Someone from the roster', round('dice.fill'), onRandom)}
          {bots.length > 0 && (
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.5)', paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 2 }}>
              YOUR BOTS
            </Text>
          )}
          {bots.map((b) => {
            const sat = here.has(b.name.toLowerCase());
            return row(b.id, b.name, sat ? 'At the table' : labPersona(b.dials), <Face emoji={b.emoji} size={38} />, () => onLab(b), sat);
          })}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4, marginHorizontal: spacing.sm }} />
          {row(
            'lab',
            bots.length ? 'Bot Lab' : 'Make your own bots',
            bots.length ? `${bots.length} of ${MAX_LAB_BOTS} made` : 'Name them and set how they play',
            round('flask.fill'),
            () => setToLab(true),
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
