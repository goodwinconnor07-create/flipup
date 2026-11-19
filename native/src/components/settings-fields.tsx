import {
  ANTE_CHOICES,
  anteChips,
  BOMB_CHOICES,
  BLIND_CAP_CHOICES,
  BLIND_MINUTE_MAX,
  blindsLabel,
  levelsFor,
  STACK_CHOICES,
  TIMER_CHOICES,
  timerLabel,
  withBlindCap,
  withStack,
  type Settings,
} from '@/engine';
import { useSuggestChallenge } from '@/state/table-feel';

import type { MenuGroup } from './native-menu.types';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** The ante's sizes, as a share of the big blind (the same words as the lobby's pills). */
const ANTE_WORDS: Record<number, string> = { 10: '10% BB', 25: '¼ BB', 50: '½ BB', 100: '1 BB' };

/**
 * Chips and blinds, and the house rules, as groups for `NativeMenu` (the table's settings sheet). `online` adds the
 * time to act and the busted players' peek, which only matter with friends. `bots` is how many everyday bots are at
 * the table (not Bot Lab ones): Bot level only shows when there are some, as in the lobby's House rules.
 */
export function useSettingsGroups({ settings, onChange, online, bots }: { settings: Settings; onChange: (s: Settings) => void; online: boolean; bots: number }): MenuGroup[] {
  const beatingCasual = useSuggestChallenge();
  const set = (patch: Partial<Settings>) => onChange(withBlindCap({ ...settings, ...patch }));
  const levels = levelsFor(settings.startingStack);
  const blindIndex = Math.max(
    0,
    levels.findIndex(([sb, bb]) => sb === settings.smallBlind && bb === settings.bigBlind),
  );
  const stackIndex = Math.max(0, STACK_CHOICES.indexOf(settings.startingStack));
  const caps = [0, ...BLIND_CAP_CHOICES.filter((c) => c > 0 && (c > settings.bigBlind || c === settings.blindCap))];
  const capIndex = Math.max(0, caps.indexOf(settings.blindCap ?? 0));
  const blindsFoot = settings.blindMinutes
    ? `Blinds rise every ${settings.blindMinutes} min${settings.blindCap ? `, up to ${blindsLabel([settings.blindCap / 2, settings.blindCap])}` : ''}.`
    : 'The blinds stay the same all game.';
  const clockFoot = online ? 'Time to act is how long each person gets before they check or fold.' : undefined;
  return [
    {
      id: 'chips',
      header: 'Chips and blinds',
      footer: blindsFoot,
      items: [
        { kind: 'stepper', id: 'stack', title: 'Starting chips', detail: chips(settings.startingStack), value: stackIndex, min: 0, max: STACK_CHOICES.length - 1, onChange: (i) => onChange(withStack(settings, STACK_CHOICES[i])) },
        { kind: 'stepper', id: 'blinds', title: 'Blinds', detail: blindsLabel([settings.smallBlind, settings.bigBlind]), value: blindIndex, min: 0, max: levels.length - 1, onChange: (i) => set({ smallBlind: levels[i][0], bigBlind: levels[i][1] }) },
        { kind: 'stepper', id: 'rise', title: 'Blinds go up', detail: settings.blindMinutes ? `${settings.blindMinutes} min` : 'Never', value: settings.blindMinutes ?? 0, min: 0, max: BLIND_MINUTE_MAX, onChange: (blindMinutes) => set({ blindMinutes }) },
        !!settings.blindMinutes && {
          kind: 'stepper',
          id: 'cap',
          title: 'Blinds stop at',
          detail: caps[capIndex] ? blindsLabel([caps[capIndex] / 2, caps[capIndex]]) : 'No limit',
          value: capIndex,
          min: 0,
          max: caps.length - 1,
          onChange: (i) => set({ blindCap: caps[i] }),
        },
      ],
    },
    {
      id: 'rules',
      header: 'House rules',
      footer: [clockFoot, 'House rules start with the next hand.'].filter(Boolean).join(' '),
      items: [
        (settings.variant ?? 'holdem') === 'holdem' && bots > 0 && {
          kind: 'segmented',
          id: 'bot-level',
          title: 'Bot level',
          stacked: true,
          value: settings.botDifficulty ?? 'casual',
          options: [
            { value: 'casual', label: 'Casual' },
            { value: 'challenge', label: 'Challenge' },
          ],
          onChange: (v) => set({ botDifficulty: v as 'casual' | 'challenge' }),
          note:
            beatingCasual && (settings.botDifficulty ?? 'casual') === 'casual'
              ? "You've beaten Casual three tables running. Try Challenge."
              : 'Challenge makes fewer small mistakes. Changes next hand.',
        },
        online && {
          kind: 'segmented',
          id: 'clock',
          title: 'Time to act',
          stacked: true,
          value: String(settings.turnSeconds),
          options: TIMER_CHOICES.map((t) => ({ value: String(t), label: timerLabel(t) })),
          onChange: (v) => set({ turnSeconds: Number(v) }),
        },
        { kind: 'toggle', id: 'rebuys', title: 'Rebuys', subtitle: online ? 'Busted players can buy back in' : 'If you bust, you can buy back in and keep playing', value: settings.rebuys, onChange: (rebuys) => set({ rebuys }) },
        !online && { kind: 'toggle', id: 'replay', title: 'Review after every hand', subtitle: 'A blue Review button and a 10 second countdown to the next hand', value: !!settings.replayEachHand, onChange: (replayEachHand) => set({ replayEachHand }) },
        online && { kind: 'toggle', id: 'peek', title: 'Busted players peek', subtitle: "Once you're out, you see everyone's cards", value: !!settings.showToBusted, onChange: (showToBusted) => set({ showToBusted }) },
        // Home game rules (the owner, 19 Nov 2026): on/off first; the size or how often shows only once it's on.
        { kind: 'toggle', id: 'ante', title: 'Ante', subtitle: settings.ante ? `Everyone puts in ${chips(anteChips(settings))} before the deal` : 'Everyone puts in a little before the deal', value: !!settings.ante, onChange: (on) => set({ ante: on ? 25 : 0 }) },
        !!settings.ante && {
          kind: 'segmented',
          id: 'ante-size',
          title: 'Ante size',
          stacked: true,
          value: String(settings.ante),
          options: ANTE_CHOICES.filter((a) => a > 0).map((a) => ({ value: String(a), label: ANTE_WORDS[a] ?? `${a}%` })),
          onChange: (v) => set({ ante: Number(v) }),
        },
        { kind: 'toggle', id: 'bomb', title: 'Bomb pot', subtitle: 'Everyone puts in 2 big blinds and play starts on the flop', value: !!settings.bombEvery, onChange: (on) => set({ bombEvery: on ? 10 : 0 }) },
        !!settings.bombEvery && {
          kind: 'segmented',
          id: 'bomb-every',
          title: 'How often',
          stacked: true,
          value: String(settings.bombEvery),
          options: BOMB_CHOICES.filter((b) => b > 0).map((b) => ({ value: String(b), label: `Every ${b}` })),
          onChange: (v) => set({ bombEvery: Number(v) }),
        },
        { kind: 'toggle', id: 'straddle', title: 'Straddle', subtitle: 'The player after the big blind puts in 2 big blinds', value: !!settings.straddle, onChange: (straddle) => set({ straddle }) },
        (settings.variant ?? 'holdem') === 'holdem' && {
          kind: 'toggle',
          id: 'twice',
          title: 'Run it twice',
          subtitle: 'When players are all in, they can deal the rest twice and split the pot',
          value: !!settings.runTwice,
          onChange: (runTwice) => set({ runTwice }),
        },
      ],
    },
  ];
}
