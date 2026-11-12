import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { gameData, handData, statsData, type ShareData } from '@/components/share/data';
import { CARD_H, CARD_W, designsFor, DesignSwatch, isShareDesign, ShareCard, type ShareDesignId } from '@/components/share/designs';
import { useShareCapture, useWho } from '@/components/share/use-share';
import { ThemedText } from '@/components/themed-text';
import { usePremium } from '@/state/premium';
import { usePokerRecord } from '@/state/record';
import { lastHand, replayById } from '@/state/replays';
import { read, save } from '@/state/storage';
import { brand, radius, ROUNDED, spacing } from '@/theme';

const LAST_DESIGN = 'flipup.sharedesign';

/**
 * The share card composer: the card as it will be sent, the designs that can draw it under it, and Share. Opened from the Share
 * hub, a saved hand, the table's share button and the screenshot prompt. Params: `kind` (stats, game, hand),
 * `id` (a saved hand's id, or `last` for the table's last hand; a game's index), `title` (a hand's moment).
 * Night is free; the other designs show with a crown and Share opens the Premium offer for them.
 */
export default function ShareCardSheet() {
  const p = useLocalSearchParams<{ kind?: string; id?: string; title?: string; design?: string }>();
  const premium = usePremium();
  const record = usePokerRecord();
  const who = useWho();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [picked, setDesign] = useState<ShareDesignId>(() => {
    const want = isShareDesign(p.design) ? p.design : read<string>(LAST_DESIGN, 'night');
    return isShareDesign(want) ? want : 'night';
  });
  const { ref, share, busy } = useShareCapture();

  let data: ShareData | null = null;
  if (p.kind === 'hand') {
    const r = p.id === 'last' ? lastHand() : replayById(p.id);
    if (r) data = handData(r, p.title || (r.net > 0 ? 'Big win' : 'The hand'), who);
  } else if (p.kind === 'game') {
    const g = record.games[Number(p.id)] ?? record.games.at(-1);
    if (g) data = gameData(g, who);
  }
  if (!data) data = statsData(record, 0, who);
  // Only the designs that can draw this card (the odds chart needs odds); the last one used if it can.
  const designs = designsFor(data);
  const design = designs.some((d) => d.id === picked) ? picked : 'night';

  const scale = Math.min(1, (width - spacing.lg * 2) / CARD_W);
  const locked = !premium && designs.find((d) => d.id === design)?.premium;

  return (
    <View style={{ flex: 1, backgroundColor: '#05070f' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg }}>
        <View style={{ width: CARD_W * scale, height: CARD_H * scale, borderRadius: 18, overflow: 'hidden' }}>
          <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale }], transformOrigin: 'top left' }}>
            <View ref={ref} collapsable={false}>
              <ShareCard design={design} data={data} />
            </View>
          </View>
          {locked && (
            <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <Icon name="crown.fill" size={12} color={brand.gold} />
              <ThemedText variant="caption1" style={{ color: brand.gold, fontWeight: '700' }}>
                Premium
              </ThemedText>
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }} accessibilityRole="radiogroup">
          {designs.map((d) => {
            const on = d.id === design;
            return (
              <PressableScale
                key={d.id}
                accessibilityRole="radio"
                accessibilityLabel={`${d.name}${d.premium && !premium ? ', Premium' : ''}`}
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptic.select();
                  setDesign(d.id);
                  save(LAST_DESIGN, d.id);
                }}
                style={{ alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 58, height: 72, borderRadius: 12, overflow: 'hidden', borderWidth: 2.5, borderColor: on ? '#ffffff' : 'rgba(255,255,255,0.15)' }}>
                  <DesignSwatch colors={d.swatch} />
                  {d.premium && !premium && (
                    <View style={{ position: 'absolute', top: 4, right: 4 }}>
                      <Icon name="crown.fill" size={12} color={brand.gold} />
                    </View>
                  )}
                </View>
                <ThemedText variant="caption1" style={{ color: '#ffffff', opacity: on ? 1 : 0.65, fontWeight: on ? '700' : '500' }}>
                  {d.name}
                </ThemedText>
              </PressableScale>
            );
          })}
        </ScrollView>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.xs }}>
        {locked ? (
          <Button title="Unlock this design" variant="party" tint="gold" size="lg" onPress={() => router.push({ pathname: '/premium', params: { reason: 'share' } })} />
        ) : (
          <Button title="Share" variant="primary" size="lg" loading={busy} onPress={() => void share(data)} />
        )}
        <ThemedText variant="footnote" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontFamily: ROUNDED }}>
          Saved as a picture for Messages, Instagram or your camera roll.
        </ThemedText>
      </View>
    </View>
  );
}
