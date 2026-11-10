import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { InviteCard } from '@/components/invite-card';
import { Menu } from '@/components/menu';
import { ProfileMenu } from '@/components/profile-menu';
import { EmptyState, ListDivider, ListRow, LiveDot, PillTabs, PlusAction, SIZE } from '@/components/tab-list';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { FRIENDS_ON } from '@/scope';
import { APP_INFO } from '../../../../appInfo';
import { deviceId } from '@/state/device';
import { gamesFor, liveGames, pastGames, whoLine, type GameItem, type GamesTab } from '@/state/my-games';
import { useFriendBox } from '@/state/pals';
import { usePartyRef } from '@/state/party';
import { useRangeHistory } from '@/state/range-history';
import { usePokerRecord } from '@/state/record';
import { maybeAskForReview } from '@/state/review';
import { useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

const TABS: { id: GamesTab; label: string }[] = [
  { id: 'online', label: 'Online' },
  { id: 'bots', label: 'Bot Games' },
];

/**
 * My Games, after Flighty's My Flights: the title with share and your face, pill tabs for Online and Bot Games with
 * "+ Start a Game" beside them, then the game you're in now (a blinking green dot, its name in blue), a thin line,
 * and every game you've played under it, a little greyed. Nothing else.
 */
export default function MyGames() {
  const colors = useColors();
  const table = useTable();
  const party = usePartyRef();
  const record = usePokerRecord();
  const box = useFriendBox();
  const me = useMemo(() => deviceId(), []);
  const live = liveGames(table, party, me);
  const past = pastGames(record.games);

  // Opens on the tab a link names (`/?tab=bots`), else the one of the game you're in, else of the last one you played.
  const asked = useLocalSearchParams<{ tab?: string }>().tab;
  const [tab, setTab] = useState<GamesTab>(() => {
    if (asked === 'online' || asked === 'bots') return asked;
    const first = live[0] ?? past[0];
    return first ? (first.online ? 'online' : 'bots') : 'online';
  });
  // A new link while the tab is open switches to it (set during render, not in an effect).
  const [linked, setLinked] = useState(asked);
  if (asked !== linked) {
    setLinked(asked);
    if (asked === 'online' || asked === 'bots') setTab(asked);
  }
  const shown = gamesFor(tab, live, past);

  // After a good moment (three finished games or ten best plays) iOS may ask for a rating, once.
  const games = record.games.length;
  const bestPlays = useRangeHistory().filter((a) => a.grade === 'best').length;
  useEffect(() => {
    const t = setTimeout(() => void maybeAskForReview(games, bestPlays), 2500);
    return () => clearTimeout(t);
  }, [games, bestPlays]);

  const open = (g: GameItem) => {
    if (g.kind === 'table') router.push('/table');
    else if (g.kind === 'party') router.push('/party-room');
    else router.push(`/game/${g.variant}`);
  };

  const start = [
    { title: 'Play with friends', symbol: 'person.2.fill' as const, onPress: () => router.push('/play-friends') },
    { title: 'Play with bots', symbol: 'cpu.fill' as const, onPress: () => router.push('/play-bots') },
  ];
  return (
    <>
      <Stack.Screen options={{ title: 'My Games', headerShown: false }} />
      <TabScreen
        title="My Games"
        contentStyle={{ gap: spacing.md }}
        accessory={
          <>
            <RoundButton icon="square.and.arrow.up" label="Share FlipUp" onPress={shareApp} />
            <ProfileMenu />
          </>
        }
      >
        <PillTabs
          tabs={TABS}
          value={tab}
          onChange={setTab}
          action={
            <Menu
              label="Start a game"
              sections={[tab === 'bots' ? [...start].reverse() : start, [{ title: 'Join with a code', symbol: 'qrcode.viewfinder', onPress: () => router.push('/join') }]]}
            >
              <PlusAction label="Start a Game" />
            </Menu>
          }
        />

        {FRIENDS_ON && box.invites.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            {box.invites.slice(0, 2).map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}

        {shown.live.length + shown.past.length === 0 ? (
          <EmptyState
            title={tab === 'online' ? 'Deal In Your Friends' : 'Let’s Play a Hand'}
            line={tab === 'online' ? 'Tap Start a Game to host a table, or join one with a code' : 'Tap Start a Game to sit down with the bots'}
          />
        ) : (
          <View>
            {shown.live.map((g) => (
              <GameLineRow key={g.key} game={g} onPress={() => open(g)} />
            ))}
            {shown.live.length > 0 && shown.past.length > 0 && <ListDivider />}
            {shown.past.map((g, i) => (
              <GameLineRow key={g.key} game={g} separator={i < shown.past.length - 1} onPress={() => open(g)} />
            ))}
            {shown.past.length > 0 && (
              <Text maxFontSizeMultiplier={1.3} style={{ paddingTop: spacing.lg, fontSize: 13, color: colors.tertiaryLabel, textAlign: 'center' }}>
                Play chips only. They have no cash value.
              </Text>
            )}
          </View>
        )}
      </TabScreen>
    </>
  );
}

function shareApp() {
  haptic.tap();
  const url = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
  void Share.share({ message: `Poker night on your phones. Play FlipUp with me: ${url}`, url }).catch(() => undefined);
}

/** One game: its picture, how it's going or how it went, its name, and who was there. */
function GameLineRow({ game, separator, onPress }: { game: GameItem; separator?: boolean; onPress: () => void }) {
  const colors = useColors();
  const { shown, more } = whoLine(game.who);
  const people = shown.map((p) => `${p.emoji} ${p.name}`).join('   ');
  const label = [game.title, game.eyebrow, game.when, game.live ? 'Going on now' : '', shown.length ? `With ${shown.map((p) => p.name).join(', ')}${more ? ` and ${more} more` : ''}` : ''].filter(Boolean).join('. ');
  return (
    <ListRow
      leading={<GameThumb variant={game.variant} size={44} />}
      eyebrowLead={game.live ? <LiveDot /> : undefined}
      eyebrow={game.eyebrow}
      when={game.when}
      title={game.title}
      tint={game.live ? (colors.accent as string) : undefined}
      dim={!game.live}
      separator={separator}
      label={label}
      onPress={onPress}
      detail={
        shown.length > 0 ? (
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.small, color: game.live ? colors.secondaryLabel : colors.tertiaryLabel }}>
            {people}
            {more > 0 ? `   +${more}` : ''}
          </Text>
        ) : undefined
      }
    />
  );
}
