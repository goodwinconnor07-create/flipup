import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { spacing, useColors, useScheme } from '@/theme';

import { haptic } from './haptics';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';

/**
 * The settings look (the owner, 16 Nov 2026, from a reference of Apple's inset grouped list): a small grey heading
 * over one rounded panel, rows with the title at the start and the value or control at the end, hairlines that
 * start at the text, and a grey footnote under the panel. Used by Settings, the table menu, the profile and the
 * other settings pages; the lobby keeps the Games-app panel from `grouped-list.tsx`.
 */
export const MENU_RADIUS = 24;
export const MENU_ROW = 56;

/** The colours of the list: Apple's grouped backgrounds (a grey page with white cells in light mode). */
export function useMenuColors() {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  return {
    page: dark ? (colors.background as string) : '#f2f2f7',
    fill: dark ? (colors.cell as string) : '#ffffff',
    pressed: dark ? (colors.cellPressed as string) : '#e5e5ea',
    hairline: colors.separator as string,
  };
}

/** A group: heading, panel, footnote. `children` are `MenuRow`s (or any row of your own). */
export function MenuSection({ header, footer, children, inset = spacing.md }: { header?: string; footer?: string; children: ReactNode; /** Where the hairlines start. */ inset?: number }) {
  const menu = useMenuColors();
  const rows = Children.toArray(children).filter(isValidElement);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {header && (
        <ThemedText variant="subhead" tone="secondaryLabel" accessibilityRole="header" style={{ paddingHorizontal: spacing.md }}>
          {header}
        </ThemedText>
      )}
      <View style={{ backgroundColor: menu.fill, borderRadius: MENU_RADIUS, borderCurve: 'continuous', overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={row.key ?? i}>
            {row}
            {i < rows.length - 1 && <View style={{ height: 0.5, marginLeft: inset, backgroundColor: menu.hairline }} />}
          </View>
        ))}
      </View>
      {footer && (
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

type MenuRowProps = {
  title: string;
  /** A smaller grey line under the title. */
  subtitle?: string;
  /** Grey text at the end, before the chevron (the current value). */
  detail?: string;
  /** Anything at the start of the row (a picture, an emoji). */
  leading?: ReactNode;
  /** A control at the end of the row (a Switch, a Stepper, a SegmentedControl). The row itself isn't tappable then. */
  accessory?: ReactNode;
  /** Something small at the end that doesn't take the tap (a crown, a spinner). */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Hide the chevron. */
  chevron?: boolean;
  /** An SF Symbol at the start, in the text's colour, in a fixed column so the titles line up (like the table menu's rows). */
  icon?: IconName;
  /** The icon's colour when it isn't the text's (a gold crown). */
  iconColor?: string;
};

/** One row: the title in regular 17pt, then the value and a chevron, or a control. Rows highlight while pressed. */
export function MenuRow({ title, subtitle, detail, icon, iconColor, leading, trailing, accessory, onPress, destructive, chevron = true }: MenuRowProps) {
  const colors = useColors();
  const menu = useMenuColors();
  const body = (
    <View style={{ minHeight: MENU_ROW, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
      {icon && (
        <View style={{ width: 28, alignItems: 'center' }}>
          <Icon name={icon} size={20} color={iconColor ?? (destructive ? (colors.red as string) : (colors.label as string))} />
        </View>
      )}
      {leading}
      <View style={{ flex: 1, gap: 1, paddingVertical: subtitle ? spacing.xxs : 0 }}>
        <ThemedText variant="body" tone={destructive ? 'red' : 'label'}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="footnote" tone="secondaryLabel">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {detail && (
        <ThemedText variant="body" tone="secondaryLabel" numberOfLines={1} style={{ flexShrink: 1, maxWidth: '60%', textAlign: 'right' }}>
          {detail}
        </ThemedText>
      )}
      {trailing}
      {accessory}
      {onPress && !accessory && chevron && <Icon name="chevron.right" size={14} color={colors.tertiaryLabel} />}
    </View>
  );
  if (!onPress || accessory) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? menu.pressed : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}
