// Quick messages: a small round button on your box, and a panel of the fixed phrases and emoji (REACTIONS) that
// closes as soon as you pick one. Nothing typed is ever sent. A short cool-down stops a flood.
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { REACTIONS } from '@/engine';
import { dispatch } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

export function QuickMessages() {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const send = (id: string) => {
    if (cooling) return;
    haptic.tap();
    dispatch({ type: 'react', id });
    setOpen(false);
    setCooling(true);
    setTimeout(() => setCooling(false), 1800);
  };
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Quick messages"
        hitSlop={6}
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
        style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cell }}
      >
        <Icon name="bubble.left" size={17} color={colors.tertiaryLabel} />
      </PressableScale>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end', padding: spacing.md, paddingBottom: 180 }} onPress={() => setOpen(false)}>
          <View accessibilityRole="menu" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }}>
            {REACTIONS.map((r) => {
              const emoji = !/[A-Za-z]/.test(r.text);
              return (
                <PressableScale
                  key={r.id}
                  accessibilityRole="menuitem"
                  accessibilityLabel={r.text}
                  disabled={cooling}
                  onPress={() => send(r.id)}
                  style={{ minHeight: 44, minWidth: 44, paddingHorizontal: emoji ? spacing.xs : spacing.sm, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cellPressed }}
                >
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: emoji ? 24 : 16, fontWeight: '700', color: colors.label }}>
                    {r.text}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
