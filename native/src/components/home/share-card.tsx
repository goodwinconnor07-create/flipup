import { useRef, useState, type ReactNode } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useMyUsername } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { usePokerRecord } from '@/state/record';
import { useStreak } from '@/state/streak';
import { brand, cardColors, ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PlayingCard } from '../table/playing-card';

const n = (v: number) => v.toLocaleString('en-US');
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** The picture's size in points; it's saved at 3x, 1080 × 1350, the shape Instagram and Messages show best. */
const W = 360;
const H = 450;

/**
 * Your poker as a picture to send: drawn off screen at a fixed size, branded (the FlipUp name, your face and
 * username), on the night violet with its grain, then saved as a PNG and handed to the share sheet. Where a picture
 * can't be made (the web build), it shares the same numbers as text.
 */
export function useStatsShare(): { share: () => Promise<void>; card: ReactNode; busy: boolean } {
  // A host view; React Native's own View type doesn't fit both `ref` and captureRef, so it's held loosely.
  const ref = useRef<never>(null);
  const [busy, setBusy] = useState(false);
  const record = usePokerRecord();
  const text = `My FlipUp poker: ${n(record.hands)} hands, ${n(record.won)} pots won (${pct(record.won, record.hands)}%), biggest pot ${n(record.biggestPot)}.`;
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
    // Off screen, but laid out and drawn, so the picture can be taken at any time.
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -10_000, top: 0 }}>
      <View ref={ref} collapsable={false} style={{ width: W, height: H, backgroundColor: '#000000' }}>
        <StatsPicture />
      </View>
    </View>
  );
  return { share, card, busy };
}

export function StatsPicture() {
  const record = usePokerRecord();
  const streak = useStreak();
  const profile = useProfile();
  const { username } = useMyUsername();
  return (
    <LivingCard colors={cardColors.night} radius={0} shadow={false} still outerStyle={{ width: W, height: H }} style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
          <Icon name="suit.spade.fill" size={16} color="#ffffff" />
        </View>
        <Text style={{ flex: 1, fontFamily: ROUNDED, fontSize: 22, fontWeight: '800', color: '#ffffff' }}>FlipUp</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' }}>MY POKER</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <Text style={{ fontSize: 30 }}>{profile.emoji || '🙂'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
            {profile.name || 'Me'}
          </Text>
          {username && <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>@{username}</Text>}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          <Big label="HANDS" value={n(record.hands)} />
          <Big label="WIN RATE" value={`${pct(record.won, record.hands)}%`} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Small label="BIGGEST POT" value={n(record.biggestPot)} />
          <Small label="POTS WON" value={n(record.won)} />
          {streak.days > 0 ? <Small label="STREAK" value={`${streak.days} days`} gold /> : <Small label="GAMES" value={n(record.games.length)} />}
        </View>
      </View>

      {record.best ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' }}>BEST HAND · {record.best.name.toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {record.best.cards.map((c) => (
              <PlayingCard key={c} card={c} size="md" width={44} />
            ))}
          </View>
        </View>
      ) : (
        <View />
      )}

      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.5)' }}>Poker night on your phones · play chips only</Text>
    </LivingCard>
  );
}

const Big = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.6)' }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 46, lineHeight: 52, fontWeight: '800', color: '#ffffff' }}>
      {value}
    </Text>
  </View>
);
const Small = ({ label, value, gold }: { label: string; value: string; gold?: boolean }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.6)' }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 30, fontWeight: '800', color: gold ? brand.gold : '#ffffff' }}>
      {value}
    </Text>
  </View>
);
