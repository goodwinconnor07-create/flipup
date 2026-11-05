import { Alert, type AlertButton } from 'react-native';

import { REPORT_REASONS, type ReportReason } from '@/engine';
import { sendReport } from '@/state/api';
import { block, isBlocked, unblock } from '@/state/blocks';
import { me } from '@/state/session';

import { haptic } from './haptics';

export interface MenuTarget {
  /** The key the block list knows them by (`seatKey()` or `memberKey()`). */
  key: string;
  /** What they're showing now (already hidden if blocked) and what they showed when unmasked. */
  name: string;
  emoji: string;
  where: 'table' | 'party' | 'board';
  code: string;
  /** Their seat id, or their party member id. */
  playerId: string;
}

/**
 * The menu on another person's seat or party row (App Store guideline 1.2): Report, Block or Unblock, and any
 * extra buttons the place adds (the host's Remove). iOS shows it as an alert with a row of buttons.
 */
export function openPlayerMenu(t: MenuTarget, title: string, message?: string, extra: AlertButton[] = []): void {
  haptic.tap();
  const blocked = isBlocked(t.key);
  Alert.alert(title, message, [
    ...extra,
    { text: 'Report…', onPress: () => askReason(t) },
    blocked
      ? { text: 'Unblock', onPress: () => unblock(t.key) }
      : {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            Alert.alert(`Block ${t.name}?`, "You won't see their name, picture or messages, and you won't be seated at a table they host. They aren't told.", [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: () => block(t.key, t.name, t.emoji) },
            ]),
        },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function askReason(t: MenuTarget): void {
  Alert.alert(`Report ${t.name}`, 'What’s wrong? We look at every report within 24 hours.', [
    ...REPORT_REASONS.map((r) => ({ text: r.label, onPress: () => void send(t, r.id) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

async function send(t: MenuTarget, reason: ReportReason): Promise<void> {
  try {
    await sendReport({ deviceId: me, where: t.where, code: t.code, reason, name: t.name, emoji: t.emoji, playerId: t.playerId });
    haptic.success();
    const blocked = isBlocked(t.key);
    Alert.alert('Thanks for telling us', 'We’ll look at it within 24 hours.', [
      ...(blocked ? [] : [{ text: `Block ${t.name}`, style: 'destructive' as const, onPress: () => block(t.key, t.name, t.emoji) }]),
      { text: 'OK', style: 'cancel' as const },
    ]);
  } catch (e) {
    haptic.failure();
    Alert.alert("Couldn't send the report", e instanceof Error ? e.message : 'Try again.');
  }
}
