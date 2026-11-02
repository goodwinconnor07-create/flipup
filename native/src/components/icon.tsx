import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * Every icon in the app is an SF Symbol, named by its SF Symbols name. Apple licenses SF Symbols for apps on
 * Apple platforms only, so the web build draws the closest Material Symbol instead (listed here, one per SF
 * Symbol the app uses). An icon used in the app must be in this table.
 */
const WEB = {
  'speaker.wave.2.fill': 'volume_up',
  'arrow.clockwise': 'refresh',
  'person.2.fill': 'group',
  'suit.spade.fill': 'playing_cards',
  'bubble.left.fill': 'chat_bubble',
  'chevron.right': 'chevron_right',
  minus: 'remove',
  plus: 'add',
  checkmark: 'check',
  xmark: 'close',
  'iphone.radiowaves.left.and.right': 'vibration',
  'hand.tap.fill': 'touch_app',
  'checkmark.circle.fill': 'check_circle',
  'xmark.circle.fill': 'cancel',
  sparkles: 'auto_awesome',
  'person.fill': 'person',
  'crown.fill': 'workspace_premium',
  'circle.grid.3x3.fill': 'dialpad',
  'person.3.fill': 'groups',
  'lock.fill': 'lock',
  'paintbrush.fill': 'palette',
} as const satisfies Partial<Record<SFSymbol, string>>;

export type IconName = keyof typeof WEB;

export function Icon({ name, size = 20, color, weight = 'semibold' }: { name: IconName; size?: number; color: ColorValue; weight?: SymbolWeight }) {
  return <SymbolView name={{ ios: name, web: WEB[name] as never }} size={size} tintColor={color} weight={weight} />;
}
