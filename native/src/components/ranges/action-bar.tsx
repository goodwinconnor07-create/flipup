import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Option, OptionId } from '@train/ranges/model';
import { brand, gradient, radius, ROUNDED, spacing } from '@/theme';

import { GRAIN_NIGHT } from '../grain-background';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';

type Kind = 'fold' | 'plain' | 'raise';

/** The table's colours: Fold red, Call and Check the plain bright button, Raise and bets green. */
const LOOK: Record<Kind, { colors: readonly [string, string, string]; ink: string; sub: string; glow: string }> = {
  fold: { colors: ['#ff6b5e', '#e5322d', '#a51d18'], ink: '#ffffff', sub: 'rgba(255,255,255,0.8)', glow: 'rgba(255,255,255,0.22)' },
  plain: { colors: ['#ffffff', '#f3f6ff', '#dbe5ff'], ink: brand.violetNight, sub: brand.violetDeep, glow: 'rgba(255,255,255,0.6)' },
  raise: { colors: ['#45dc8c', brand.raise, brand.raiseDeep], ink: '#ffffff', sub: 'rgba(255,255,255,0.85)', glow: 'rgba(255,255,255,0.25)' },
};

const SIZE_NAME: Partial<Record<OptionId, string>> = { bet33: '⅓ pot', bet75: '¾ pot', bet125: 'Overbet' };
const BETS: OptionId[] = ['bet33', 'bet75', 'bet125'];

/** Room to leave above the bottom of the screen for the bar. */
export const ACTION_BAR_ROOM = 150;

/**
 * Your answer, pinned to the bottom over a fade into the night. Facing a bet: Fold, Call and Raise. Otherwise:
 * Check and Bet, with the bet's size picked from three pills above (tap one, or slide a thumb across them; a tick
 * for each). Each button is a living card (no grain: the room has it) with a soft shadow that dips as you press. Pro adds Lock it in:
 * double points for a best play, a loss for a miss, with a firm thud as it locks.
 */
export function ActionBar({
  options,
  size,
  onSize,
  onPick,
  pro,
  locked,
  onLock,
  onHeight,
  waiting,
}: {
  /** The hand is still being told: the buttons sit back, and a tap skips to your move. */
  waiting?: boolean;
  options: Option[];
  size: OptionId;
  onSize: (id: OptionId) => void;
  onPick: (id: OptionId) => void;
  pro: boolean;
  locked: boolean;
  onLock: () => void;
  onHeight?: (h: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const night = GRAIN_NIGHT[2];
  const facing = options.some((o) => o.id === 'call');
  const by = (id: OptionId) => options.find((o) => o.id === id);
  const bet = by(size) ?? by('bet75');
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => onHeight?.(e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        gap: spacing.sm,
        ...gradient(`linear-gradient(180deg, ${night}00 0%, ${night}d9 30%, ${night} 100%)`),
      }}
    >
      <View style={{ gap: spacing.sm, opacity: waiting ? 0.45 : 1 }}>
      {(pro || !facing) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {pro && <LockChip locked={locked} onPress={onLock} />}
          {!facing && <SizeScrub options={BETS.map((id) => by(id)).filter((o): o is Option => !!o)} value={size} onChange={onSize} />}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {facing ? (
          <>
            <Answer kind="fold" title="Fold" onPress={() => onPick('fold')} />
            <Answer kind="plain" title="Call" sub={by('call')?.label.replace(/^Call /, '')} onPress={() => onPick('call')} />
            <Answer kind="raise" title={by('raise')?.label.startsWith('All in') ? 'All in' : 'Raise'} sub={by('raise')?.label.replace(/^Raise to |^All in \(|\)$/g, '')} onPress={() => onPick('raise')} />
          </>
        ) : (
          <>
            <Answer kind="plain" title="Check" onPress={() => onPick('check')} />
            <Answer kind="raise" title="Bet" sub={bet ? `${SIZE_NAME[bet.id]} · ${bet.label.match(/\(([^)]+)\)/)?.[1] ?? ''}` : undefined} onPress={() => bet && onPick(bet.id)} wide />
          </>
        )}
      </View>
      </View>
    </View>
  );
}

function Answer({ kind, title, sub, wide, onPress }: { kind: Kind; title: string; sub?: string; wide?: boolean; onPress: () => void }) {
  const look = LOOK[kind];
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title} onPress={onPress} outerStyle={{ flex: wide ? 2 : 1 }}>
      <LivingCard colors={look.colors} glow={look.glow} glow2="rgba(255,255,255,0.08)" shadow="soft" radius={radius.md} style={{ minHeight: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, paddingVertical: 6 }}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 19, lineHeight: 23, fontWeight: '800', color: look.ink }}>
          {title}
        </Text>
        {sub ? (
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, lineHeight: 16, fontWeight: '700', color: look.sub, fontVariant: ['tabular-nums'] }}>
            {sub}
          </Text>
        ) : null}
      </LivingCard>
    </PressableScale>
  );
}

function LockChip({ locked, onPress }: { locked: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel="Lock it in: double points for the best play, minus 50 for a miss"
      accessibilityState={{ checked: locked }}
      haptics={false}
      onPress={() => {
        if (!locked) haptic.thud();
        else haptic.select();
        onPress();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: locked ? brand.gold : 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: locked ? brand.gold : 'rgba(255,255,255,0.16)' }}
    >
      <Icon name={locked ? 'lock.fill' : 'lock.open.fill'} size={14} color={locked ? brand.goldInk : '#ffffff'} />
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', color: locked ? brand.goldInk : '#ffffff' }}>
        {locked ? 'Locked ×2' : 'Lock it in'}
      </Text>
    </PressableScale>
  );
}

/** The bet's size: three pills you tap, or slide across with a thumb, a selection tick at each one. */
function SizeScrub({ options, value, onChange }: { options: Option[]; value: OptionId; onChange: (id: OptionId) => void }) {
  const [width, setWidth] = useState(0);
  const at = (x: number) => {
    if (!width || !options.length) return;
    const i = Math.max(0, Math.min(options.length - 1, Math.floor((x / width) * options.length)));
    if (options[i].id !== value) {
      haptic.select();
      onChange(options[i].id);
    }
  };
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => at(e.nativeEvent.locationX)}
      onResponderMove={(e) => at(e.nativeEvent.locationX)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel="Bet size"
      accessibilityValue={{ text: SIZE_NAME[value] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const i = options.findIndex((o) => o.id === value);
        const j = e.nativeEvent.actionName === 'increment' ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1);
        if (j !== i) onChange(options[j].id);
      }}
      style={{ flex: 1, flexDirection: 'row', height: 40, padding: 3, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.16)' }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <View key={o.id} pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: on ? brand.gold : 'transparent' }}>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: on ? brand.goldInk : 'rgba(255,255,255,0.85)' }}>
              {SIZE_NAME[o.id]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
