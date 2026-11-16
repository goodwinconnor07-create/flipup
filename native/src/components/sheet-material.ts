import { Platform } from 'react-native';

/** iOS 26 draws a form sheet in Liquid Glass when its content has no fill of its own: the light blur. Earlier iOS has no sheet material, so those keep a solid page. */
export const GLASS_SHEETS = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;
