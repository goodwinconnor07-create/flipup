import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { Section, Row } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { blindsLabel, variantInfo } from '@/engine';
import { usePickedBots } from '@/state/bots-pick';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { openLocalTable } from '@/state/session';
import { saveSettings, useDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { spacing } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The small popup Deal opens on Play with bots: the game, the bots by face and name, chips, blinds and the house
 * rules, and one button. Deal closes it and starts the table (the table's own "Dealing in 3…" does the rest).
 * Swipe it down to change something. A Premium game is checked again here, at deal time.
 */
export default function DealConfirm() {
  const s = useDraft();
  const bots = usePickedBots();
  const premium = usePremium();
  const profile = useProfile();
  const variant = s.variant ?? 'holdem';
  const info = variantInfo(variant);

  const deal = () => {
    if (!bots.length) return;
    haptic.select();
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    openLocalTable(s, bots.length, profile.name, profile.emoji, bots.map((b) => b.name));
    router.replace('/table');
  };

  const rules = [
    s.rebuys ? 'Rebuys' : 'No rebuys',
    s.blindMinutes ? `Blinds up every ${s.blindMinutes} min${s.blindCap ? `, to ${blindsLabel([s.blindCap / 2, s.blindCap])}` : ''}` : 'Blinds stay the same',
  ];

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Ready to deal?', headerShown: false }} />
      <SheetScroll style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.lg }}>
        <ThemedText variant="title2" accessibilityRole="header">
          Ready to deal?
        </ThemedText>
        <Section>
          <Row title={info.name} subtitle={info.tagline} leading={<GameThumb variant={variant} size={44} />} />
          <Row title="Bots" detail={`${bots.length}`} subtitle={bots.map((b) => `${b.emoji} ${b.name}`).join('   ')} />
          <Row title="Chips" detail={`${chips(s.startingStack)} each`} />
          <Row title="Blinds" detail={blindsLabel([s.smallBlind, s.bigBlind])} />
          <Row title="House rules" subtitle={rules.join(' · ')} />
        </Section>
      </SheetScroll>
      <View style={{ padding: spacing.md, paddingTop: spacing.xs }}>
        <Button variant="party" tint="green" size="lg" title="Deal" onPress={deal} />
      </View>
    </View>
  );
}
