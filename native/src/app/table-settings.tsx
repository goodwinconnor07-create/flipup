import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { NativeMenu } from '@/components/native-menu';
import { useSettingsGroups } from '@/components/settings-fields';
import type { Settings } from '@/engine';
import { dispatch, useTable } from '@/state/session';

/** The host changes the table's chips, blinds and house rules. Mid-game, changes start next hand. */
export default function TableSettings() {
  const t = useTable();
  if (!t.game) return null;
  return <Editor start={t.game.settings} playing={t.game.status === 'playing'} online={t.mode === 'online'} bots={t.game.players.filter((p) => p.bot && !p.labBot).length} />;
}

function Editor({ start, playing, online, bots }: { start: Settings; playing: boolean; online: boolean; bots: number }) {
  const [settings, setSettings] = useState<Settings>(start);
  const groups = useSettingsGroups({ settings, onChange: setSettings, online, bots });
  const save = () => {
    if (dispatch({ type: 'settings', settings }) === null) router.back();
  };
  return (
    <>
      <Stack.Screen options={{ title: 'Table settings' }} />
      <NativeMenu
        groups={[
          ...groups,
          {
            id: 'save',
            footer: playing ? 'Changes start next hand. A new stack size is for rebuys and new players.' : undefined,
            items: [{ kind: 'button', id: 'save', title: 'Save', onPress: save }],
          },
        ]}
      />
    </>
  );
}
