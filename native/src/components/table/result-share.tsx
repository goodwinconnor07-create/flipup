import { useRef, useState, type ReactNode } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { brand, cardColors, ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';

/** The picture's size in points; it's saved at 3x, 1080 × 1350, the shape Messages and Instagram show best. */
const W = 360;
const H = 450;

export interface ResultRow {
  id: string;
  name: string;
  emoji: string;
  /** Chips up or down over the table. */
  net: number;
  you?: boolean;
}

export interface ResultLine {
  title: string;
  /** Who earned it, as "🦊 Remi". */
  who: string;
  detail: string;
}

export interface ResultData {
  /** "Connor wins!" */
  headline: string;
  /** "Crazy Pineapple · 5 players · 38 hands". */
  line: string;
  rows: ResultRow[];
  awards: ResultLine[];
  /** The text to share where a picture can't be made. */
  text: string;
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

/**
 * The table's result as a picture to send to the group chat: drawn off screen at a fixed size on the night card
 * (FlipUp, the headline, the standings with chips won or lost, a couple of awards), saved as a PNG and handed to the
 * share sheet. Where a picture can't be made (the web build), it shares the same words as text.
 */
export function useResultShare(data: ResultData): { share: () => Promise<void>; card: ReactNode; busy: boolean } {
  const ref = useRef<never>(null);
  const [busy, setBusy] = useState(false);
  const share = async () => {
    if (busy) return;
    haptic.tap();
    setBusy(true);
    try {
      if (Platform.OS === 'web') throw new Error('no pictures on the web build');
      const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile', width: W * 3, height: H * 3 });
      await Share.share({ url: uri, message: Platform.OS === 'ios' ? undefined : data.text });
    } catch {
      await Share.share({ message: data.text }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  const card = (
    // Off screen, but laid out and drawn, so the picture can be taken at any time.
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -10_000, top: 0 }}>
      <View ref={ref} collapsable={false} style={{ width: W, height: H, backgroundColor: '#000000' }}>
        <ResultPicture data={data} />
      </View>
    </View>
  );
  return { share, card, busy };
}

function ResultPicture({ data }: { data: ResultData }) {
  const rows = data.rows.slice(0, 6);
  const awards = data.awards.slice(0, 2);
  return (
    <LivingCard colors={cardColors.night} radius={0} shadow={false} still outerStyle={{ width: W, height: H }} style={{ flex: 1, padding: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
          <Icon name="suit.spade.fill" size={15} color="#ffffff" />
        </View>
        <Text style={{ flex: 1, fontFamily: ROUNDED, fontSize: 20, fontWeight: '800', color: '#ffffff' }}>FlipUp</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' }}>FINAL</Text>
      </View>

      <View style={{ gap: 2 }}>
        <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 38, fontWeight: '800', color: '#ffffff' }}>
          {data.headline}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
          {data.line}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {rows.map((r, i) => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ width: 18, fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color: i === 0 ? brand.gold : 'rgba(255,255,255,0.55)' }}>{i + 1}</Text>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
            </View>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
              {r.name}
              {r.you ? ' (you)' : ''}
            </Text>
            <Text style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], color: r.net > 0 ? '#5fe08a' : r.net < 0 ? '#ff7a70' : 'rgba(255,255,255,0.6)' }}>{signed(r.net)}</Text>
          </View>
        ))}
      </View>

      {awards.length > 0 ? (
        <View style={{ gap: 6, marginTop: 'auto' }}>
          {awards.map((a) => (
            <View key={a.title} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: brand.gold }}>{a.title.toUpperCase()}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#ffffff' }}>
                {a.who} · {a.detail}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.5)' }}>Poker night on your phones · play chips only</Text>
    </LivingCard>
  );
}

export { signed };
