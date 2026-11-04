import { View } from 'react-native';

import { type Settings } from '@/engine';
import { spacing } from '@/theme';

import { SettingsFields } from '../settings-fields';
import { SetupRowTitle } from './setup-header';

/**
 * Chips, blinds and the house rules as one grouped block under the game row: the same rows and choices as
 * Setup always had (SettingsFields), with every icon square in the page's one colour.
 */
export function SettingsTable({ settings, onChange, tint, online = true }: { settings: Settings; onChange: (s: Settings) => void; tint: string; /** Adds the time to act and the busted players' peek (friends only). */ online?: boolean }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <SetupRowTitle title="Table" />
      <SettingsFields settings={settings} onChange={onChange} online={online} merged={{}} tint={tint} />
    </View>
  );
}
