import { View } from 'react-native';

import { MAX_SEATS } from '@/engine';
import { spacing } from '@/theme';

import { Row, Section } from '../grouped-list';
import { Stepper } from '../stepper';
import { SetupRowTitle } from './setup-header';

/**
 * SLOT 2 of Play with friends: the bots row, second on the page, under Invite friends.
 *
 * Stage 6b rebuilds this row (bot faces with a + circle, a line from each bot as it sits down, no stepper). Until
 * then it's the old count so seats can still be filled: bots take the seats your friends leave empty. The page
 * owns `bots`; keep these props (6b may swap the count for a list of names).
 */
export function BotsRow({ bots, onChange, tint }: { bots: number; onChange: (n: number) => void; tint: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <SetupRowTitle title="Bots" />
      <Section footer="Bots fill seats your friends leave empty.">
        <Row
          title="Bots at the table"
          detail={String(bots)}
          icon={{ symbol: 'cpu.fill', color: tint }}
          accessory={<Stepper label="Bots" value={bots} min={0} max={MAX_SEATS - 1} onChange={onChange} />}
        />
      </Section>
    </View>
  );
}
