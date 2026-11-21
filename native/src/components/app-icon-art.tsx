// The app icon drawn as SVG, exactly as on the Home Screen: the launch cover shows it big and the share cards carry it
// in their corner. Every number is in launch-mark.ts (checked against the icon script by tests/launch-mark.test.ts).
import Svg, { Defs, FeComposite, FeFlood, FeGaussianBlur, FeMerge, FeMergeNode, FeOffset, Filter, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ICON_COLORS, ICON_COLORS_DARK, ICON_SIZE, MARK, PLACE } from './launch-mark';

/** The app icon on a `size` square, drawn on the icon's own 1024 canvas with the icon script's gradient, light and lift shadow. */
export function IconArt({ size, dark = false, id = 'icon' }: { size: number; dark?: boolean; /** Prefix for the gradients' ids, so two icons on one web page don't share them. */ id?: string }) {
  const S = ICON_SIZE;
  // At night the icon is its dark look (the one iOS shows on a dark Home Screen), a night-blue gradient.
  const top = dark ? ICON_COLORS_DARK.violetTop : ICON_COLORS.violetTop;
  const bottom = dark ? ICON_COLORS_DARK.violetBottom : ICON_COLORS.violetBottom;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <LinearGradient id={`${id}-bg`} x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
        <RadialGradient id={`${id}-light`} cx="0.5" cy="0.08" r="0.75">
          <Stop offset="0" stopColor={dark ? ICON_COLORS_DARK.light : '#ffffff'} stopOpacity="0.22" />
          <Stop offset="1" stopColor={dark ? ICON_COLORS_DARK.light : '#ffffff'} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}-spade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ICON_COLORS.spadeTop} />
          <Stop offset="1" stopColor={ICON_COLORS.spadeBottom} />
        </LinearGradient>
        <Filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="160%">
          <FeGaussianBlur in="SourceAlpha" stdDeviation="28" result="b" />
          <FeOffset in="b" dy="24" result="o" />
          <FeFlood floodColor={ICON_COLORS.shadow} floodOpacity="0.5" />
          <FeComposite in2="o" operator="in" result="s" />
          <FeGaussianBlur in="SourceAlpha" stdDeviation="3" result="b2" />
          <FeOffset in="b2" dy="4" result="o2" />
          <FeFlood floodColor={ICON_COLORS.shadow} floodOpacity="0.25" />
          <FeComposite in2="o2" operator="in" result="s2" />
          <FeMerge>
            <FeMergeNode in="s" />
            <FeMergeNode in="s2" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>
      <Rect width={S} height={S} fill={`url(#${id}-bg)`} />
      <Rect width={S} height={S} fill={`url(#${id}-light)`} />
      <G filter={`url(#${id}-lift)`}>
        <Path d={MARK} transform={PLACE} fillRule="evenodd" fill={`url(#${id}-spade)`} />
      </G>
    </Svg>
  );
}
