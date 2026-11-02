import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { Button } from '@/components/button';
import { Row, Section } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';

/** A system sheet with half and full detents and a grab handle. Swipe down or tap Done to close it. */
export default function SampleSheet() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, gap: spacing.xl }}>
      <ThemedText variant="title2">A native sheet</ThemedText>
      <Section header="Choose one" footer="Sheets open at half height and pull up to full.">
        <Row title="Classic" detail="✓" onPress={() => router.back()} />
        <Row title="Gold Rush" detail="Premium" onPress={() => router.back()} />
      </Section>
      <Button variant="secondary" title="Done" onPress={() => router.back()} />
    </ScrollView>
  );
}
