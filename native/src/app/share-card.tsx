import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { PressableScale } from '@/components/pressable-scale';
import { SheetScroll } from '@/components/sheet-scroll';
import { gameData, handData, statsData, type ShareData } from '@/components/share/data';
import { CARD_H, CARD_W, isShareLayout, LAYOUT_NAMES, LayoutPreview, layoutsFor, ShareCard, type ShareLayout } from '@/components/share/designs';
import { useShareCapture, useWho } from '@/components/share/use-share';
import { ThemedText } from '@/components/themed-text';
import { usePokerRecord } from '@/state/record';
import { lastHand, replayById } from '@/state/replays';
import { ROUNDED, spacing } from '@/theme';

/**
 * The share card composer: the card as it will be sent, and Share. Opened from the Share hub, a saved hand, the
 * table's share button and the screenshot prompt. Params: `kind` (stats, game, hand), `id` (a saved hand's id, or
 * `last` for the table's last hand; a game's index), `title` (a hand's moment), `layout`. The card takes its game's
 * look; a hand can also be drawn as the showdown or the odds, picked under it. Every card is free.
 */
export default function ShareCardSheet() {
  const p = useLocalSearchParams<{ kind?: string; id?: string; title?: string; layout?: string }>();
  const record = usePokerRecord();
  const who = useWho();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [picked, setLayout] = useState<ShareLayout>(isShareLayout(p.layout) ? p.layout : 'hand');
  const { ref, share, busy } = useShareCapture();

  let data: ShareData | null = null;
  if (p.kind === 'hand') {
    const r = p.id === 'last' ? lastHand() : replayById(p.id);
    if (r) data = handData(r, p.title || (r.net > 0 ? 'Big win' : 'The hand'), who);
  } else if (p.kind === 'game') {
    const g = record.games[Number(p.id)] ?? record.games.at(-1);
    if (g) data = gameData(g, who);
  }
  if (!data) data = statsData(record, who);
  // Only the layouts this card has the data for (the showdown needs their cards, the odds need odds).
  const layouts = layoutsFor(data);
  const layout = layouts.includes(picked) ? picked : 'hand';

  const scale = Math.min(1, (width - spacing.lg * 2) / CARD_W);

  return (
    // The scroll view is the screen itself, like every other sheet: a plain View around it left iOS drawing a blank sheet.
    <SheetScroll style={{ backgroundColor: '#05070f' }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md, gap: spacing.lg }}>
      <>
        <View style={{ width: CARD_W * scale, height: CARD_H * scale, borderRadius: 18, overflow: 'hidden' }}>
          <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale }], transformOrigin: 'top left' }}>
            <View ref={ref} collapsable={false}>
              <ShareCard layout={layout} data={data} />
            </View>
          </View>
        </View>

        {layouts.length > 1 && (
          <View style={{ flexDirection: 'row', gap: spacing.md }} accessibilityRole="radiogroup">
            {layouts.map((l) => {
              const on = l === layout;
              return (
                <PressableScale
                  key={l}
                  accessibilityRole="radio"
                  accessibilityLabel={LAYOUT_NAMES[l]}
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    haptic.select();
                    setLayout(l);
                  }}
                  style={{ alignItems: 'center', gap: 6 }}
                >
                  <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 2.5, borderColor: on ? '#ffffff' : 'rgba(255,255,255,0.15)' }}>
                    <LayoutPreview data={data} layout={l} width={58} />
                  </View>
                  <ThemedText variant="caption1" style={{ color: '#ffffff', opacity: on ? 1 : 0.65, fontWeight: on ? '700' : '500' }}>
                    {LAYOUT_NAMES[l]}
                  </ThemedText>
                </PressableScale>
              );
            })}
          </View>
        )}
      </>
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.lg, gap: spacing.xs }}>
        <Button title="Share" variant="primary" size="lg" loading={busy} onPress={() => void share(data)} />
        <ThemedText variant="footnote" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontFamily: ROUNDED }}>
          Saved as a picture for Messages, Instagram or your camera roll.
        </ThemedText>
      </View>
    </SheetScroll>
  );
}
