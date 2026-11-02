import { ScrollView } from 'react-native';

import { spacing } from '@/theme';

import { ThemedText } from './themed-text';

/**
 * TEMPORARY, Phase 5 only: stands in for a screen that a later step of Phase 5 builds, so Home's links go
 * somewhere while it's reviewed. Every use must be gone before submission (docs/APP_STORE.md, 2.1).
 */
export function ComingNext({ step, what }: { step: number; what: string }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}>
      <ThemedText variant="title3">{what}</ThemedText>
      <ThemedText tone="tertiaryLabel">Built in Phase 5, step {step}.</ThemedText>
    </ScrollView>
  );
}
