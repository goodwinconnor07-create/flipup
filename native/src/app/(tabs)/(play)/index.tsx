import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { InviteCard } from '@/components/invite-card';
import { ProfileMenu } from '@/components/profile-menu';
import { ListDivider, ListRow, LiveDot, PillTabs, PlusButton, SIZE } from '@/components/tab-list';
import { Icon } from '@/components/icon';
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
import { brand, spacing, useColors } from '@/theme';

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
          action={<PlusButton label="Join a Game" onPress={() => router.push('/join')} />}
        />

        {FRIENDS_ON && box.invites.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            {box.invites.slice(0, 2).map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}

        <View>
          {shown.live.length > 0 ? shown.live.map((g) => <GameLineRow key={g.key} game={g} onPress={() => open(g)} />) : <StartRow tab={tab} />}
          {shown.past.length > 0 && <ListDivider />}
          {shown.past.map((g, i) => (
            <GameLineRow key={g.key} game={g} separator={i < shown.past.length - 1} onPress={() => open(g)} />
          ))}
          {shown.past.length > 0 && (
            <Text maxFontSizeMultiplier={1.3} style={{ paddingTop: spacing.lg, fontSize: 13, color: colors.tertiaryLabel, textAlign: 'center' }}>
              Play chips only. They have no cash value.
            </Text>
          )}
        </View>
      </TabScreen>
    </>
  );
}

function shareApp() {
  haptic.tap();
  const url = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
  void Share.share({ message: `Poker night on your phones. Play FlipUp with me: ${url}`, url }).catch(() => undefined);
}

/**
 * When nothing is going on in this tab, its first row is a game waiting to be started, laid out like the others: a
 * blue plus where the game's picture goes, NEW under it, the title in blue. Online opens Play with friends, Bot Games
 * Play with bots.
 */
function StartRow({ tab }: { tab: GamesTab }) {
  const colors = useColors();
  const online = tab === 'online';
  return (
    <ListRow
      leading={
        <View style={{ width: 66, alignItems: 'center', gap: 6 }}>
          <View style={{ width: 40, height: 40, borderRadius: 40 * 0.24, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
            <Icon name="plus" size={20} color="#ffffff" weight="bold" />
          </View>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '500', letterSpacing: 0.4, color: colors.accent }}>
            NEW
          </Text>
        </View>
      }
      eyebrowLead={<SwapIcon name={online ? 'person.2.fill' : 'cpu.fill'} size={14} color={colors.accent} />}
      eyebrow={online ? 'Online' : 'Bot game'}
      when={
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.small, color: colors.secondaryLabel }}>
          {online ? 'Up to 9 ' : 'Ready '}
          <Text style={{ fontWeight: '700', color: colors.accent }}>{online ? 'players' : 'now'}</Text>
        </Text>
      }
      title="Start a Game"
      tint={colors.accent as string}
      label={online ? 'Start a game. Host a table and invite friends with a code' : 'Start a game. Sit down with the bots now'}
      onPress={() => {
        haptic.tap();
        router.push(online ? '/play-friends' : '/play-bots');
      }}
      detail={
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 16, lineHeight: 22, color: colors.label }}>
          {online ? 'Host a table and share the code' : 'You and four bots, any game'}
        </Text>
      }
    />
  );
}

/** The left column, as Flighty's status column: the game's picture and, under it, LIVE (with its dot), your place or LEFT. */
function StatusColumn({ game }: { game: GameItem }) {
  const colors = useColors();
  return (
    <View style={{ width: 66, alignItems: 'center', gap: 6 }}>
      <GameThumb variant={game.variant} size={40} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {game.live && <LiveDot size={6} />}
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 13, fontWeight: '500', letterSpacing: 0.4, color: game.live ? brand.raise : colors.secondaryLabel }}>
          {game.badge}
        </Text>
      </View>
    </View>
  );
}

/** Flighty's "Arrived 20m late": a grey word, then the part that matters in bold colour. */
function Status({ game }: { game: GameItem }) {
  const colors = useColors();
  const ink = { live: brand.raise, up: brand.goldDeep, down: colors.label, plain: colors.secondaryLabel }[game.tone];
  return (
    <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.small, color: colors.secondaryLabel, fontVariant: ['tabular-nums'] }}>
      {game.status ? `${game.status} ` : ''}
      <Text style={{ fontWeight: '700', color: ink }}>{game.strong}</Text>
    </Text>
  );
}

/** One game, laid out like a Flighty flight: status column, a grey line with how it went, the name, and who was there. */
function GameLineRow({ game, separator, onPress }: { game: GameItem; separator?: boolean; onPress: () => void }) {
  const colors = useColors();
  const { shown, more } = whoLine(game.who);
  const label = [game.title, game.eyebrow, `${game.status} ${game.strong}`, game.live ? 'Going on now' : game.badge, shown.length ? `With ${shown.map((p) => p.name).join(', ')}${more ? ` and ${more} more` : ''}` : ''].filter(Boolean).join('. ');
  return (
    <ListRow
      leading={<StatusColumn game={game} />}
      eyebrowLead={<SwapIcon name={game.online ? 'person.2.fill' : 'cpu.fill'} size={14} color={game.live ? colors.accent : colors.tertiaryLabel} />}
      eyebrow={game.eyebrow}
      when={<Status game={game} />}
      title={game.title}
      tint={game.live ? (colors.accent as string) : undefined}
      dim={!game.live}
      separator={separator}
      label={label}
      onPress={onPress}
      detail={
        shown.length > 0 ? (
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 16, lineHeight: 22, color: game.live ? colors.label : colors.secondaryLabel }}>
            {shown.map((p) => `${p.emoji} ${p.name}`).join('   ')}
            {more > 0 ? `   +${more}` : ''}
          </Text>
        ) : undefined
      }
    />
  );
}
