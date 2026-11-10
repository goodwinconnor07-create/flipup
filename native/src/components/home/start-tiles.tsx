import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { brand, cardColors, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';

/** Play with bots: night blue lifted enough to stand off the black page without an outline. */
const BOTS_TILE = ['#2a4396', '#18296a', '#0c173f'] as const;

/**
 * The two ways to sit down, side by side and big, the first thing under the title, drawn the way Apple draws a
 * launcher card: one SF Symbol in a soft white circle, a chevron, then the title and one quiet line. Play with
 * friends on blue, Play with bots on night blue; the glows are kept low so the cards read as calm colour.
 */
/** `onGo` replaces opening Setup (a game's sheet closes itself first and passes its game); `height` for a smaller pair. */
export function StartTiles({ onGo, height = 150 }: { onGo?: (mode: 'friends' | 'bots') => void; height?: number } = {}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile title={'Play with\nfriends'} line="Invite up to 8 people" symbol="person.2.fill" colors={cardColors.violet} height={height} go={() => (onGo ? onGo('friends') : router.push('/play-friends'))} />
        <Tile title={'Play with\nbots'} line="Play right now" symbol="cpu.fill" colors={BOTS_TILE} height={height} go={() => (onGo ? onGo('bots') : router.push('/play-bots'))} />
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
            Join a game <Text style={{ fontWeight: '500', color: colors.secondaryLabel }}>· code or scan</Text>
          </Text>
          <Icon name="chevron.right" size={15} color={brand.violetDark} />
        </View>
      </View>
    </PressableTile>
  );
}

function Tile({ title, line, symbol, colors, height, go }: { title: string; line: string; /** An SF Symbol, white in a soft circle. */ symbol: IconName; colors: readonly [string, string, string]; height: number; go: () => void }) {
  // Both titles are two lines at one size, so the tiles line up; the spoken label reads them as one.
  const label = title.replace('\n', ' ');
  return (
    <View style={{ flex: 1 }}>
      <PressableTile label={`${label}. ${line}`} onPress={go}>
        <LivingCard colors={colors} glow="rgba(255, 255, 255, 0.1)" glow2="rgba(90, 160, 255, 0.16)" outerStyle={{ height }} style={{ flex: 1, padding: spacing.md - 2, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.18)' }}>
              <Icon name={symbol} size={22} color="#ffffff" />
            </View>
            <Icon name="chevron.right" size={14} color="rgba(255, 255, 255, 0.6)" />
          </View>
          <View style={{ gap: 2 }}>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontFamily: ROUNDED, fontSize: 20, lineHeight: 23, fontWeight: '700', color: '#ffffff' }}>
              {title}
            </Text>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.78)' }}>
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
