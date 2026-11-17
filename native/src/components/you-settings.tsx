import { router } from 'expo-router';

import { CARD_PACKS } from '@/engine';
import { usePremium } from '@/state/premium';
import { setGoldName, useGoldName, useProfile, wornLook } from '@/state/profile';
import { useReplays } from '@/state/replays';
import { setAppearance, setCalm, setFast, setHaptics, setLiveActivity, setMuted, setTalkLevel, useAppearance, useCalm, useFast, useHaptics, useLiveActivity, useMuted, useTalkLevel, type AppearancePref, type TalkLevel } from '@/state/prefs';

import { FlipupLive } from '../../modules/flipup-live';

import type { MenuGroup } from './native-menu.types';

/**
 * How this phone looks and sounds, the same rows in Settings and in the table's menu (the web's `useYouRows()`):
 * appearance, sound, animations, the bots' talk and fast bot games, then card packs, the table theme and hand
 * rankings, then Premium's Gold name and Share cards. Returned as groups for `NativeMenu`.
 */
export function useYouGroups({ header, online = false }: { header?: string; online?: boolean }): MenuGroup[] {
  const muted = useMuted();
  const haptics = useHaptics();
  const live = useLiveActivity();
  const talk = useTalkLevel();
  const calm = useCalm();
  const fast = useFast();
  const appearance = useAppearance();
  const premium = usePremium();
  const worn = wornLook(useProfile(), premium);
  const pack = CARD_PACKS.find((p) => p.id === worn.cardPack)?.name ?? 'Classic';
  const gold = useGoldName();
  const bank = useReplays().length;
  return [
    {
      id: 'you',
      header,
      footer: fast && !online ? 'Fast bot games start with your next bots-only table.' : undefined,
      items: [
        {
          kind: 'segmented',
          id: 'appearance',
          title: 'Appearance',
          value: appearance,
          options: [
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ],
          onChange: (v) => setAppearance(v as AppearancePref),
        },
        { kind: 'toggle', id: 'sound', title: 'Sound', value: !muted, onChange: (on) => setMuted(!on) },
        { kind: 'toggle', id: 'haptics', title: 'Haptics', value: haptics, onChange: setHaptics },
        // Only on an iPhone build that has the Live Activity in it (never the web build).
        FlipupLive && { kind: 'toggle', id: 'live', title: 'Live Activity', value: live, onChange: setLiveActivity },
        { kind: 'toggle', id: 'animations', title: 'Animations', value: !calm, onChange: (on) => setCalm(!on) },
        {
          kind: 'segmented',
          id: 'talk',
          title: 'Bot talk',
          value: talk,
          options: [
            { value: 'off', label: 'Off' },
            { value: 'some', label: 'Some' },
            { value: 'chatty', label: 'Chatty' },
          ],
          onChange: (v) => setTalkLevel(v as TalkLevel),
        },
        { kind: 'toggle', id: 'fast', title: 'Fast bot games', value: fast, onChange: setFast },
      ],
    },
    {
      id: 'looks',
      items: [
        { kind: 'link', id: 'saved', title: 'Saved hands', detail: bank ? String(bank) : undefined, onPress: () => router.push('/replays') },
        { kind: 'link', id: 'packs', title: 'Card packs', detail: pack, onPress: () => router.push('/card-packs') },
        { kind: 'link', id: 'theme', title: 'Table theme', onPress: () => router.push('/table-theme') },
        { kind: 'link', id: 'rankings', title: 'Hand rankings', onPress: () => router.push('/hand-rankings') },
      ],
    },
    {
      id: 'premium',
      header: 'Premium',
      items: [
        premium
          ? { kind: 'toggle', id: 'gold', title: 'Gold name', value: gold, onChange: setGoldName }
          : { kind: 'link', id: 'gold', title: 'Gold name', trailingCrown: true, onPress: () => router.push({ pathname: '/premium', params: { reason: 'gold' } }) },
        !online && { kind: 'link', id: 'share', title: 'Share cards', onPress: () => router.push('/share') },
      ],
    },
  ];
}
