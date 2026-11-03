import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { minTap, radius, spacing, useColors, useShadows } from '@/theme';

import { haptic } from './haptics';
import { Icon, type IconName } from './icon';
import { IconSquare } from './icon-square';
import { ThemedText } from './themed-text';

/**
 * A Settings-style group: a small uppercase grey header above, flat rounded cells with hairlines between them,
 * and a grey footnote under it. White page and #f2f2f7 cells in light mode; black page and #1c1c1e in dark.
 */
export function Section({ header, footer, children, inset = 60 }: { header?: string; footer?: string; children: ReactNode; /** Where the hairlines between rows start. */ inset?: number }) {
  const colors = useColors();
  const shadows = useShadows();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: spacing.xs }}>
      {header && (
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase', paddingHorizontal: spacing.md }} accessibilityRole="header">
          {header}
        </ThemedText>
      )}
      {/* The shadow on the outside, the clipping inside: iOS drops the shadow of a view that clips. */}
      <View style={{ borderRadius: radius.sm, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ backgroundColor: colors.cell, borderRadius: radius.sm, borderCurve: 'continuous', overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={row.key ?? i}>
            {row}
            {i < rows.length - 1 && <View style={{ height: 0.5, marginLeft: inset, backgroundColor: colors.separator }} />}
          </View>
        ))}
      </View>
      </View>
      {footer && (
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

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

/** One row in a Section: an optional icon square, the title, then a detail and chevron, or a control. */
export function Row({ title, subtitle, detail, icon, leading, trailing, accessory, onPress, destructive, chevron = true }: RowProps) {
  const colors = useColors();
  const body = (
    <View style={{ minHeight: minTap + 6, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
      {icon && <IconSquare {...icon} />}
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText tone={destructive ? 'red' : 'label'}>{title}</ThemedText>
        {subtitle && (
          <ThemedText variant="subhead" tone="tertiaryLabel">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {detail && <ThemedText tone="tertiaryLabel">{detail}</ThemedText>}
      {trailing}
      {accessory}
      {onPress && !accessory && chevron && <Icon name="chevron.right" size={14} color={colors.quaternaryLabel} />}
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
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.cellPressed : 'transparent' })}
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
