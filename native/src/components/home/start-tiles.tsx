import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { FRIENDS_ON } from '@/scope';
import { usePals } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { brand, cardColors, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';

/** Play with bots: night blue lifted enough to stand off the black page without an outline. */
const BOTS_TILE = ['#2a4396', '#18296a', '#0c173f'] as const;

/** Faces a bots table might seat (bots never wear a face from the profile picker). */
const BOT_FACES = ['🦊', '🐼', '🦉'];

/**
 * The two ways to sit down, side by side and big, the first thing under the title: Play with friends (your face
 * and an open + seat, on blue) and Play with bots (three bot faces, on night blue). Faces wear a ring in their
 * tile's colour so an overlapping stack reads as separate faces.
 */
/** `onGo` replaces opening Setup (a game's sheet closes itself first and passes its game); `height` for a smaller pair. */
export function StartTiles({ onGo, height = 150 }: { onGo?: (mode: 'friends' | 'bots') => void; height?: number } = {}) {
  const profile = useProfile();
  const pals = usePals();
  // Your face and friends' (with friends off, scope.ts, your face and an empty + seat: people join you).
  const friends = [profile.emoji || '🙂', ...(FRIENDS_ON ? pals.slice(0, 2).map((p) => p.emoji) : [])];
  if (FRIENDS_ON) while (friends.length < 3) friends.push('');
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile title="Play with friends" line="Invite up to 8 people" faces={friends} colors={cardColors.violet} bubble={FRIENDS_ON ? undefined : 'Join me!'} height={height} go={() => (onGo ? onGo('friends') : router.push('/play-friends'))} />
        <Tile title="Play with bots" line="Play right now" faces={BOT_FACES} colors={BOTS_TILE} glow="rgba(255, 255, 255, 0.14)" height={height} go={() => (onGo ? onGo('bots') : router.push('/play-bots'))} />
      </View>
      {!onGo && <JoinCard />}
    </View>
  );
}

/**
 * Across the bottom of the two tiles: the way into a table or party with a code or a QR code (the Join sheet). A
 * quieter grey panel than the tiles (the blue badge and chevron carry the colour), so the two ways to start a game
 * read first and joining reads as the lighter step.
 */
function JoinCard() {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <PressableTile label="Join a game. Type a code or scan" onPress={() => router.push('/join')}>
      <View style={{ height: 56, borderRadius: radius.full, boxShadow: shadows.card }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs + 2, paddingRight: spacing.md, borderRadius: radius.full, backgroundColor: colors.cell, overflow: 'hidden' }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}
          >
            <Icon name="qrcode.viewfinder" size={20} color="#ffffff" />
          </View>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.label }}>
            Join a game <Text style={{ fontWeight: '500', color: colors.secondaryLabel }}>· type a code or scan</Text>
          </Text>
          <Icon name="chevron.right" size={15} color={brand.violetDark} />
        </View>
      </View>
    </PressableTile>
  );
}

function Tile({ title, line, faces, colors, glow, bubble, height, go }: { title: string; line: string; faces: string[]; colors: readonly [string, string, string]; glow?: string; /** A short message beside the faces, said by the first one. */ bubble?: string; height: number; go: () => void }) {
  // Big enough to read on the tile: three overlapping faces fill about four fifths of a half-width tile.
  const { width } = useWindowDimensions();
  const inner = (width - spacing.md * 2 - spacing.sm) / 2 - (spacing.sm + 2) * 2;
  const face = Math.min(height <= 160 ? 52 : 56, Math.floor(inner / 2.6));
  return (
    <View style={{ flex: 1 }}>
      <PressableTile label={`${title}. ${line}`} onPress={go}>
        <LivingCard colors={colors} glow={glow} outerStyle={{ height }} style={{ flex: 1, padding: spacing.sm + 2, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {faces.map((f, i) => (
            <View
              key={i}
              style={{ width: face, height: face, borderRadius: face / 2, marginLeft: i ? -face * 0.2 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: f ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.18)', borderWidth: f ? 3 : 2, borderColor: f ? colors[1] : 'rgba(255,255,255,0.55)', borderStyle: f ? 'solid' : 'dashed' }}
            >
              {f ? (
                <Text style={{ fontSize: face * 0.58 }} maxFontSizeMultiplier={1}>
                  {f}
                </Text>
              ) : (
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#ffffff' }} maxFontSizeMultiplier={1}>
                  +
                </Text>
              )}
            </View>
          ))}
          {bubble && (
            <View style={{ flexShrink: 1, alignSelf: 'center', marginLeft: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.95)' }}>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 14, fontWeight: '800', color: colors[1] }}>
                {bubble}
              </Text>
            </View>
          )}
        </View>
        <View style={{ gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontFamily: ROUNDED, fontSize: 20, lineHeight: 23, fontWeight: '800', color: '#ffffff' }}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.82)' }}>
            {line}
          </Text>
        </View>
        </LivingCard>
      </PressableTile>
    </View>
  );
}

function PressableTile({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      haptics={false}
    >
      {children}
    </PressableScale>
  );
}
