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
  'bubble.left': 'chat_bubble_outline',
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
  'dollarsign.circle.fill': 'paid',
  'chart.line.uptrend.xyaxis': 'trending_up',
  'timer': 'timer',
  'eye.fill': 'visibility',
  'cpu.fill': 'smart_toy',
  'flag.checkered': 'sports_score',
  'line.3.horizontal': 'menu',
  'trophy.fill': 'emoji_events',
  'list.bullet': 'list',
  'person.badge.plus': 'person_add',
  'clock.fill': 'schedule',
  'stop.circle.fill': 'stop_circle',
  'rectangle.portrait.and.arrow.right': 'logout',
  'square.and.arrow.up': 'ios_share',
  'gearshape.fill': 'settings',
  'moon.fill': 'dark_mode',
  'bolt.fill': 'bolt',
  'paintpalette.fill': 'palette',
  'questionmark.circle.fill': 'help',
  'house.fill': 'home',
  'arrowtriangle.up.fill': 'arrow_drop_up',
  'arrowtriangle.down.fill': 'arrow_drop_down',
  shuffle: 'shuffle',
  'minus.circle.fill': 'do_not_disturb_on',
  'plus.circle.fill': 'add_circle',
  'delete.left': 'backspace',
  'person.crop.circle.badge.plus': 'person_add',
  pencil: 'edit',
  'flame.fill': 'local_fire_department',
  'hand.raised.fill': 'privacy_tip',
  'lifepreserver.fill': 'support',
  'envelope.fill': 'mail',
  'trash.fill': 'delete',
} as const satisfies Partial<Record<SFSymbol, string>>;

export type IconName = keyof typeof WEB;

export function Icon({ name, size = 20, color, weight = 'semibold' }: { name: IconName; size?: number; color: ColorValue; weight?: SymbolWeight }) {
  return <SymbolView name={{ ios: name, web: WEB[name] as never }} size={size} tintColor={color} weight={weight} />;
}
