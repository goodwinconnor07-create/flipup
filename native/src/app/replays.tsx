import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GRAIN_NIGHT, GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { SavedHandRow } from '@/components/saved-hand-row';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { clearReplays, KEEP, removeReplay, restoreReplay, useReplays, useStars, type Replay } from '@/state/replays';
import { offerUndo } from '@/state/undo';
import { brand, ForceScheme, radius, ROUNDED, spacing } from '@/theme';

/** How far the page's background reaches past the list: up under the see-through bar and the pull-down, and down past a short list. Kept modest because the lights are placed by percentage of the background's height. */
const BLEED_TOP = 320;
const BLEED_BOTTOM = 200;

/**
 * Saved hands (free): every hand you saved at the table with Save hand, newest first, starred ones on top.
 * A tap plays it back (`replay/[id]`); a long press offers Share and Remove.
 */
export default function HandBank() {
  return (
    <ForceScheme scheme="dark">
      <Bank />
    </ForceScheme>
  );
}

function Bank() {
  const insets = useSafeAreaInsets();
  const replays = useReplays();
  const stars = useStars();
  const list = [...replays.filter((r) => stars.includes(r.id)), ...replays.filter((r) => !stars.includes(r.id))];
  // Edit: a red remove button on every row, and Delete all at the top.
  const [editing, setEditing] = useState(false);
  const remove = (r: Replay) => {
    haptic.select();
    removeReplay(r.id);
  };
  const removeAll = () =>
    Alert.alert('Delete all saved hands?', `This removes all ${list.length} saved ${list.length === 1 ? 'hand' : 'hands'} from this phone. It can't be undone.`, [
      { text: 'Delete all', style: 'destructive', onPress: () => (haptic.success(), clearReplays(), setEditing(false)) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const open = (r: Replay) => {
    if (editing) return;
    haptic.tap();
    router.push({ pathname: '/replay/[id]', params: { id: r.id } });
  };
  const more = (r: Replay) => {
    haptic.select();
    Alert.alert(`Hand ${r.number}`, undefined, [
      { text: 'Share', onPress: () => router.push({ pathname: '/share-card', params: { kind: 'hand', id: r.id } }) },
      // The hand as data, for a bug report about how the bots played it (`npm run bot:explain` reads it).
      { text: 'Copy hand data', onPress: () => void Clipboard.setStringAsync(JSON.stringify(r)) },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeReplay(r.id);
          offerUndo(`Hand ${r.number} removed`, () => restoreReplay(r));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  return (
    // The scroll view is the screen (not inside the background), so the large title sits clear on the page and the bar blurs only once it scrolls.
    <ScrollView
      style={{ backgroundColor: GRAIN_NIGHT[1] }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
    >
      {/* The page's blue reaches past the list on every side: up under the see-through bar, down past a short list and out into
          the rubber band, so there's no seam under the header and no darker band below. */}
      <GrainBackground style={{ position: 'absolute', top: -BLEED_TOP, left: 0, right: 0, bottom: -BLEED_BOTTOM }} />
      {list.length > 0 && (
          <ThemedText variant="callout" tone="secondaryLabel">
            {list.length ? `${list.length} of ${KEEP} saved. ${editing ? 'Tap the red button to remove a hand.' : 'Tap one to watch it back.'}` : undefined}
          </ThemedText>
        )}
        {list.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -spacing.sm }}>
            <PressableScale accessibilityRole="button" accessibilityLabel={editing ? 'Done editing' : 'Edit saved hands'} onPress={() => (haptic.select(), setEditing((e) => !e))} style={{ paddingVertical: spacing.xs, paddingRight: spacing.md }}>
              <ThemedText variant="headline" style={{ color: brand.violetDark }}>
                {editing ? 'Done' : 'Edit'}
              </ThemedText>
            </PressableScale>
            {editing && (
              <PressableScale accessibilityRole="button" accessibilityLabel="Delete all saved hands" onPress={removeAll} style={{ paddingVertical: spacing.xs, paddingLeft: spacing.md }}>
                <ThemedText variant="headline" style={{ color: '#ff453a' }}>
                  Delete all
                </ThemedText>
              </PressableScale>
            )}
          </View>
        )}
        {!list.length && (
          <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' }}>
            <Icon name="film.stack.fill" size={28} color={brand.violetDark} />
            <ThemedText variant="headline" style={{ textAlign: 'center' }}>
              No saved hands yet
            </ThemedText>
            <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
              After a hand at any table, tap the bookmark in the table bar. It comes here to watch back and share.
            </ThemedText>
            {/* What one looks like once it's here: a saved hand row, marked as an example. */}
            <View accessible accessibilityLabel="Example: a saved hand, a flush in Texas Hold'em, up 420 chips" style={{ alignSelf: 'stretch', gap: spacing.xxs, marginTop: spacing.xs }}>
              <ThemedText variant="caption1" tone="tertiaryLabel" style={{ fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                Example
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <PlayingCard card="As" size="sm" width={30} />
                  <PlayingCard card="Ks" size="sm" width={30} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="star.fill" size={12} color={brand.gold} />
                    <ThemedText variant="callout" numberOfLines={1} style={{ fontWeight: '700' }}>
                      Flush
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption1" tone="secondaryLabel" numberOfLines={1}>
                    Texas Hold’em · Hand 12 · Today
                  </ThemedText>
                </View>
                <ThemedText style={{ fontFamily: ROUNDED, fontSize: 19, fontWeight: '800', color: brand.gold }}>+420</ThemedText>
                <Icon name="play.fill" size={14} color="rgba(255,255,255,0.6)" />
              </View>
            </View>
          </View>
        )}
        <View style={{ gap: spacing.xs }}>
          {list.map((r) => (
            <SavedHandRow key={r.id} replay={r} starred={stars.includes(r.id)} editing={editing} onPress={() => open(r)} onLongPress={() => more(r)} onRemove={() => remove(r)} />
          ))}
        </View>
    </ScrollView>
  );
}
