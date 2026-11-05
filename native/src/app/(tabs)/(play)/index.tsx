import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { Row, Section } from '@/components/grouped-list';
import { ChallengeRow } from '@/components/home/challenge-row';
import { FriendsStrip } from '@/components/home/friends-strip';
import { GameRow } from '@/components/home/game-row';
import { Hero } from '@/components/home/hero';
import { PassportCard } from '@/components/home/passport';
import { StartTiles } from '@/components/home/start-tiles';
import { FirstHand } from '@/components/home/your-poker';
import { InviteCard } from '@/components/invite-card';
import { RequestsPill } from '@/components/friend-requests';
import { ProfileMenu } from '@/components/profile-menu';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { useFriendBox } from '@/state/pals';
import { usePokerRecord } from '@/state/record';
import { spacing, useColors } from '@/theme';

/**
 * Home. Built the way game apps that feel native do it (Apple's Games app, Chess.com, Flighty): the hero carousel
 * from the top of the screen with the big title and your avatar menu on it (your table or party first, then the game
 * of the week, today's solo pick, your last game, Premium), a friend's invite if one's waiting, the two ways to sit
 * down as big tiles, the games as a shelf you swipe, the solo cards, your friends as faces, and your poker on one card
 * (How to Play before your first hand).
 */
export default function Home() {
  const colors = useColors();
  const record = usePokerRecord();
  const box = useFriendBox();
  return (
    <>
      <Stack.Screen options={{ title: 'Play', headerShown: false }} />
      <TabScreen
        title="Play"
        hero={({ top, width }) => <Hero top={top} width={width} />}
        accessory={
          <>
            <RequestsPill />
            <ProfileMenu />
          </>
        }
      >
        {box.invites.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            {box.invites.slice(0, 2).map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}
        <StartTiles />
        <GameRow />
        <ChallengeRow />
        <FriendsStrip />
        {record.hands > 0 ? <PassportCard /> : <FirstHand />}

        {__DEV__ && (
          <Section header="Development">
            <Row title="Design system" icon={{ symbol: 'paintbrush.fill', color: colors.indigo as string }} onPress={() => router.push('/design')} />
          </Section>
        )}

        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          Play chips only. They have no cash value and can&apos;t be bought or won.
        </ThemedText>
      </TabScreen>
    </>
  );
}
