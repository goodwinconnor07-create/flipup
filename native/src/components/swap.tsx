import { useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { swapIn, swapOut } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';

import { Icon } from './icon';

/**
 * One thing replacing another, the way motion rules 16 to 18 ask: whatever is in `children` is keyed by `id`, and when
 * `id` changes the old one leaves while the new one arrives, overlapping (no empty beat). `kind="icon"` crossfades
 * with scale and blur; `kind="text"` slides through a mask (the box clips it). An `id` of `null` shows nothing, and
 * what was there leaves the same way. The first thing shown doesn't animate. Use it for every icon that changes into
 * another icon and every label that changes into another label; never swap them with a bare ternary.
 */
export function Swap({ id, kind, children, size, style }: { id: string | null; kind: 'icon' | 'text'; children?: ReactNode; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  // The first thing shown doesn't animate: entrances start once `id` has changed (React's adjust-state-on-render pattern).
  const [prev, setPrev] = useState(id);
  const [ready, setReady] = useState(false);
  if (id !== prev) {
    setPrev(id);
    setReady(true);
  }
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, kind === 'text' ? { overflow: 'hidden' } : null, size ? { width: size, height: size } : null, style]}>
      {id === null ? null : (
        <Animated.View key={id} entering={ready ? swapIn(kind, reduce) : undefined} exiting={swapOut(kind, reduce)} style={size ? { position: 'absolute' } : undefined}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

type IconProps = Parameters<typeof Icon>[0];

/**
 * An icon that can change into another, or appear and disappear (`name` null). `reserve` keeps the box at the icon's
 * size while empty, so a row doesn't shift when the check mark comes and goes.
 */
export function SwapIcon({ name, reserve = true, ...rest }: Omit<IconProps, 'name'> & { name: IconProps['name'] | null; reserve?: boolean }) {
  return (
    <Swap id={name} kind="icon" size={reserve ? (rest.size ?? 20) : undefined}>
      {name ? <Icon name={name} {...rest} /> : null}
    </Swap>
  );
}
