import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { FELTS, RAILS, type Rail } from '@design/tableLooks';
import { NativeMenu } from '@/components/native-menu';
import { PlayingCard } from '@/components/table/playing-card';
import { FELT_WEAVE, WOOD_GRAIN } from '@/components/table/textures';
import { setTableLook, useTableLook } from '@/state/prefs';
import { gradient, spacing } from '@/theme';

/** Felt colour and rail for your Texas Hold'em tables, with a live preview. Only changes how it looks on this phone. */
export default function TableTheme() {
  const look = useTableLook();
  const rail = RAILS.find((r) => r.id === look.rail)!.colors;
  const felt = FELTS.find((f) => f.felt === look.felt.toLowerCase())?.felt ?? FELTS[0].felt;
  const preview = (
    <View style={{ height: 120 + spacing.md * 2, padding: spacing.md }}>
      <View style={{ flex: 1, padding: 9, borderRadius: 999, ...gradient(`${look.rail === 'wood' ? `${WOOD_GRAIN}, ` : ''}linear-gradient(165deg, ${rail[0]}, ${rail[1]})`) }}>
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
    </View>
  );
  return (
    <>
      <Stack.Screen options={{ title: 'Table theme', headerTransparent: false }} />
      <NativeMenu
        top={preview}
        groups={[
          { id: 'felt', header: 'Felt', items: [{ kind: 'picker', id: 'felt', title: 'Felt colour', value: felt, options: FELTS.map((f) => ({ value: f.felt, label: f.name })), onChange: (v) => setTableLook({ felt: v }) }] },
          { id: 'rail', header: 'Rail', items: [{ kind: 'segmented', id: 'rail', title: 'Rail', stacked: true, value: look.rail, options: RAILS.map((r) => ({ value: r.id, label: r.name })), onChange: (r) => setTableLook({ rail: r as Rail }) }] },
          {
            id: 'logo',
            footer: "A faded FlipUp mark in the middle of the Texas Hold'em felt. The other games show their own.",
            items: [{ kind: 'toggle', id: 'logo', title: 'FlipUp logo', value: look.logo, onChange: (on) => setTableLook({ logo: on }) }],
          },
        ]}
      />
    </>
  );
}
