import { Text, View } from 'react-native';

import { gameLook, INK } from '@design/gameArt';
import type { Variant } from '@/engine';
import { party, ROUNDED, useShadows } from '@/theme';

import { GameThumb } from './game-picture';
import { Icon } from './icon';

/** A tile is a little taller than wide: the square picture, then the name band over its bottom edge. */
export const tileHeight = (width: number) => Math.round(width * 1.2);

/**
 * A game as a tile, the one way a game is shown wherever you pick one to play: its picture on its flat colour, and
 * its name in white capitals on a band of the same colour, darker. Every tile has the same shape, band and type, so
 * a row of them reads as one set. Premium games carry a small crown; the game you played last a replay mark.
 */
export function GameTile({ variant, name, width, locked, again }: { variant: Variant; name: string; width: number; locked?: boolean; /** The game you played last. */ again?: boolean }) {
  const shadows = useShadows();
  const look = gameLook(variant);
  const height = tileHeight(width);
  const corner = Math.round(width * 0.2);
  const band = Math.round(width * 0.27);
  const badge = Math.max(22, Math.round(width * 0.21));
  return (
    // The shadow sits on the outer view: iOS drops the shadow of a view that clips.
    <View style={{ width, height, borderRadius: corner, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ width, height, borderRadius: corner, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: look.card[0] }}>
        <GameThumb variant={variant} size={width} rounded={0} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: band, paddingHorizontal: Math.round(width * 0.06), alignItems: 'center', justifyContent: 'center', backgroundColor: look.band }}>
          <Text
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ fontFamily: ROUNDED, fontSize: Math.max(10, Math.min(17, width * 0.1)), lineHeight: Math.max(11, Math.min(19, width * 0.112)), fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', textTransform: 'uppercase', color: '#ffffff' }}
          >
            {name}
          </Text>
        </View>
        {again && (
          <View style={{ position: 'absolute', top: 6, left: 6, width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 2, borderColor: INK }}>
            <Icon name="arrow.counterclockwise" size={badge * 0.5} color={INK} />
          </View>
        )}
        {locked && (
          <View style={{ position: 'absolute', top: 6, right: 6, width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: INK }}>
            <Icon name="crown.fill" size={badge * 0.5} color={party.yellow} />
          </View>
        )}
      </View>
    </View>
  );
}
