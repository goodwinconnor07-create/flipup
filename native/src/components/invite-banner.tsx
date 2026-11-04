import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isVariant, variantInfo, type BjInvite } from '@/engine';
import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { inviteKey, useFriendBox } from '@/state/pals';
import { useTable } from '@/state/session';
import { radius, spacing, useColors, useShadows } from '@/theme';

import { Avatar } from './avatar';
import { GlassSurface } from './glass-surface';
import { haptic } from './haptics';
import { InviteButtons, useJoinInvite } from './invite-card';
import { ThemedText } from './themed-text';

/** How long the banner stays before it tucks itself away (the invite stays on Home and in Friends). */
const SHOW_MS = 12_000;

/** Only a fresh invite drops down; older ones wait on Home and in Friends (so a launch doesn't replay them). */
const FRESH_MS = 2 * 60_000;

/** Invites this launch has already shown as a banner: each one drops down once. */
const shown = new Set<string>();

/**
 * A friend's table invite as a banner over whatever screen you're on, the moment the 5-second friends check
 * brings it in: their face, the game, Decline and Join. It drops in under the status bar, stays 12 seconds, and
 * never shows for the table you're already at. Mounted once, in the root layout.
 */
export function InviteBanner() {
  const box = useFriendBox();
  const { code } = useTable();
  const [current, setCurrent] = useState<BjInvite | null>(null);
  useEffect(() => {
    if (current) {
      // The invite went (answered elsewhere, taken back, expired): so does the banner.
      if (!box.invites.some((i) => inviteKey(i) === inviteKey(current))) setCurrent(null);
      return;
    }
    const next = box.invites.find((i) => !shown.has(inviteKey(i)) && i.table !== code && Date.now() - i.at < FRESH_MS);
    if (!next) return;
    shown.add(inviteKey(next));
    haptic.success();
    setCurrent(next);
  }, [box.invites, code, current]);
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setCurrent(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);
  if (!current) return null;
  return <Banner key={inviteKey(current)} invite={current} onDone={() => setCurrent(null)} />;
}

function Banner({ invite, onDone }: { invite: BjInvite; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const shadows = useShadows();
  const colors = useColors();
  const reduce = useReduceMotion();
  const { join, busy } = useJoinInvite(invite, onDone);
  const game = variantInfo(isVariant(invite.game) ? invite.game : 'holdem');
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + spacing.xs, left: spacing.sm, right: spacing.sm }}>
      {/* The web build's blur is see-through, so there it sits on a solid cell. */}
      <Animated.View entering={enter(reduce)} exiting={exit(reduce)} style={{ borderRadius: radius.lg, boxShadow: shadows.card, ...(Platform.OS === 'web' ? { backgroundColor: colors.cell } : {}) }}>
        <GlassSurface interactive style={{ borderRadius: radius.lg, borderCurve: 'continuous' }}>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md }}>
            <Avatar emoji={invite.emoji} size={44} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline" numberOfLines={1}>
                {invite.name} invited you
              </ThemedText>
              <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1}>
                {game.emoji} {game.name}
              </ThemedText>
            </View>
            <InviteButtons invite={invite} join={join} busy={busy} onDecline={onDone} />
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}
