import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Button } from '@/components/button';
import { SettingsFields } from '@/components/settings-fields';
import { ThemedText } from '@/components/themed-text';
import type { Settings } from '@/engine';
import { dispatch, useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

/** The host changes the table's chips, blinds and house rules. Mid-game, changes start next hand. */
export default function TableSettings() {
  const colors = useColors();
  const t = useTable();
  const [settings, setSettings] = useState<Settings | null>(t.game?.settings ?? null);
  if (!t.game || !settings) return null;
  const save = () => {
    if (dispatch({ type: 'settings', settings }) === null) router.back();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Table settings' }} />
      {t.game.status === 'playing' && (
        <ThemedText variant="subhead" tone="tertiaryLabel">
          Changes start next hand. A new stack size is for rebuys and new players.
        </ThemedText>
      )}
      <SettingsFields settings={settings} onChange={setSettings} online={t.mode === 'online'} />
      <Button variant="primary" size="lg" title="Save" onPress={save} />
    </ScrollView>
  );
}
