// A Bot Lab setting, 0 to 10, set with the table's raise slider (the owner, 17 Nov 2026: the round dials were turned
// by dragging up or down, which fought the page's own scroll and was hard to use). One row: the setting's name and
// what it means right now on the left, the number on the right, the slider under them, and the two ends' words under
// the slider. Drag anywhere on it or tap a spot; it ticks once a step and a little firmer at 0 and 10.
//
// Motion (docs/MOTION.md): the slider's own (rule 14: the thumb is under the finger, never tweened; rule 5: it
// stretches while held; it settles without overshoot when let go). The number changes in place.
import { Text, View } from 'react-native';

import { dialWord, type LabDial } from '@/engine';
import { brand, ROUNDED } from '@/theme';

import { RaiseSlider } from '../table/raise-slider';
import { ThemedText } from '../themed-text';

/** Touch room above and below each slider, so a finger that lands near it still turns it (see `reach` in RaiseSlider). */
const REACH = 14;

export function DialSlider({ dial, value, onChange, onDrag }: { dial: LabDial; value: number; onChange: (v: number) => void; onDrag?: (dragging: boolean) => void }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="headline" numberOfLines={1}>
            {dial.name}
          </ThemedText>
          <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1}>
            {dialWord(dial, value)}
          </ThemedText>
        </View>
        <Text maxFontSizeMultiplier={1.2} accessibilityElementsHidden importantForAccessibility="no" style={{ fontFamily: ROUNDED, fontSize: 28, lineHeight: 32, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'right' }}>
          {value}
        </Text>
      </View>
      <RaiseSlider
        value={value}
        min={0}
        max={10}
        step={1}
        notches={10}
        tint={brand.violetDark}
        label={dial.name}
        valueText={`${value}, ${dialWord(dial, value)}`}
        onChange={onChange}
        onDrag={onDrag}
        reach={REACH}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.66)', flexShrink: 1 }}>
          {dial.low}
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.66)', flexShrink: 1, textAlign: 'right' }}>
          {dial.high}
        </Text>
      </View>
    </View>
  );
}
