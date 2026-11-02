import { router, Stack } from 'expo-router';
import { ScrollView } from 'react-native';

import { GamePicture } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { isPremiumVariant, VARIANTS, withVariant } from '@/engine';
import { usePremium } from '@/state/premium';
import { setDraft, useDraft } from '@/state/setup-draft';
import { spacing, useColors } from '@/theme';

const THUMB = 44;

/** Every game as a native list with its picture; the chosen one has a check. Picking one goes back to Setup. */
export default function ChooseGame() {
  const s = useDraft();
  const colors = useColors();
  const premium = usePremium();
  const current = s.variant ?? 'holdem';
  return (
    <>
      <Stack.Screen options={{ title: 'Game' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}>
        <Section inset={spacing.md + THUMB + spacing.sm} footer={premium ? undefined : 'Games with a crown come with Premium, or watch a short ad to host one.'}>
          {VARIANTS.map((v) => (
            <Row
              key={v.id}
              title={v.name}
              subtitle={v.tagline}
              leading={<GamePicture variant={v.id} width={THUMB} height={THUMB} rounded={10} />}
              trailing={
                v.id === current ? (
                  <Icon name="checkmark" size={17} color={colors.accent} />
                ) : !premium && isPremiumVariant(v.id) ? (
                  <Icon name="crown.fill" size={15} color={colors.gold} />
                ) : undefined
              }
              chevron={false}
              onPress={() => {
                haptic.select();
                setDraft(withVariant(s, v.id));
                router.back();
              }}
            />
          ))}
        </Section>
      </ScrollView>
    </>
  );
}
