import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { PlaylistEditor, playlistItem, type PlaylistItem } from '@/components/party/playlist-editor';
import { OpenTableButton } from '@/components/setup/open-table-button';
import { variantNeedsPremium, PARTY_MAX_GAMES, PARTY_MIN_GAMES, shufflePlaylist, VARIANTS, type Variant } from '@/engine';
import { readPartyDraft, setPartyGames } from '@/state/party-draft';
import { usePremium } from '@/state/premium';
import { ForceScheme } from '@/theme';

const ALL = VARIANTS.map((v) => v.id);

/**
 * A party's playlist, from "Start a party" on the lobby: the games in order (4 to 12, repeats allowed), a list of
 * every game to add, and a way to pick games up and move them (`PlaylistEditor`). Save keeps the playlist and goes
 * straight back to the lobby, which is where the party is set up; there's no screen after this one. On the same dark
 * blue page as the lobby.
 */
export default function PartyPlaylistScreen() {
  return (
    <ForceScheme scheme="dark">
      <Playlist />
    </ForceScheme>
  );
}

function Playlist() {
  const premium = usePremium();
  const [items, setItems] = useState<PlaylistItem[]>(() => {
    // A first playlist is Hold'em and five random games, and only free ones unless you have Premium: saving a list
    // with a crowned game opens the Premium offer, which shouldn't be what a fresh list does.
    const pool = ALL.filter((v) => v !== 'holdem' && (premium || !variantNeedsPremium(v)));
    const games: Variant[] = readPartyDraft()?.games ?? ['holdem', ...shufflePlaylist(pool, 5)];
    return games.map(playlistItem);
  });
  const ok = items.length >= PARTY_MIN_GAMES && items.length <= PARTY_MAX_GAMES;

  const save = () => {
    if (!ok) {
      haptic.failure();
      Alert.alert('Add a few more games', `A party needs at least ${PARTY_MIN_GAMES} games.`);
      return;
    }
    haptic.success();
    setPartyGames(items.map((i) => i.v));
    router.back();
  };

  return (
    <GrainBackground>
      <PlaylistEditor
        items={items}
        onChange={setItems}
        footer={<OpenTableButton title="Save playlist" line={ok ? `${items.length} games` : `Pick at least ${PARTY_MIN_GAMES} games`} onPress={save} />}
      />
    </GrainBackground>
  );
}
