import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { isVariant, type Variant } from '@/engine';
import { closeDemo, openDemo, useTable } from '@/state/session';
import { useColors } from '@/theme';

import { DemoTableView } from '../table';

export { ErrorBoundary } from '../table';

/**
 * The Demo: one hand of a game on the real table with the coach over it (components/demo). Opened by `showDemo()`,
 * which deals the demo before the screen comes up; a link straight here opens it itself. Whatever table you were at
 * comes back as it was when this screen goes (closeDemo()).
 */
export default function DemoScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const t = useTable();
  const colors = useColors();
  useEffect(() => {
    if (t.demo?.variant !== variant) openDemo(variant);
    return () => closeDemo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t.demo) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return <DemoTableView from={from} />;
}
