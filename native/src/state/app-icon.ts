// The app icon on the home screen: FlipUp's own, or one of the five FlipUp Premium icons. The pictures are drawn by
// scripts/makeAltIcons.mjs and listed in app.config.ts; iOS keeps the choice, so nothing is stored here.
import { getAppIconName, resetAppIcon, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';
import type { ImageSourcePropType } from 'react-native';

export interface AltIcon {
  /** The id in app.config.ts. The plugin names the icon in PascalCase. */
  id: string;
  name: string;
  line: string;
  preview: ImageSourcePropType;
}

export const DEFAULT_ICON: AltIcon = { id: 'default', name: 'FlipUp', line: 'The original', preview: require('../../assets/images/icon.png') };

export const ALT_ICONS: AltIcon[] = [
  { id: 'royal', name: 'Royal Flush', line: 'Five spades, fanned', preview: require('../../assets/icons/royal-preview.png') },
  { id: 'chip', name: 'High Roller', line: 'Black clay and gold', preview: require('../../assets/icons/chip-preview.png') },
  { id: 'gold', name: 'Gold Foil', line: 'Struck on black lacquer', preview: require('../../assets/icons/gold-preview.png') },
  { id: 'neon', name: 'Neon', line: 'The sign over the door', preview: require('../../assets/icons/neon-preview.png') },
  { id: 'aces', name: 'Pocket Aces', line: 'On the felt', preview: require('../../assets/icons/aces-preview.png') },
];

const pascal = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

export const canChangeIcon = (): boolean => {
  try {
    return supportsAlternateIcons;
  } catch {
    return false;
  }
};

/** The id of the icon on the home screen now. */
export function currentIcon(): string {
  try {
    const name = getAppIconName();
    return ALT_ICONS.find((i) => pascal(i.id) === name || i.id === name)?.id ?? 'default';
  } catch {
    return 'default';
  }
}

/** Puts this icon on the home screen. iOS shows its own note that the icon changed. */
export async function setIcon(id: string): Promise<boolean> {
  try {
    if (id === 'default') await resetAppIcon();
    else await setAlternateAppIcon(pascal(id) as never);
    return true;
  } catch {
    return false;
  }
}

/** Losing Premium puts FlipUp's own icon back. */
export function resetIconIfLocked(premium: boolean): void {
  if (!premium && currentIcon() !== 'default') void setIcon('default');
}
