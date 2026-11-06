import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { variantInfo, type Game, type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { abandonLobby, changeTableCode, dispatch, leaveTable, me as myDevice, type TableState } from '@/state/session';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing } from '@/theme';

import { GrainBackground } from '../grain-background';
import { haptic } from '../haptics';
import { CodeCard } from '../lobby/code-card';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { Players } from '../lobby/players';
import { OPEN_BUTTON_ROOM, OpenTableButton } from '../setup/open-table-button';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';

/**
 * Before the first deal: Play with friends opens the table straight away, so this is that page (the owner's
 * reference was a game lobby). On the dark grain page, top to bottom: the game code with Copy and Change, the game
 * with Change and How it plays, the house rules (presets, then each number with a − + stepper, then the switches),
 * who's at the table with Add a bot, and Start game pinned at the bottom. The host changes things live; everyone
 * else sees the same page without the controls, waiting for the deal.
 */
export function Lobby({ game, online, conn }: { game: Game; online: boolean; conn: TableState['conn'] }) {
  return (
    <ForceScheme scheme="dark">
      <LobbyPage game={game} online={online} conn={conn} />
    </ForceScheme>
  );
}

function LobbyPage({ game, online, conn }: { game: Game; online: boolean; conn: TableState['conn'] }) {
  const insets = useSafeAreaInsets();
  const premium = usePremium();
  const host = game.hostDeviceId === myDevice;
  const s = game.settings;
  const people = game.players.filter((p) => !p.bot).length;

  const change = (next: Settings) => {
    if (!unlockToHost([next.variant ?? 'holdem'], premium)) return;
    dispatch({ type: 'settings', settings: next });
  };
  const changeCode = async (code: string): Promise<string | null> => {
    const go = async () => {
      try {
        await changeTableCode(code);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Couldn't change the code. Try again.";
      }
    };
    if (people <= 1) return go();
    // Anyone already sitting down came in with the old code; the table moves, so they'd need the new one.
    return new Promise((done) =>
      Alert.alert(
        'Change the code?',
        `${people - 1 === 1 ? "The friend who's" : `The ${people - 1} friends who are`} already here will need the new code to sit back down.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => done('') },
          { text: 'Change', onPress: () => void go().then(done) },
        ],
      ),
    );
  };

  const back = () => {
    haptic.tap();
    const leave = () => {
      if (host && game.code) abandonLobby(game.code);
      else leaveTable();
      router.dismissTo('/');
    };
    if (host && online && people > 1)
      return Alert.alert('Close the table?', 'Everyone here goes back to their Home screen.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Close', style: 'destructive', onPress: leave },
      ]);
    leave();
  };
  const deal = () => {
    if (!online || people > 1) return dispatch({ type: 'start' });
    Alert.alert(
      'Start without friends?',
      "Nobody's joined yet. Friends can still sit down later with the code and get dealt in on the next hand.",
      [
        { text: 'Wait', style: 'cancel' },
        { text: 'Start', onPress: () => dispatch({ type: 'start' }) },
      ],
    );
  };

  const status = online && conn === 'offline' ? 'Reconnecting…' : !host ? 'Waiting for the host to start.' : null;

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.xs,
          paddingBottom: (host ? OPEN_BUTTON_ROOM : spacing.xxxl) + insets.bottom,
          gap: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundButton icon="chevron.left" label={host ? 'Back, close the table' : 'Back, leave the table'} onPress={back} />
          <ThemedText variant="headline" accessibilityRole="header">
            Lobby
          </ThemedText>
          <RoundButton
            icon="line.3.horizontal"
            label="Menu"
            onPress={() => {
              haptic.tap();
              router.push('/table-menu');
            }}
          />
        </View>

        {status && (
          <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center', marginTop: -spacing.xs }}>
            {status}
          </ThemedText>
        )}

        {online && game.code && <CodeCard code={game.code} host={host} onChange={changeCode} />}

        <GameCard variant={s.variant ?? 'holdem'} host={host} />

        <HouseRules settings={s} onChange={host ? change : undefined} online={online} />

        <Players game={game} host={host} online={online} />
      </ScrollView>
      {host && (
        <OpenTableButton title="Start game" line={`${game.players.length} at the table · ${variantInfo(s.variant).name}`} onPress={deal} />
      )}
    </GrainBackground>
  );
}
