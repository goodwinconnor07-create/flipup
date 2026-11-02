import { router, Stack } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';

import { Avatar } from '@/components/avatar';
import { GamePicture } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PlayCard } from '@/components/play-card';
import { isPremiumVariant, VARIANTS } from '@/engine';
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
        <PlayCard onFriends={() => router.push({ pathname: '/setup', params: { mode: 'friends' } })} onBots={() => router.push({ pathname: '/setup', params: { mode: 'bots' } })} />

        <Section header="Games" footer={premium ? undefined : 'The first five are free. The rest come with Premium, or watch a short ad to host one.'} inset={spacing.md + THUMB + spacing.sm}>
          {VARIANTS.map((v) => (
            <Row
              key={v.id}
              title={v.name}
              subtitle={v.tagline}
              leading={<GamePicture variant={v.id} width={THUMB} height={THUMB} rounded={radius.sm + 2} />}
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

