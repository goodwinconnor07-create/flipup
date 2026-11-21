// FlipUp's Core Haptics module (iPhone only): plays an AHAP pattern. Null when the module isn't in this build
// (the web, Expo Go, or an older build), so callers fall back to expo-haptics.
import { requireOptionalNativeModule } from 'expo-modules-core';

interface FlipupHaptics {
  isSupported(): boolean;
  play(ahap: string): Promise<void>;
}

export const FlipupHaptics = process.env.EXPO_OS === 'ios' ? requireOptionalNativeModule<FlipupHaptics>('FlipupHaptics') : null;
