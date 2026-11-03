import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { usePals } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { gradient, party, radius, ROUNDED, spacing, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';

/** Faces a bots table might seat (bots never wear a face from the profile picker). */
const BOT_FACES = ['🦊', '🐼', '🦉'];

/**
 * The two ways to sit down, side by side and big, the first thing under the title: Play with friends (your face
 * and your friends', on the party pink) and Play with bots (three bot faces, on blue). Each opens Setup.
 */
export function StartTiles() {
  const profile = useProfile();
  const pals = usePals();
  const friends = [profile.emoji || '🙂', ...pals.slice(0, 2).map((p) => p.emoji)];
  while (friends.length < 3) friends.push('');
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Tile title="Play with friends" line="Online table" faces={friends} colors={[party.pink, '#8b2cf5']} mode="friends" />
      <Tile title="Play with bots" line="Start right now" faces={BOT_FACES} colors={[party.blue, '#3a2fd6']} mode="bots" />
    </View>
  );
}

function Tile({ title, line, faces, colors: [top, bottom], mode }: { title: string; line: string; faces: string[]; colors: [string, string]; mode: 'friends' | 'bots' }) {
  const shadow = useShadows();
  return (
    <View style={{ flex: 1 }}>
      <PressableTile
        label={`${title}. ${line}`}
        onPress={() => router.push({ pathname: '/setup', params: { mode } })}
        style={{ height: 184, padding: spacing.md, justifyContent: 'space-between', borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: shadow.soft, borderBottomWidth: 4, borderBottomColor: party.edge, ...gradient(`linear-gradient(155deg, ${top} 0%, ${bottom} 100%)`) }}
      >
        <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {faces.map((f, i) => (
            <View
              key={i}
              style={{ width: 46, height: 46, borderRadius: 23, marginLeft: i ? -12 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: f ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: f ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.5)', borderStyle: f ? 'solid' : 'dashed' }}
            >
              {f ? (
                <Text style={{ fontSize: 26 }} maxFontSizeMultiplier={1}>
                  {f}
                </Text>
              ) : (
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#ffffff' }} maxFontSizeMultiplier={1}>
                  +
                </Text>
              )}
            </View>
          ))}
        </View>
        <View style={{ gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 27, fontWeight: '800', color: '#ffffff' }}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.82)' }}>
            {line}
          </Text>
        </View>
      </PressableTile>
    </View>
  );
}

function PressableTile({ label, onPress, style, children }: { label: string; onPress: () => void; style: ViewStyle; children: ReactNode }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      haptics={false}
      style={style}
    >
      {children}
    </PressableScale>
  );
}
