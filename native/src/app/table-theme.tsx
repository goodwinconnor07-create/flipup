import { Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FELTS, RAILS, type Rail } from '@design/tableLooks';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { Row, Section } from '@/components/grouped-list';
import { SegmentedControl } from '@/components/segmented-control';
import { Switch } from '@/components/switch';
import { PlayingCard } from '@/components/table/playing-card';
import { FELT_WEAVE, WOOD_GRAIN } from '@/components/table/textures';
import { ThemedText } from '@/components/themed-text';
import { setTableLook, useTableLook } from '@/state/prefs';
import { gradient, spacing, useColors } from '@/theme';

/** Felt colour and rail for your Texas Hold'em tables, with a live preview. Only changes how it looks on this phone. */
export default function TableTheme() {
  const colors = useColors();
  const look = useTableLook();
  const rail = RAILS.find((r) => r.id === look.rail)!.colors;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Table theme' }} />
      <View style={{ height: 120, padding: 9, borderRadius: 999, ...gradient(`${look.rail === 'wood' ? `${WOOD_GRAIN}, ` : ''}linear-gradient(165deg, ${rail[0]}, ${rail[1]})`) }}>
        <View style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, ...gradient(`${FELT_WEAVE}, linear-gradient(${look.felt}, ${look.felt})`), boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.45)' }}>
          {look.logo && (
            <Text pointerEvents="none" accessible={false} maxFontSizeMultiplier={1} style={{ position: 'absolute', fontSize: 44, fontWeight: '800', letterSpacing: -1, color: 'white', opacity: 0.09 }}>
              FlipUp
            </Text>
          )}
          {['As', 'Kh', '7d', 'Tc', '2s'].map((c) => (
            <PlayingCard key={c} card={c} width={34} />
          ))}
        </View>
      </View>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase' }}>
        Felt
      </ThemedText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Felt colour" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {FELTS.map((f) => {
          const on = look.felt.toLowerCase() === f.felt;
          return (
            <Pressable
              key={f.felt}
              accessibilityRole="radio"
              accessibilityLabel={f.name}
              accessibilityState={{ checked: on }}
              onPress={() => {
                haptic.select();
                setTableLook({ felt: f.felt });
              }}
              style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: f.felt, borderWidth: 3, borderColor: on ? colors.accent : 'transparent' }}
            >
              {on && <Icon name="checkmark" size={18} color="#ffffff" />}
            </Pressable>
          );
        })}
      </View>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase', marginTop: spacing.sm }}>
        Rail
      </ThemedText>
      <SegmentedControl<Rail> label="Rail" value={look.rail} options={RAILS.map((r) => ({ value: r.id, label: r.name }))} onChange={(r) => setTableLook({ rail: r })} />
      <Section footer="A faded FlipUp mark in the middle of the Texas Hold'em felt. The other games show their own.">
        <Row title="FlipUp logo" icon={{ symbol: 'suit.spade.fill', color: colors.green as string }} chevron={false} trailing={<Switch label="FlipUp logo" value={look.logo} onValueChange={(on) => setTableLook({ logo: on })} />} />
      </Section>
    </ScrollView>
  );
}
