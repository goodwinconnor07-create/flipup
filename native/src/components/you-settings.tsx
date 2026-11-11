import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { CARD_PACKS } from '@/engine';
import { usePremium } from '@/state/premium';
import { setGoldName, useGoldName, useProfile, wornLook } from '@/state/profile';
import { ALT_ICONS, currentIcon } from '@/state/app-icon';
import { useReplays } from '@/state/replays';
import { forgetUltraMemory, useUltraHands } from '@/state/ultra';
import { setAppearance, setCalm, setFast, setMuted, setTalkOn, useAppearance, useCalm, useFast, useMuted, useTalkOn, type AppearancePref } from '@/state/prefs';
import { spacing, useColors } from '@/theme';

import { Row, Section } from './grouped-list';
import { SegmentedControl } from './segmented-control';
import { Switch } from './switch';
import { ThemedText } from './themed-text';

/**
 * How this phone looks and sounds, the same rows in Settings and in the table's menu (the web's `useYouRows()`):
 * appearance, sound, animations, the bots' talk and fast bot games, then card packs, the table theme
 * and hand rankings.
 */
export function YouSettings({ header, online = false }: { header?: string; online?: boolean }) {
  const colors = useColors();
  const muted = useMuted();
  const talk = useTalkOn();
  const calm = useCalm();
  const fast = useFast();
  const appearance = useAppearance();
  const premium = usePremium();
  const worn = wornLook(useProfile(), premium);
  const pack = CARD_PACKS.find((p) => p.id === worn.cardPack)?.name ?? 'Classic';
  const gold = useGoldName();
  const bank = useReplays().length;
  const ultraHands = useUltraHands();
  const icon = ALT_ICONS.find((i) => i.id === currentIcon())?.name ?? 'FlipUp';
  const locked = (go: () => void, reason: string) => () => (premium ? go() : router.push({ pathname: '/premium', params: { reason } }));
  return (
    <>
      <Section header={header}>
        <Row
          title="Appearance"
          icon={{ symbol: 'moon.fill', color: colors.indigo as string }}
          chevron={false}
          trailing={
            <View style={{ width: 156 }}>
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
        <Row title="Sound" icon={{ symbol: 'speaker.wave.2.fill', color: colors.violet as string }} chevron={false} trailing={<Switch label="Sound" value={!muted} onValueChange={(on) => setMuted(!on)} />} />
        <Row title="Animations" icon={{ symbol: 'bolt.fill', color: colors.gold as string }} chevron={false} trailing={<Switch label="Animations" value={!calm} onValueChange={(on) => setCalm(!on)} />} />
        <Row title="Bot talk" icon={{ symbol: 'bubble.left.fill', color: colors.green as string }} chevron={false} trailing={<Switch label="Bot talk" value={talk} onValueChange={setTalkOn} />} />
        <Row title="Fast bot games" icon={{ symbol: 'clock.fill', color: colors.gold as string }} chevron={false} trailing={<Switch label="Fast bot games" value={fast} onValueChange={setFast} />} />
      </Section>
      {fast && !online && (
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ marginTop: -spacing.md, paddingHorizontal: spacing.xl }}>
          Fast bot games start with your next bots-only table.
        </ThemedText>
      )}
      <Section>
 <Row title="Card packs" detail={pack} icon={{ symbol: 'suit.spade.fill', color: colors.indigo as string }} onPress={() => router.push('/card-packs')} />
        <Row title="Table theme" icon={{ symbol: 'paintpalette.fill', color: colors.pink as string }} onPress={() => router.push('/table-theme')} />
        <Row title="Hand rankings" icon={{ symbol: 'questionmark.circle.fill', color: colors.slate as string }} onPress={() => router.push('/hand-rankings')} />
      </Section>
      <Section header="Premium">
        <Row
          title="Gold name"
          icon={{ symbol: 'signature', color: colors.gold as string }}
          chevron={false}
          trailing={premium ? <Switch label="Gold name" value={gold} onValueChange={setGoldName} /> : undefined}
          detail={premium ? undefined : 'Premium'}
          onPress={premium ? undefined : () => router.push({ pathname: '/premium', params: { reason: 'gold' } })}
        />
        {!online && <Row title="App icon" detail={icon} icon={{ symbol: 'app.badge.fill', color: colors.indigo as string }} onPress={() => router.push('/app-icon')} />}
        {!online && <Row title="Share cards" icon={{ symbol: 'square.and.arrow.up', color: colors.violet as string }} onPress={() => router.push('/share')} />}
        <Row title="Hand bank" detail={bank ? String(bank) : undefined} icon={{ symbol: 'film.stack.fill', color: colors.violet as string }} onPress={locked(() => router.push('/replays'), 'replay')} />
        {!online && premium && ultraHands > 0 && (
          <Row
            title="ULTRA bots' memory"
            detail={`${ultraHands} hands`}
            icon={{ symbol: 'cpu.fill', color: colors.gold as string }}
            onPress={() =>
              Alert.alert('Forget your games?', 'ULTRA bots will start learning you from scratch.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Forget', style: 'destructive', onPress: forgetUltraMemory },
              ])
            }
          />
        )}
      </Section>
    </>
  );
}
