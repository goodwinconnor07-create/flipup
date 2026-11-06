import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Kicker, NightSheet, panel, SheetHeading } from '@/components/night-sheet';
import { BANKROLL, dayOfSeason, daysToNextCut, msToMidnight, seasonName, seasonOf } from '@/engine';
import { showRewardedAd } from '@/state/ads';
import { BANKROLL_RULES, rebuyBankroll, sitBankroll, useBankroll, type BankrollView } from '@/state/bankroll';
import { useMyUsername } from '@/state/pals';
import { brand, ROUNDED, spacing } from '@/theme';


/**
 * Bankroll's start sheet (night page, like Range training's): your bankroll big, your place, who's still alive,
 * hands left today, the next cut, and Sit down; or You're busted with the rebuy, or Cut. The five rules underneath.
 */
export default function BankrollSheet() {
  const { view, error, refresh } = useBankroll();
  const { username } = useMyUsername();
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const month = seasonName(seasonOf(now));
  const left = view ? Math.max(0, BANKROLL.handsADay - view.handsToday) : BANKROLL.handsADay;
  const today = view ? view.bankroll - view.dayStart : 0;

  const sit = async () => {
    if (!username) {
      router.push('/username');
      return;
    }
    setBusy(true);
    try {
      await sitBankroll();
      haptic.tap();
      router.back();
      router.push('/table');
    } catch (e) {
      Alert.alert('Can’t sit down', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const rebuy = async () => {
    const result = await showRewardedAd('rebuy');
    if (result === 'unavailable') return Alert.alert('No ad right now', 'Try again in a little while.');
    const go = async (watched: boolean) => {
      try {
        await rebuyBankroll(watched);
        await refresh();
      } catch (e) {
        Alert.alert('Rebuy', e instanceof Error ? e.message : 'Try again.');
      }
    };
    if (result === 'rewarded') return go(true);
    Alert.alert('Skip the rebuy?', `You’ll be out for ${month}.`, [
      { text: 'Watch the ad', onPress: () => void rebuy() },
      { text: 'Skip', style: 'destructive', onPress: () => void go(false) },
    ]);
  };

  const share = () => {
    if (!view) return;
    const line = `Bankroll · ${month} · Day ${dayOfSeason(now)}\n${today >= 0 ? '+' : ''}${today.toLocaleString()} today\n${view.bankroll.toLocaleString()} chips${view.rank ? `\n#${view.rank} of ${view.alive.toLocaleString()} still alive` : ''}`;
    void Share.share({ message: line });
  };

  const out = view && view.status !== 'alive';
  return (
    <NightSheet
      footer={
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          {view?.status === 'busted' && !view.rebuyUsed ? (
            <Button title="Watch an ad to rebuy 1,000" variant="party" size="lg" onPress={() => void rebuy()} />
          ) : !out ? (
            <Button title={left === 0 ? 'Back tomorrow' : view?.seated ? 'Back to your table' : 'Sit down'} variant="party" size="lg" loading={busy} disabled={left === 0 || !view} onPress={() => void sit()} />
          ) : null}
        </View>
      }
    >
      <Stack.Screen options={{ title: 'Bankroll', headerShown: false }} />
      <SheetHeading
        kicker={`Bankroll · ${month}`}
        title={view?.status === 'busted' ? 'You’re busted.' : view?.status === 'cut' ? `Cut in week ${view.cutWeek ?? ''}` : '1,000 chips. One month. Don’t go broke.'}
        line={error || undefined}
      />
      <View style={panel}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 52, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
          {(view?.bankroll ?? BANKROLL.start).toLocaleString()}
        </Text>
        <Lines view={view} left={left} today={today} />
        {view && view.hands > 0 && <Button title="Share today" variant="secondary" onPress={share} />}
      </View>
      {view?.status === 'busted' && view.bust && (
        <View style={panel}>
          <Kicker>The hand that did it</Kicker>
          <Text style={{ fontSize: 17, color: '#ffffff' }}>
            {`Busted on day ${view.bust.day}. ${view.bust.cards.join('')}${view.bust.by.cards.length ? ` into ${view.bust.by.cards.join('')}` : ''}, by ${view.bust.by.emoji} ${view.bust.by.name}.`}
          </Text>
          {view.rebuyUsed && <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>{`Out for ${month}. Back on the 1st.`}</Text>}
        </View>
      )}
      <View style={{ gap: spacing.xs }}>
        <Kicker>The rules</Kicker>
        {BANKROLL_RULES.map((r, i) => (
          <Text key={i} maxFontSizeMultiplier={1.5} style={{ fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.7)' }}>
            {`${i + 1}. ${r}`}
          </Text>
        ))}
      </View>
    </NightSheet>
  );
}

function Lines({ view, left, today }: { view: BankrollView | null; left: number; today: number }) {
  if (!view) return null;
  const now = Date.now();
  const cut = daysToNextCut(now);
  const hours = Math.ceil(msToMidnight(now) / 3_600_000);
  const lines = [
    view.rank ? `#${view.rank.toLocaleString()} · peak ${view.peak.toLocaleString()}` : `Peak ${view.peak.toLocaleString()}`,
    `${view.alive.toLocaleString()} of ${view.players.toLocaleString()} still alive`,
    view.status === 'alive' ? (left > 0 ? `${left} of ${BANKROLL.handsADay} hands left today` : `Back tomorrow, in ${hours} ${hours === 1 ? 'hour' : 'hours'}`) : '',
    view.handsToday > 0 ? `${today >= 0 ? '+' : ''}${today.toLocaleString()} today` : '',
    view.status === 'alive' && cut ? `Next cut in ${cut} ${cut === 1 ? 'day' : 'days'}` : '',
  ].filter(Boolean);
  return (
    <View style={{ gap: 2 }}>
      {lines.map((l, i) => (
        <Text key={i} maxFontSizeMultiplier={1.4} style={{ fontSize: 16, color: i === 3 ? brand.gold : 'rgba(255,255,255,0.8)', fontWeight: i === 3 ? '700' : '400' }}>
          {l}
        </Text>
      ))}
    </View>
  );
}
