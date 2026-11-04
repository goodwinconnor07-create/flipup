import { useRef, useState, type ReactNode } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { squares, type Mode } from '@/state/range-logic';
import type { Grade } from '@train/ranges/model';
import { brand, cardColors, ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';

/** The picture's size in points; it's saved at 3x, 1080 × 1350, like the stats card. */
const W = 360;
const H = 450;

export interface ShareSummary {
  mode: Mode;
  title: string;
  /** "Wed 4 Nov" for the daily. */
  day?: string;
  score: number;
  stars: number | null;
  grades: Grade[];
  flame: number;
  /** Blitz: the hands answered and the best run. */
  blitz?: { hands: number; run: number };
}

export const SQUARE_COLOUR: Record<Grade, string> = { best: brand.gold, ok: brand.violet, mistake: '#2c2c36' };

/** The words that go with the picture, or alone where a picture can't be made. */
export function shareText(s: ShareSummary): string {
  const head = s.mode === 'daily' ? `FlipUp Range training · ${s.day ?? 'Today'}` : `FlipUp Range training · ${s.title}`;
  const tail = s.mode === 'blitz' && s.blitz ? `${s.score} points in 60s · ${s.blitz.hands} hands · best run ${s.blitz.run}` : `${s.score} points`;
  return `${head}\n${squares(s.grades.slice(0, 30))}\n${tail}${s.flame > 1 ? ` · ${s.flame}-day streak` : ''}`;
}

/** The result as a picture to send, drawn off screen and saved with react-native-view-shot, as `useStatsShare()` does. */
export function useRangeShare(summary: ShareSummary): { share: () => Promise<void>; card: ReactNode; busy: boolean } {
  const ref = useRef<never>(null);
  const [busy, setBusy] = useState(false);
  const text = shareText(summary);
  const share = async () => {
    if (busy) return;
    haptic.tap();
    setBusy(true);
    try {
      if (Platform.OS === 'web') throw new Error('no pictures on the web build');
      const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile', width: W * 3, height: H * 3 });
      await Share.share({ url: uri, message: Platform.OS === 'ios' ? undefined : text });
    } catch {
      await Share.share({ message: text }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  const card = (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -10_000, top: 0 }}>
      <View ref={ref} collapsable={false} style={{ width: W, height: H, backgroundColor: '#000000' }}>
        <SharePicture summary={summary} />
      </View>
    </View>
  );
  return { share, card, busy };
}

function SharePicture({ summary: s }: { summary: ShareSummary }) {
  const rows: Grade[][] = [];
  const list = s.grades.slice(0, 30);
  for (let i = 0; i < list.length; i += 6) rows.push(list.slice(i, i + 6));
  return (
    <LivingCard colors={cardColors.night} radius={0} shadow={false} still outerStyle={{ width: W, height: H }} style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
          <Icon name="suit.spade.fill" size={16} color="#ffffff" />
        </View>
        <Text style={{ flex: 1, fontFamily: ROUNDED, fontSize: 22, fontWeight: '800', color: '#ffffff' }}>FlipUp</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' }}>RANGE TRAINING</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.4, color: brand.gold }}>{(s.mode === 'daily' && s.day ? `${s.title} · ${s.day}` : s.title).toUpperCase()}</Text>
        <Text style={{ fontFamily: ROUNDED, fontSize: 72, lineHeight: 78, fontWeight: '800', color: '#ffffff' }}>{s.score}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>{s.blitz ? `points in 60 seconds · ${s.blitz.hands} hands` : 'points'}</Text>
        {s.stars != null && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <Icon key={i} name="star.fill" size={30} color={i < (s.stars ?? 0) ? brand.gold : 'rgba(255,255,255,0.16)'} />
            ))}
          </View>
        )}
      </View>
      <View style={{ gap: 6 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 6 }}>
            {row.map((g, i) => (
              <View key={i} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: SQUARE_COLOUR[g] }} />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {s.flame > 0 && <Icon name="flame.fill" size={14} color={brand.gold} />}
        <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>
          {s.flame > 0 ? `${s.flame}-day streak · ` : ''}Read the hand, make the call
        </Text>
      </View>
    </LivingCard>
  );
}
