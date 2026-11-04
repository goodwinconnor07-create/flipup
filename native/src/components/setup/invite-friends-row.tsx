import { router } from 'expo-router';
import { View } from 'react-native';

import { type Pal } from '@/state/pals';
import { type TableInvite } from '@/state/table-invites';
import { useColors } from '@/theme';

import { AddFace, Face, FaceRow, Ripples, RING, StatusPill } from './faces';
import { SetupRowTitle } from './setup-header';

/**
 * Slot 1 of Play with friends, and the lobby's first row: Invite friends. Your friends as big faces; a tap sends
 * one an invite at once (purple rings ripple out and the face says "Invited…"), a second tap takes it back. When
 * they sit down the rings come again in green and it says "Joined". A no, or no answer in time, shows for a moment
 * and the face goes back to normal. `full` stops new invites once every seat is spoken for.
 */
export function InviteFriendsRow({
  pals,
  invites,
  full,
  onInvite,
  onUninvite,
}: {
  pals: Pal[];
  invites: Record<string, TableInvite>;
  full: boolean;
  onInvite: (pal: Pal) => void;
  onUninvite: (pal: Pal) => void;
}) {
  const colors = useColors();
  const tint = colors.accent as string;
  const out = pals.filter((p) => invites[p.code]?.status === 'invited').length;
  const joined = pals.filter((p) => invites[p.code]?.status === 'joined').length;
  const detail = [joined ? `${joined} joined` : '', out ? `${out} invited` : ''].filter(Boolean).join(' · ') || (pals.length ? 'Tap to invite' : undefined);
  return (
    <View style={{ gap: 4 }}>
      <SetupRowTitle big title="Invite friends" detail={full && !out && !joined ? 'Table full' : detail} />
      <FaceRow>
        {pals.map((p) => {
          const inv = invites[p.code];
          const status = inv?.status;
          const pill =
            status === 'invited' ? (
              <StatusPill text="Invited" dots color={RING.invited} />
            ) : status === 'joined' ? (
              <StatusPill text="Joined" color={RING.joined} />
            ) : status === 'declined' ? (
              <StatusPill text="Declined" color={colors.cellPressed as string} />
            ) : status === 'expired' ? (
              <StatusPill text="No answer" color={colors.cellPressed as string} />
            ) : undefined;
          const canInvite = !status || status === 'declined' || status === 'expired';
          return (
            <Face
              key={p.code}
              emoji={p.emoji}
              name={p.name}
              label={
                status === 'joined' ? `${p.name} has joined` : status === 'invited' ? `${p.name} is invited. Tap to take it back` : full ? `${p.name}. The table is full` : `Invite ${p.name}`
              }
              onPress={status === 'joined' ? undefined : status === 'invited' ? () => onUninvite(p) : canInvite && !full ? () => onInvite(p) : undefined}
              dim={canInvite && full}
              selected={status === 'joined' ? RING.joined : status === 'invited' ? RING.invited : undefined}
              ring={inv ? <Ripples play={inv.ring} color={status === 'joined' ? RING.joined : RING.invited} /> : undefined}
              pill={pill}
            />
          );
        })}
        <AddFace label="Add a friend" name={pals.length ? 'Add' : 'Add a friend'} tint={tint} onPress={() => router.push('/add-friend')} />
      </FaceRow>
    </View>
  );
}
