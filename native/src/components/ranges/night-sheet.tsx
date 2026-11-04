import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { brand, ForceScheme, ROUNDED, spacing } from '@/theme';

import { GrainBackground } from '../grain-background';
import { SheetScroll } from '../sheet-scroll';

/**
 * Range training's sheets (the start sheet, why, poker words, your tricks) live in the same room as the table: the
 * night grain page, white type, gold for what matters. No title bar; each sheet draws its own heading.
 */
export function NightSheet({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <ForceScheme scheme="dark">
      <GrainBackground grain={0.04}>
        <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg }}>{children}</SheetScroll>
        {footer}
      </GrainBackground>
    </ForceScheme>
  );
}

/** A sheet's heading: a small gold kicker over a big rounded title, and a line under it. */
export function SheetHeading({ kicker, title, line }: { kicker?: string; title: string; line?: string }) {
  return (
    <View style={{ gap: 4 }}>
      {kicker && (
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.3, color: brand.gold }}>
          {kicker.toUpperCase()}
        </Text>
      )}
      <Text maxFontSizeMultiplier={1.4} accessibilityRole="header" style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#ffffff' }}>
        {title}
      </Text>
      {line && (
        <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.7)' }}>
          {line}
        </Text>
      )}
    </View>
  );
}

/** A small section title on the night page. */
export function Kicker({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.6)' }}>
        {children.toUpperCase()}
      </Text>
      {right}
    </View>
  );
}

export const panel = { borderRadius: 24, borderCurve: 'continuous' as const, backgroundColor: 'rgba(255,255,255,0.07)', padding: spacing.md, gap: spacing.sm };
