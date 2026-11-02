import { useColorScheme } from 'react-native';

import { shadows } from '@design/tokens';

/** Today's three shadow levels, as boxShadow strings. */
export function useShadows(): (typeof shadows)['light' | 'dark'] {
  return shadows[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
