import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PlayCard } from '@/components/play-card';
import { isPremiumVariant, variantInfo, variantOf, VARIANTS } from '@/engine';
import { usePartyRef } from '@/state/party';
import { useTable } from '@/state/session';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { minTap, radius, spacing, useColors } from '@/theme';

const THUMB = 52;

/**
 * Home: a large "FlipUp" title with your avatar in the nav bar, the Play card, every game as a grouped row with
 * its picture, Premium as one row near the bottom, and the play-chips line the App Store asks for.
 */
export default function Home() {
  const colors = useColors();
  const premium = usePremium();
  return (
    <>
      <Stack.Screen options={{ title: 'FlipUp', headerLargeTitleEnabled: true, headerRight: () => <ProfileButton /> }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <TableBanner />
        <PlayCard onFriends={() => router.push({ pathname: '/setup', params: { mode: 'friends' } })} onBots={() => router.push({ pathname: '/setup', params: { mode: 'bots' } })} />

        <Section header="Games" footer={premium ? undefined : 'The first five are free. The rest come with Premium, or watch a short ad to host one.'} inset={spacing.md + THUMB + spacing.sm}>
          {VARIANTS.map((v) => (
            <Row
              key={v.id}
              title={v.name}
              subtitle={v.tagline}
              leading={<GameThumb variant={v.id} size={THUMB} />}
              trailing={!premium && isPremiumVariant(v.id) ? <Icon name="crown.fill" size={15} color={colors.gold} /> : undefined}
              onPress={() => router.push(`/game/${v.id}`)}
            />
          ))}
        </Section>

        <Section footer="Play chips only. They have no cash value and can't be bought or won.">
          <Row
            title="FlipUp Premium"
            subtitle={premium ? 'Unlocked. Thank you for backing FlipUp.' : 'Card packs, bubble effects and seven more games'}
            icon={{ symbol: 'crown.fill', color: colors.gold as string }}
            onPress={() => router.push('/premium')}
          />
        </Section>

        {__DEV__ && (
          <Section header="Development">
            <Row title="Design system" icon={{ symbol: 'paintbrush.fill', color: colors.indigo as string }} onPress={() => router.push('/design')} />
          </Section>
        )}
      </ScrollView>
    </>
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

