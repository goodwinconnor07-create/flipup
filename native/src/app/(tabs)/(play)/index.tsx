import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { GameShelf } from '@/components/home/game-shelf';
import { TableHero } from '@/components/home/table-hero';
import { YourPoker } from '@/components/home/your-poker';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { variantInfo, variantOf } from '@/engine';
import { usePartyRef } from '@/state/party';
import { useTable } from '@/state/session';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { gradient, gradients, minTap, radius, spacing, useColors } from '@/theme';

/**
 * Home, a card room: the table you're at (if any), a live table with the two ways to sit down, your poker so far (or
 * How to Play before your first hand), every game as a picture, and Premium. No app name and no explainer lines.
 */
export default function Home() {
  const colors = useColors();
  const premium = usePremium();
  return (
    <>
      <Stack.Screen options={{ title: 'Play', headerLargeTitleEnabled: true, headerRight: () => <ProfileButton /> }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}>
        <View style={{ gap: spacing.md }}>
          <TableBanner />
          <TableHero onFriends={() => router.push({ pathname: '/setup', params: { mode: 'friends' } })} onBots={() => router.push({ pathname: '/setup', params: { mode: 'bots' } })} />
        </View>
        <YourPoker />
        <GameShelf />
        {!premium && <PremiumCard />}

        {__DEV__ && (
          <Section header="Development">
            <Row title="Design system" icon={{ symbol: 'paintbrush.fill', color: colors.indigo as string }} onPress={() => router.push('/design')} />
          </Section>
        )}

        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          Play chips only. They have no cash value and can&apos;t be bought or won.
        </ThemedText>
      </ScrollView>
    </>
  );
}

/** Premium, as a gold card: the crown, what it adds, and a tap to the offer. */
function PremiumCard() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Premium. Card packs, bubble effects and seven more games"
      onPress={() => {
        haptic.tap();
        router.push('/premium');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', ...gradient(`linear-gradient(150deg, ${gradients.gold[0]} 0%, ${gradients.gold[1]} 100%)`) }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Icon name="crown.fill" size={24} color={gradients.gold[1]} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="title3" style={{ fontWeight: '800', color: '#3b2300' }}>
          Premium
        </ThemedText>
        <ThemedText variant="subhead" style={{ color: '#5a3a00' }}>
          Card packs, bubble effects and seven more games
        </ThemedText>
      </View>
      <Icon name="chevron.right" size={16} color="#5a3a00" />
    </PressableScale>
  );
}

/** The one clear next step, as on the web: a table you're still at (bots-only or online) with Rejoin, or your open party. */
function TableBanner() {
  const colors = useColors();
  const t = useTable();
  const game = t.game;
  const partyRef = usePartyRef();
  const atTable = !!t.mode && !(game && game.status === 'ended' && !game.party);
  if (!atTable && !partyRef) return null;
  const info = atTable && game ? variantInfo(variantOf(game)) : null;
  const what = !atTable ? 'Your party' : game?.party ? `Party · game ${game.party.round + 1} of ${game.party.total}` : t.mode === 'online' ? `Online table${t.code ? ` · ${t.code}` : ''}` : 'You vs the bots';
  const where = !atTable ? `Code ${partyRef?.code}` : game?.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : game?.status === 'lobby' ? 'In the lobby' : 'Your table';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${what}. ${where}. ${atTable ? 'Rejoin' : 'Open'}`}
      onPress={() => {
        haptic.tap();
        router.push(atTable ? '/table' : '/party-room');
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: pressed ? colors.cellPressed : colors.cell })}
    >
      <Text style={{ fontSize: 26 }} maxFontSizeMultiplier={1} accessible={false}>
        {info?.emoji ?? (atTable ? '🃏' : '🥳')}
      </Text>
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: colors.label }}>
          {what}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, color: colors.tertiaryLabel }}>
          {where}
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
          {atTable ? 'Rejoin' : 'Open'}
        </Text>
      </View>
    </Pressable>
  );
}

/** Your emoji in the nav bar (an empty outline before you've set up a profile). It opens your profile. */
function ProfileButton() {
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={named ? `Your profile and settings: ${profile.name}` : 'Set up your profile'}
      hitSlop={(minTap - 36) / 2}
      onPress={() => {
        haptic.tap();
        router.push('/profile');
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Avatar emoji={named ? profile.emoji : undefined} size={36} />
    </Pressable>
  );
}

