import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { RAILS } from '@design/tableLooks';
import { tableThemes } from '@design/tokens';
import { BOTS, MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useTableLook } from '@/state/prefs';
import { useProfile } from '@/state/profile';
import { gradient, spacing } from '@/theme';

const FACE = 40;
const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The table you're setting up, before you sit down: the game's own felt (your felt and rail for Hold'em), you at the
 * bottom, a face for each bot and, with friends, the open seats they'll take. Faces pop in and out with the count.
 */
export function SeatPreview({ settings, bots, friends }: { settings: Settings; bots: number; friends: boolean }) {
  const look = useTableLook();
  const profile = useProfile();
  const reduce = useReduceMotion();
  const { width: screen } = useWindowDimensions();
  const variant = settings.variant ?? 'holdem';
  const theme = variant === 'holdem' ? null : tableThemes[variant as keyof typeof tableThemes];
  const felt = theme?.felt ?? look.felt;
  const rail = theme?.rail ?? RAILS.find((r) => r.id === look.rail)?.colors ?? RAILS[0].colors;
  const w = Math.min(screen - spacing.md * 2, 560) - FACE;
  const h = Math.round(w * 0.46);
  // You, the bots, then (with friends) open seats up to a six-seat table, or more if the bots already fill it.
  const open = friends ? Math.max(1, Math.min(MAX_SEATS, 6) - 1 - bots) : 0;
  const seats = 1 + bots + open;
  const info = variantInfo(variant);
  return (
    <View
      accessible
      accessibilityLabel={`${info.name} table: you${bots ? `, ${bots} ${bots === 1 ? 'bot' : 'bots'}` : ''}${open ? `, ${open} open ${open === 1 ? 'seat' : 'seats'} for friends` : ''}. Blinds ${chips(settings.smallBlind)}/${chips(settings.bigBlind)}, ${chips(settings.startingStack)} chips each`}
      style={{ height: h + FACE, marginHorizontal: FACE / 2, marginVertical: spacing.xs }}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: FACE / 2, height: h, borderRadius: h / 2, padding: 6, ...gradient(`linear-gradient(165deg, ${rail[0]}, ${rail[1]})`) }}>
        <View style={{ flex: 1, borderRadius: h / 2, alignItems: 'center', justifyContent: 'center', gap: 2, ...gradient(`radial-gradient(ellipse at 50% 38%, ${felt} 0%, ${felt} 50%, rgba(0, 0, 0, 0.45) 140%)`) }}>
          <Text maxFontSizeMultiplier={1} style={{ fontSize: 26 }}>
            {info.emoji}
          </Text>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>
            {info.name}
          </Text>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            Blinds {chips(settings.smallBlind)}/{chips(settings.bigBlind)} · {chips(settings.startingStack)} chips
          </Text>
        </View>
      </View>
      {Array.from({ length: seats }, (_, i) => {
        // Evenly round the oval, starting from you at the bottom.
        const angle = Math.PI / 2 + (i * 2 * Math.PI) / seats;
        const x = w / 2 + (w / 2) * Math.cos(angle) - FACE / 2;
        const y = FACE / 2 + h / 2 + (h / 2 + 4) * Math.sin(angle) - FACE / 2;
        const kind = i === 0 ? 'you' : i <= bots ? 'bot' : 'open';
        return (
          <Animated.View
            key={`${kind}-${i}`}
            entering={reduce ? undefined : ZoomIn.springify().mass(1).stiffness(450).damping(22)}
            exiting={reduce ? undefined : ZoomOut.duration(150)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: FACE,
              height: FACE,
              borderRadius: FACE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: kind === 'you' ? '#ffffff' : kind === 'bot' ? 'rgba(20, 20, 28, 0.85)' : 'rgba(255, 255, 255, 0.12)',
              borderWidth: 2,
              borderColor: kind === 'open' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)',
              borderStyle: kind === 'open' ? 'dashed' : 'solid',
            }}
          >
            {kind === 'open' ? (
              <Text maxFontSizeMultiplier={1} style={{ color: '#ffffff', fontSize: 20, fontWeight: '700' }}>
                +
              </Text>
            ) : (
              <Text maxFontSizeMultiplier={1} style={{ fontSize: 22 }}>
                {kind === 'you' ? profile.emoji || '🙂' : BOTS[(i * 7) % BOTS.length].emoji}
              </Text>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
