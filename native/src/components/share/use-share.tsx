// Saving a share card as a picture and handing it to the share sheet (react-native-view-shot), and the data a card
// needs about you. The card is drawn on screen (the composer shows it) and captured from there at 3x.
import { useRef, useState } from 'react';
import { Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { haptic } from '@/components/haptics';
import { useMyUsername } from '@/state/pals';
import { useProfile } from '@/state/profile';

import { shareText, type ShareData, type ShareWho } from './data';
import { CARD_H, CARD_W } from './designs';

export function useWho(): ShareWho {
  const profile = useProfile();
  const { username } = useMyUsername();
  return { name: profile.name || 'Me', emoji: profile.emoji || '🙂', username };
}

/** A ref to put on the card's view, and `share()` that saves it as a picture and opens the share sheet. */
export function useShareCapture() {
  // A host view; React Native's own View type doesn't fit both `ref` and captureRef, so it's held loosely.
  const ref = useRef<never>(null);
  const [busy, setBusy] = useState(false);
  const share = async (data: ShareData) => {
    if (busy) return;
    haptic.tap();
    setBusy(true);
    const text = shareText(data);
    try {
      if (Platform.OS === 'web' || !ref.current) throw new Error('no pictures here');
      const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile', width: CARD_W * 3, height: CARD_H * 3 });
      await Share.share({ url: uri, message: Platform.OS === 'ios' ? undefined : text });
      haptic.success();
    } catch {
      await Share.share({ message: text }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  return { ref, share, busy };
}
