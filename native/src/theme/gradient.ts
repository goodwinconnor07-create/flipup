import type { ViewStyle } from 'react-native';

/**
 * A CSS gradient as a view style. React Native (New Architecture) reads `experimental_backgroundImage`; the web
 * build's React Native Web passes `backgroundImage` straight to CSS instead.
 */
export function gradient(css: string): ViewStyle {
  return process.env.EXPO_OS === 'web' ? ({ backgroundImage: css } as ViewStyle) : { experimental_backgroundImage: css };
}
