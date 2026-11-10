import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { brand, ROUNDED, spacing, useColors, useScheme, useShadows } from '@/theme';

import { haptic } from './haptics';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';

/** The panel behind a group: see-through over the blue pages in dark mode, Apple's grouped grey in light. */
export function usePanel() {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  return {
    fill: dark ? 'rgba(255, 255, 255, 0.085)' : (colors.cell as string),
    edge: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    hairline: dark ? 'rgba(255, 255, 255, 0.1)' : (colors.separator as string),
    pressed: dark ? 'rgba(255, 255, 255, 0.07)' : (colors.cellPressed as string),
    /** A small control or value chip sitting on a panel: a see-through white in dark mode, since system grey is a flat neutral that looks muddy on the blue pages. */
    chip: dark ? 'rgba(255, 255, 255, 0.13)' : (colors.cellPressed as string),
  };
}

/**
 * A group of rows in the Games-app style (the owner's pick, November 2026): a bold rounded heading over one big
 * rounded panel, see-through over the page in dark mode, with hairlines between rows and a grey footnote under it.
 */
export function Section({ header, footer, children, inset = 62 }: { header?: string; footer?: string; children: ReactNode; /** Where the hairlines between rows start. */ inset?: number }) {
  const shadows = useShadows();
  const panel = usePanel();
  const dark = useScheme() === 'dark';
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: spacing.sm }}>
      {header && (
        <ThemedText variant="title3" style={{ fontFamily: ROUNDED, fontWeight: '800', paddingHorizontal: spacing.xxs }} accessibilityRole="header">
          {header}
        </ThemedText>
      )}
      {/* The shadow on the outside, the clipping inside: iOS drops the shadow of a view that clips. */}
      <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', boxShadow: dark ? undefined : shadows.card }}>
        <View style={{ backgroundColor: panel.fill, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', borderWidth: 1, borderColor: panel.edge, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <View key={row.key ?? i}>
              {row}
              {i < rows.length - 1 && <View style={{ height: 0.5, marginLeft: inset, backgroundColor: panel.hairline }} />}
            </View>
          ))}
        </View>
      </View>
      {footer && (
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

/** Panels are rounder than cells were: the Games app's big soft corners. */
export const PANEL_RADIUS = 26;

type RowProps = {
  title: string;
  /** Greyer text under the title. */
  subtitle?: string;
  /** Grey text at the end, before the chevron (the current value: "Auto", "20s"). */
  detail?: string;
  /** An SF Symbol on a coloured square. */
  icon?: { symbol: IconName; color: string };
  /** Anything else at the start of the row instead of an icon (a game's picture). */
  leading?: ReactNode;
  /** A control at the end of the row (a Switch, a Stepper). When it's there the row itself isn't tappable. */
  accessory?: ReactNode;
  /** Something small before the chevron that doesn't take the tap (a Premium mark). */
  trailing?: ReactNode;
  /** Makes the row tappable, with a chevron. */
  onPress?: () => void;
  destructive?: boolean;
  /** Hide the chevron (pick lists show only a check). */
  chevron?: boolean;
};

/**
 * One row in a Section: a big glyph in its colour (no square behind it), a bold title with its state on a second
 * line (`detail` sits there unless there's a `subtitle`), then a chevron or a control.
 */
export function Row({ title, subtitle, detail, icon, leading, trailing, accessory, onPress, destructive, chevron = true }: RowProps) {
  const colors = useColors();
  const panel = usePanel();
  const second = subtitle ?? detail;
  const dark = useScheme() === 'dark';
  // One calm tint for every glyph (pale blue over dark panels, the brand blue on light), so a list reads as one
  // set; Premium's crown stays gold and red stays red (delete, leave).
  const glyph = (c: string) => (/crown|star/.test(icon?.symbol ?? '') ? brand.gold : c === (colors.red as unknown) ? (colors.red as string) : dark ? '#cfe0ff' : brand.violet);
  const body = (
    <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      {icon && (
        <View style={{ width: 32, alignItems: 'center' }}>
          <Icon name={icon.symbol} size={24} color={destructive ? (colors.red as string) : glyph(icon.color)} />
        </View>
      )}
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" tone={destructive ? 'red' : 'label'}>
          {title}
        </ThemedText>
        {second && (
          <ThemedText variant="subhead" tone="secondaryLabel">
            {second}
          </ThemedText>
        )}
      </View>
      {subtitle && detail && <ThemedText tone="tertiaryLabel">{detail}</ThemedText>}
      {trailing}
      {accessory}
      {onPress && !accessory && chevron && <Icon name="chevron.right" size={15} color={colors.tertiaryLabel} />}
    </View>
  );
  if (!onPress || accessory) return body;
  // Rows highlight while pressed, the way Settings rows do, rather than shrinking like a button.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? panel.pressed : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}

/** A tap on a row that changes a choice ticks like a selection, not a button. */
export const selectRow = (go: () => void) => () => {
  haptic.select();
  go();
};
