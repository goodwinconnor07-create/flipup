import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { usePokerRecord } from '@/state/record';
import { radius, spacing, useColors, useShadows } from '@/theme';

import { GameTile } from '../game-tile';
import { usePanel } from '../grouped-list';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

const COLUMNS = 4;
const GAP = spacing.sm;
const PAD = spacing.sm;

const open = (v: Variant) => {
  haptic.tap();
  router.push(`/game/${v}`);
};

/**
 * Every game at once, four to a row on one rounded panel, like a party-games app's home: each game is a `GameTile`
 * (its flat picture and its name on a darker band). The game you played last comes first with a replay mark;
 * Premium games carry a crown. A tap opens the game's sheet, where you pick friends or bots.
 */
export function GameGrid() {
  const { width: screen } = useWindowDimensions();
  const premium = usePremium();
  const panel = usePanel();
  const shadows = useShadows();
  const last = usePokerRecord().games.at(-1)?.variant;
  const games = last ? [...VARIANTS.filter((v) => v.id === last), ...VARIANTS.filter((v) => v.id !== last)] : VARIANTS;
  const inner = Math.min(screen - spacing.md * 2, 560) - PAD * 2;
  const tile = Math.floor((inner - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <View style={{ padding: PAD, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, boxShadow: shadows.card }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {games.map((v) => {
          const locked = !premium && isPremiumVariant(v.id);
          return (
            <PressableScale
              key={v.id}
              accessibilityRole="button"
              accessibilityLabel={`${v.id === last ? 'Play again: ' : ''}${v.name}${locked ? ', Premium' : ''}. ${gameLook(v.id).hook}`}
              onPress={() => open(v.id)}
              haptics={false}
            >
              <GameTile variant={v.id} name={v.name} width={tile} locked={locked} again={v.id === last} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** Join a game, as a slim blue bar over the games: the only other way in. */
export function JoinBar() {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Join a game. Type a code or scan"
      onPress={() => {
        haptic.tap();
        router.push('/join');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accent }}
    >
      <Icon name="qrcode.viewfinder" size={20} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
        Join a game
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.8)' }}>
        Code or QR
      </Text>
      <Icon name="chevron.right" size={14} color="rgba(255, 255, 255, 0.8)" />
    </PressableScale>
  );
}
