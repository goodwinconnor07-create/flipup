import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { INK } from '@design/gameArt';
import { FRIENDS_ON } from '@/scope';
import { usePals } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { brand, cardColors, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

/** Play with bots: night blue, the quieter of the two. */
const BOTS_TILE = cardColors.night;

/** Faces a bots table might seat (bots never wear a face from the profile picker). */
const BOT_FACES = ['🦊', '🐼', '🦉'];

/**
 * The two ways to sit down, side by side and big, the first thing under the title: Play with friends (your face
 * and an open + seat, on blue) and Play with bots (three bot faces, on night blue). Each is built like a
 * game tile: a flat colour, the faces outlined in the pictures' ink, and the words on a darker band.
 */
/** `onGo` replaces opening Setup (a game's sheet closes itself first and passes its game); `height` for a smaller pair. */
export function StartTiles({ onGo, height = 164 }: { onGo?: (mode: 'friends' | 'bots') => void; height?: number } = {}) {
  const profile = useProfile();
  const pals = usePals();
  // Your face and friends' (with friends off, scope.ts, your face and an empty + seat: people join you).
  const friends = [profile.emoji || '🙂', ...(FRIENDS_ON ? pals.slice(0, 2).map((p) => p.emoji) : [])];
  if (FRIENDS_ON) while (friends.length < 3) friends.push('');
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile title={'Play with\nfriends'} line="Invite up to 8 people" faces={friends} addSeat={!FRIENDS_ON} colors={cardColors.violet} height={height} go={() => (onGo ? onGo('friends') : router.push('/play-friends'))} />
        <Tile title={'Play with\nbots'} line="Play right now" faces={BOT_FACES} colors={BOTS_TILE} height={height} go={() => (onGo ? onGo('bots') : router.push('/play-bots'))} />
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
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 16, fontWeight: '700', color: colors.label }}>
            Join a game <Text style={{ fontWeight: '500', color: colors.secondaryLabel }}>· code or scan</Text>
          </Text>
          <Icon name="chevron.right" size={15} color={brand.violetDark} />
        </View>
      </View>
    </PressableTile>
  );
}

function Tile({ title, line, faces, colors, addSeat, height, go }: { title: string; line: string; faces: string[]; colors: readonly [string, string, string]; /** A round + after the faces: people join you with the game code. */ addSeat?: boolean; height: number; go: () => void }) {
  const shadows = useShadows();
  // Big enough to read on the tile: three overlapping faces fill about four fifths of a half-width tile.
  const { width } = useWindowDimensions();
  const inner = (width - spacing.md * 2 - spacing.sm) / 2 - spacing.md * 2;
  const face = Math.min(height <= 160 ? 52 : 56, Math.floor(inner / 2.5));
  // "Play with" small over the one word that differs, so the two tiles read apart at a glance.
  const [eyebrow, word] = title.split('\n');
  const label = `${eyebrow} ${word}`;
  const ring = { borderWidth: 3, borderColor: INK } as const;
  return (
    <View style={{ flex: 1 }}>
      <PressableTile label={`${label}. ${line}`} onPress={go}>
        {/* Built like a game tile: a flat colour with the faces as the picture, and the words on a darker band. */}
        <View style={{ height, borderRadius: radius.xl, borderCurve: 'continuous', boxShadow: shadows.raised }}>
          <View style={{ flex: 1, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors[1] }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {faces.map((f, i) => (
                <View key={i} style={{ width: face, height: face, borderRadius: face / 2, marginLeft: i ? -face * 0.22 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: f ? '#ffffff' : colors[0], ...ring }}>
                  {f ? (
                    <Text style={{ fontSize: face * 0.54 }} maxFontSizeMultiplier={1}>
                      {f}
                    </Text>
                  ) : (
                    <Icon name="plus" size={Math.round(face * 0.42)} color="#ffffff" />
                  )}
                </View>
              ))}
              {addSeat && (
                <View style={{ width: face, height: face, borderRadius: face / 2, marginLeft: -face * 0.22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors[0], ...ring }}>
                  <Icon name="plus" size={Math.round(face * 0.42)} color="#ffffff" />
                </View>
              )}
            </View>
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm, backgroundColor: colors[2] }}>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.72)' }}>
                {eyebrow}
              </Text>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 26, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: '#ffffff' }}>
                {word}
              </Text>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ fontFamily: ROUNDED, fontSize: 13, lineHeight: 16, fontWeight: '500', color: 'rgba(255, 255, 255, 0.78)' }}>
                {line}
              </Text>
            </View>
          </View>
        </View>
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
