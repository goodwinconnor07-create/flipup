import { ScrollView, Text, View } from 'react-native';

import { standings, type Game } from '@/engine';
import { dispatch, me as myDevice } from '@/state/session';
import { spacing } from '@/theme';

import { Button } from '../button';
import { Row, Section } from '../grouped-list';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** A finished table: who won and the standings, then Play again or leave. Phase 5, step 8 builds the full finish page. */
export function Ended({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const rows = standings(game);
  const top = rows[0];
  const host = game.hostDeviceId === myDevice;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xl }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text style={{ fontSize: 72 }} maxFontSizeMultiplier={1}>
          {top?.emoji ?? '🏆'}
        </Text>
        <ThemedText variant="largeTitle" style={{ textAlign: 'center' }}>
          {top ? (top.deviceId === myDevice ? 'You win!' : `${top.name} wins!`) : 'Game over'}
        </ThemedText>
      </View>
      <Section header="Standings">
        {rows.map((r, i) => (
          <Row key={r.id} title={`${i + 1}. ${r.name}`} detail={chips(r.stack)} />
        ))}
      </Section>
      <View style={{ gap: spacing.sm }}>
        {host && <Button variant="party" tint="blue" size="lg" title="Play again" onPress={() => dispatch({ type: 'playAgain' })} />}
        <Button variant="secondary" title="Back to Home" onPress={onLeave} />
      </View>
    </ScrollView>
  );
}
