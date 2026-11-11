import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';
import type { ConfigContext, ExpoConfig } from 'expo/config';

import { APP_INFO } from './appInfo.ts';

// The EAS project: from appInfo.ts, or from the build workflow until the ID has been copied there.
const projectId = APP_INFO.easProjectId || process.env.EAS_PROJECT_ID || '';

/** Takes `aps-environment` back out of the entitlements, whatever added it. */
const withoutPush: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });

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
    // Join links (playflipup.com/ACES42) open the app when it's installed. The Worker serves the matching file at
    // /.well-known/apple-app-site-association once APPLE_TEAM_ID is set in wrangler.jsonc.
    associatedDomains: [`applinks:${new URL(APP_INFO.apiOrigin).host}`],
    config: {
      // Only standard HTTPS (system networking), so the app is exempt from export documentation.
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Lets animations run at 120fps on ProMotion iPhones (Expo's template sets it too; this keeps it explicit).
      CADisableMinimumFrameDurationOnPhone: true,
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
        // The server keeps Apple's purchase id with the device id, so Premium works at online tables (worker/entitlement.ts).
        collected('NSPrivacyCollectedDataTypePurchaseHistory'),
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
    // A single-page app: the static pre-render would fix every colour to light mode before the page loads.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // The daily reminder is a local notification: no push, so no Push Notifications capability (the signing profile
    // doesn't have it). expo-notifications adds `aps-environment` on its own; this takes it back out.
    withoutPush as never,
    'expo-iap',
    ['expo-contacts', { contactsPermission: 'FlipUp shows your contacts so you can text a friend an invite. They stay on your phone and are never uploaded.' }],
    ['expo-camera', { cameraPermission: 'FlipUp uses the camera to scan a table or party QR code so you can join it.', microphonePermission: false, recordAudioAndroid: false }],
    ['expo-build-properties', { ios: { deploymentTarget: APP_INFO.iosDeploymentTarget } }],
    [
      'expo-splash-screen',
      {
        // The first colour of the launch cover (components/launch-cover.tsx) in each mode, with no picture, so it
        // hands over seamlessly: a light blue, and a very dark blue-black in dark mode.
        backgroundColor: '#e3efff',
        image: './assets/images/splash-icon.png',
        imageWidth: 1,
        dark: { backgroundColor: '#02040a', image: './assets/images/splash-icon.png' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...(projectId ? { eas: { projectId } } : {}),
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
