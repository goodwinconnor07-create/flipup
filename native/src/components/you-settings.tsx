import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { CARD_PACKS } from '@/engine';
import { usePremium } from '@/state/premium';
import { setGoldName, useGoldName, useProfile, wornLook } from '@/state/profile';
import { useReplays } from '@/state/replays';
import { setAppearance, setCalm, setFast, setMuted, setTalkLevel, useAppearance, useCalm, useFast, useMuted, useTalkLevel, type AppearancePref, type TalkLevel } from '@/state/prefs';
import { brand, useColors } from '@/theme';

import { MenuRow, MenuSection } from './menu-list';
import { Icon } from './icon';
import { SegmentedControl } from './segmented-control';
import { Switch } from './switch';

/**
 * How this phone looks and sounds, the same rows in Settings and in the table's menu (the web's `useYouRows()`):
 * appearance, sound, animations, the bots' talk and fast bot games, then card packs, the table theme
 * and hand rankings.
 */
export function YouSettings({ header, online = false }: { header?: string; online?: boolean }) {
  const colors = useColors();
  // The segmented controls give up a little width on a narrow phone (iPhone SE, 375pt), so "Appearance" keeps one line.
  const { width } = useWindowDimensions();
  const segW = width < 390 ? 140 : 156;
  const muted = useMuted();
  const talk = useTalkLevel();
  const calm = useCalm();
  const fast = useFast();
  const appearance = useAppearance();
  const premium = usePremium();
  const worn = wornLook(useProfile(), premium);
  const pack = CARD_PACKS.find((p) => p.id === worn.cardPack)?.name ?? 'Classic';
  const gold = useGoldName();
  const bank = useReplays().length;
  return (
    <>
      <MenuSection header={header} footer={fast && !online ? 'Fast bot games start with your next bots-only table.' : undefined}>
        <MenuRow
          title="Appearance"
          icon={{ symbol: 'moon.fill', color: colors.indigo as string }}
          chevron={false}
          trailing={
            <View style={{ width: segW }}>
              <SegmentedControl<AppearancePref>
                label="Appearance"
                value={appearance}
                onChange={setAppearance}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </View>
          }
        />
        <MenuRow title="Sound" icon={{ symbol: 'speaker.wave.2.fill', color: colors.violet as string }} chevron={false} trailing={<Switch label="Sound" value={!muted} onValueChange={(on) => setMuted(!on)} />} />
        <MenuRow title="Animations" icon={{ symbol: 'bolt.fill', color: colors.gold as string }} chevron={false} trailing={<Switch label="Animations" value={!calm} onValueChange={(on) => setCalm(!on)} />} />
        <MenuRow
          title="Bot talk"
          icon={{ symbol: 'bubble.left.fill', color: colors.green as string }}
          chevron={false}
          trailing={
            <View style={{ width: 186 }}>
              <SegmentedControl<TalkLevel>
                label="Bot talk"
                value={talk}
                onChange={setTalkLevel}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'some', label: 'Some' },
                  { value: 'chatty', label: 'Chatty' },
                ]}
              />
            </View>
          }
        />
        <MenuRow title="Fast bot games" icon={{ symbol: 'clock.fill', color: colors.gold as string }} chevron={false} trailing={<Switch label="Fast bot games" value={fast} onValueChange={setFast} />} />
      </MenuSection>
      <MenuSection>
        <MenuRow title="Saved hands" detail={bank ? String(bank) : undefined} icon={{ symbol: 'film.stack.fill', color: colors.violet as string }} onPress={() => router.push('/replays')} />
        <MenuRow title="Card packs" detail={pack} icon={{ symbol: 'suit.spade.fill', color: colors.indigo as string }} onPress={() => router.push('/card-packs')} />
        <MenuRow title="Table theme" icon={{ symbol: 'paintpalette.fill', color: colors.pink as string }} onPress={() => router.push('/table-theme')} />
        <MenuRow title="Hand rankings" icon={{ symbol: 'questionmark.circle.fill', color: colors.slate as string }} onPress={() => router.push('/hand-rankings')} />
      </MenuSection>
      <MenuSection header="Premium">
        <MenuRow
          title="Gold name"
          icon={{ symbol: 'signature', color: colors.gold as string }}
          chevron={false}
          trailing={premium ? <Switch label="Gold name" value={gold} onValueChange={setGoldName} /> : <Crown />}
          onPress={premium ? undefined : () => router.push({ pathname: '/premium', params: { reason: 'gold' } })}
        />
        {!online && <MenuRow title="Share cards" icon={{ symbol: 'square.and.arrow.up', color: colors.violet as string }} onPress={() => router.push('/share')} />}
      </MenuSection>
    </>
  );
}

/** The one sign of a locked row, the same everywhere: a small gold crown (never the word "Premium"). */
function Crown() {
  return (
    <View accessible accessibilityLabel="Premium">
      <Icon name="crown.fill" size={15} color={brand.gold} />
    </View>
  );
}
