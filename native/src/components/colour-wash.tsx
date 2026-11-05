import { View } from 'react-native';

import { gradient, usePlainColors } from '@/theme';

import { mix } from './game-icon';

/**
 * A colour behind the top of a sheet or screen that fades into the page, the way Apple's profile sheet takes its
 * colour from your picture. Put it first inside the scroll content: it reaches `reach` above the top (under a
 * see-through bar, and for the pull past the top) and `height` down into the content.
 */
export function ColourWash({ colour, height = 420, reach = 320 }: { colour: string; height?: number; reach?: number }) {
  const page = usePlainColors().background;
  const deep = mix(colour, '#000000', 0.12);
  const stop = Math.round((reach / (reach + height)) * 100);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -reach, left: 0, right: 0, height: reach + height, ...gradient(`linear-gradient(180deg, ${deep} 0%, ${deep} ${stop}%, ${mix(deep, page, 0.45)} ${Math.round(stop + (100 - stop) * 0.5)}%, ${page} 100%)`) }}
    />
  );
}
