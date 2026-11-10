import { useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, useColors, useShadows, ROUNDED } from '@/theme';

import { haptic } from './haptics';
import type { MenuProps } from './menu.types';

type Anchor = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

/**
 * The pull-down menu where there's no SwiftUI (the web build): a rounded list that drops from the trigger, groups
 * split by a thicker line, destructive items in red. A tap outside closes it.
 */
export function Menu({ sections, title, children, label, fill }: MenuProps) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const shadow = useShadows();
  const anchor = useRef<Anchor | null>(null);
  const [at, setAt] = useState<{ x: number; y: number; w: number } | null>(null);
  const groups = sections.filter((s) => s.length > 0);
  const open = () => {
    haptic.tap();
    anchor.current?.measureInWindow((x, y, w, h) => setAt({ x, y: y + h + 6, w }));
  };
  const width = 250;
  return (
    <>
      <Pressable ref={anchor as never} accessibilityRole="button" accessibilityLabel={label} onPress={open} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, fill ? { alignSelf: 'stretch' } : null]}>
        {children}
      </Pressable>
      <Modal transparent visible={!!at} animationType="fade" onRequestClose={() => setAt(null)}>
        <Pressable accessibilityLabel="Close the menu" onPress={() => setAt(null)} style={{ flex: 1 }}>
          {at && (
            // Grows out of the trigger's corner from 95% (motion rules 10 and 11), never from the middle.
            <Animated.View
              entering={reduce ? undefined : popIn()}
              style={{ position: 'absolute', top: at.y, left: Math.max(spacing.md, Math.min(at.x + at.w - width, at.x)), transformOrigin: at.x + at.w - width > at.x ? 'top left' : 'top right', width, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cell, boxShadow: shadow.raised }}>
              {title && (
                <Text style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxs, fontFamily: ROUNDED, fontSize: 13, color: colors.secondaryLabel }}>{title}</Text>
              )}
              {groups.map((items, g) => (
                <View key={g} style={{ borderTopWidth: g ? 6 : 0, borderTopColor: colors.background }}>
                  {items.map((item, i) => (
                    <Pressable
                      key={item.title}
                      accessibilityRole="menuitem"
                      onPress={() => {
                        setAt(null);
                        haptic.tap();
                        item.onPress();
                      }}
                      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator, backgroundColor: pressed ? colors.cellPressed : 'transparent' })}
                    >
                      <Text style={{ fontFamily: ROUNDED, fontSize: 17, color: item.destructive ? colors.red : colors.label }}>{item.title}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
