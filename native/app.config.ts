import type { ConfigContext, ExpoConfig } from 'expo/config';

import { APP_INFO } from './appInfo.ts';

// The iPhone and iPad app. iOS only: there's no Google Play release.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_INFO.displayName,
  slug: 'flipup',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'flipup',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'web'],
  ios: {
    icon: './assets/expo.icon',
    ...(APP_INFO.bundleId ? { bundleIdentifier: APP_INFO.bundleId } : {}),
    // iPhone first: the iPad layout comes after the iPhone version is approved. Until then iPads run it in iPhone mode.
    supportsTablet: false,
    config: {
      // Only standard HTTPS (system networking), so the app is exempt from export documentation.
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // The QR scanner on the join sheet.
      NSCameraUsageDescription: 'FlipUp uses the camera to scan a table or party QR code so you can join it.',
    },
    privacyManifests: {
      // FlipUp never tracks anyone and asks for no App Tracking Transparency prompt.
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      // Matches the App Privacy answers in docs/APP_STORE.md. Keep the two in step.
      NSPrivacyCollectedDataTypes: [
        collected('NSPrivacyCollectedDataTypeUserID'),
        collected('NSPrivacyCollectedDataTypeDeviceID'),
        collected('NSPrivacyCollectedDataTypeOtherUserContent'),
        collected('NSPrivacyCollectedDataTypeGameplayContent'),
      ],
      // Required-reason APIs used by React Native and Expo modules that link statically.
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'] },
      ],
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ['expo-build-properties', { ios: { deploymentTarget: APP_INFO.iosDeploymentTarget } }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...(APP_INFO.easProjectId ? { eas: { projectId: APP_INFO.easProjectId } } : {}),
  },
});

/** A data type the app sends to our server: linked to the device's player, used only to run the game, never for tracking. */
function collected(type: string) {
  return {
    NSPrivacyCollectedDataType: type,
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
  };
}
