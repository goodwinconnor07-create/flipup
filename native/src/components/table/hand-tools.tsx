import { router } from 'expo-router';
import { addScreenshotListener } from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { Icon, type IconName } from '@/components/icon';
import { usePremium } from '@/state/premium';
import { read, save as store } from '@/state/storage';
import { lastHand, saveLastHand, useLastHand, useLastSaved } from '@/state/replays';
import { brand, radius, spacing, useColors } from '@/theme';

const openPremium = () => router.push({ pathname: '/premium', params: { reason: 'replay' } });

/** Puts the last finished hand in your hand bank (Premium). Returns what to tell the player. */
export function useSaveHand(): { can: boolean; saved: boolean; save: () => void } {
  const hand = useLastHand();
  const saved = useLastSaved();
  const premium = usePremium();
  return {
    can: !!hand,
    saved,
    save: () => {
      if (!hand) return;
      if (!premium) {
        haptic.tap();
        openPremium();
        return;
      }
      if (saveLastHand()) haptic.success();
    },
  };
}

function BarButton({ icon, label, onPress, tint, dim }: { icon: IconName; label: string; onPress: () => void; tint?: string; dim?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: dim }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.4 : pressed ? 0.6 : 1 })}
    >
      <SwapIcon name={icon} size={17} color={tint ?? colors.label} />
    </Pressable>
  );
}

/** The bookmark in the table bar: saves the hand that just finished to your bank. Gold once it's in. */
export function SaveHandButton() {
  const { can, saved, save } = useSaveHand();
  const hand = useLastHand();
  return (
    <BarButton
      icon={saved ? 'bookmark.fill' : 'bookmark'}
      label={!can ? 'Save hand: no finished hand yet' : saved ? `Hand ${hand?.number} is in Saved hands` : `Save hand ${hand?.number}`}
      tint={saved ? brand.gold : undefined}
      dim={!can}
      onPress={() => {
        if (!can) return;
        if (saved) {
          haptic.tap();
          router.push('/replays');
        } else save();
      }}
    />
  );
}

/** The table's small share button: share the last hand as a card, save it, or share your stats. */
export function ShareButton() {
  const { can, saved, save } = useSaveHand();
  return <BarButton icon="square.and.arrow.up" label="Share" onPress={() => shareMenu(can, saved, save)} />;
}

function shareMenu(can: boolean, saved: boolean, save: () => void): void {
  haptic.tap();
  const items: { title: string; go: () => void }[] = [
    ...(can ? [{ title: 'Share the last hand', go: () => router.push({ pathname: '/share-card', params: { kind: 'hand', id: 'last' } }) }] : []),
    ...(can && !saved ? [{ title: 'Save the last hand', go: save }] : []),
    { title: 'Share my stats', go: () => router.push({ pathname: '/share-card', params: { kind: 'stats' } }) },
    { title: 'All share cards', go: () => router.push('/share') },
  ];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ options: [...items.map((i) => i.title), 'Cancel'], cancelButtonIndex: items.length }, (i) => items[i]?.go());
  } else Alert.alert('Share', undefined, [...items.map((i) => ({ text: i.title, onPress: i.go })), { text: 'Cancel', style: 'cancel' as const }]);
}

const TIP_KEY = 'flipup.handtoolstip';

/**
 * The first time a hand finishes at a table, a small card under the bar says what the two unlabelled icons do:
 * the bookmark saves the hand, the arrow shares it. Shown once on this phone, gone after 7 seconds or a tap.
 */
export function HandToolsTip() {
  const hand = useLastHand();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!hand || read<boolean>(TIP_KEY, false)) return;
    store(TIP_KEY, true);
    setShown(true);
    const t = setTimeout(() => setShown(false), 7000);
    return () => clearTimeout(t);
  }, [hand]);
  if (!shown) return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={{ position: 'absolute', top: insets.top + 60, left: spacing.md, right: spacing.md, zIndex: 19 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tip: the bookmark saves the hand you just played, the share button turns it into a card. Tap to close."
        onPress={() => setShown(false)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
      >
        <Icon name="bookmark" size={18} color={brand.gold} />
        <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.label }}>
          Tap the bookmark to save that hand, or share it as a card.
        </Text>
        <Icon name="square.and.arrow.up" size={18} color={colors.label} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Took a screenshot at the table? A small card drops in offering a proper share card of the hand (or your stats
 * before a hand has finished). Gone after 6 seconds, or when tapped away.
 */
export function ScreenshotPrompt() {
  const [shown, setShown] = useState(0);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove(): void } | undefined;
    try {
      sub = addScreenshotListener(() => setShown(Date.now()));
    } catch {
      // No screenshot events here (the simulator before iOS 17, say): nothing to offer.
    }
    return () => sub?.remove();
  }, []);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(0), 6000);
    return () => clearTimeout(t);
  }, [shown]);
  if (!shown) return null;
  const hand = lastHand();
  const go = () => {
    setShown(0);
    haptic.tap();
    router.push({ pathname: '/share-card', params: hand ? { kind: 'hand', id: 'last' } : { kind: 'stats' } });
  };
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 60, left: spacing.md, right: spacing.md, zIndex: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.lg, backgroundColor: colors.cell, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
        <Icon name="camera.viewfinder" size={20} color={brand.violet} />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.label }}>{hand ? 'Make it a share card?' : 'Share your stats instead?'}</Text>
        <Pressable accessibilityRole="button" onPress={go} style={({ pressed }) => ({ paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet, opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Share</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} onPress={() => setShown(0)}>
          <Icon name="xmark" size={14} color={colors.secondaryLabel} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
