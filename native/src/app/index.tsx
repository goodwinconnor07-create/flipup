import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { GlassSurface } from '@/components/glass-surface';
import { Row, Section } from '@/components/grouped-list';
import { PlayTile } from '@/components/play-tile';
import { SegmentedControl } from '@/components/segmented-control';
import { Stepper } from '@/components/stepper';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { describeHand } from '@/engine';
import { gradient, gradients, party, radius, spacing, typography, useColors, type TypeStyle } from '@/theme';

// Phase 3: the design system on one page, so it can be checked on a phone (light, dark, large text) before any
// real screen is built on it. Phase 5 replaces this screen with Home.

const RAMP: TypeStyle[] = ['largeTitle', 'title1', 'title2', 'title3', 'headline', 'body', 'callout', 'subhead', 'footnote', 'caption1', 'caption2'];
const sample = describeHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);

export default function DesignSystem() {
  const colors = useColors();
  const [appearance, setAppearance] = useState<'auto' | 'light' | 'dark'>('auto');
  const [sound, setSound] = useState(true);
  const [rebuys, setRebuys] = useState(false);
  const [bots, setBots] = useState(4);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, gap: spacing.xxl }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <PlayTile title="Play with friends" subtitle="Share a code" emoji="🥳" tint="blue" onPress={() => {}} style={{ flex: 1 }} />
        <PlayTile title="Play with bots" subtitle="On this phone" emoji="🦊" tint="green" onPress={() => {}} style={{ flex: 1 }} />
      </View>

      <Section header="Appearance" footer="Auto follows the phone's light or dark setting.">
        <View style={{ padding: spacing.sm }}>
          <SegmentedControl
            label="Appearance"
            value={appearance}
            onChange={setAppearance}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </View>
      </Section>

      <Section header="You" footer="Switches, steppers and rows that open another screen.">
        <Row title="Sound" icon={{ symbol: 'speaker.wave.2.fill', color: party.pink, fallback: '🔊' }} accessory={<Switch label="Sound" value={sound} onValueChange={setSound} />} />
        <Row title="Rebuys" subtitle="Buy back in when you run out" icon={{ symbol: 'arrow.clockwise', color: party.green, fallback: '↻' }} accessory={<Switch label="Rebuys" value={rebuys} onValueChange={setRebuys} />} />
        <Row title="Bots" detail={String(bots)} icon={{ symbol: 'person.2.fill', color: party.blue, fallback: '🤖' }} accessory={<Stepper label="Bots" value={bots} min={1} max={8} onChange={setBots} />} />
        <Row title="Card packs" detail="Classic" icon={{ symbol: 'suit.spade.fill', color: '#5856d6', fallback: '♠' }} onPress={() => router.push('/sample-sheet')} />
        <Row title="Chat bubbles" detail="Green" icon={{ symbol: 'bubble.left.fill', color: '#af52de', fallback: '💬' }} onPress={() => router.push('/sample-sheet')} />
      </Section>

      <Section>
        <Row title="Leave table" destructive onPress={() => {}} />
      </Section>

      <View style={{ gap: spacing.sm }}>
        <Button variant="party" tint="blue" size="lg" title="Deal" />
        <Button variant="primary" title="Open the table" />
        <Button variant="secondary" title="Invite friends" />
        <Button variant="destructive" title="End the game" />
        <Button variant="primary" title="Loading" loading />
        <Button variant="primary" title="Disabled" disabled />
      </View>

      <View style={{ gap: spacing.xs }}>
        {RAMP.map((v) => (
          <ThemedText key={v} variant={v}>
            {v} {typography[v].fontSize}
          </ThemedText>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {(['background', 'cell', 'cellPressed', 'separator', 'label', 'secondaryLabel', 'tertiaryLabel', 'accent', 'green', 'red', 'gold', 'pink', 'violet', 'indigo'] as const).map((c) => (
          <View key={c} style={{ width: 72, gap: 4 }}>
            <View style={{ height: 44, borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: colors[c], borderWidth: 0.5, borderColor: colors.separator }} />
            <ThemedText variant="caption2" tone="tertiaryLabel">
              {c}
            </ThemedText>
          </View>
        ))}
        {Object.entries(gradients).map(([name, [a, b]]) => (
          <View key={name} style={{ width: 72, gap: 4 }}>
            <View style={{ height: 44, borderRadius: radius.sm, borderCurve: 'continuous', ...gradient(`linear-gradient(160deg, ${a}, ${b})`) }} />
            <ThemedText variant="caption2" tone="tertiaryLabel">
              {name}
            </ThemedText>
          </View>
        ))}
      </View>

      <GlassSurface style={{ borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignSelf: 'center' }}>
        <ThemedText variant="headline">Glass floats</ThemedText>
      </GlassSurface>

      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
        Shared engine loaded: {sample.name}
      </ThemedText>
    </ScrollView>
  );
}
