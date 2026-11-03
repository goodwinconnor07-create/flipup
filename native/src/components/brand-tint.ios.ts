import { tint } from '@expo/ui/swift-ui/modifiers';

import { brand } from '@/theme';

/** SwiftUI controls (switches, steppers, segments, sliders) tinted the brand violet instead of Apple's green or blue. */
export const brandTint = [tint(brand.violet)];
