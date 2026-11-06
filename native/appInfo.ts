// Every name, id and link the iPhone app needs, in one place. app.config.ts reads this file and so
// does the app, so a change here reaches the build, the store listing notes and the screens at once.
// Nothing in here is a secret: keys and tokens live in GitHub and EAS secrets, never in the repo.

export const APP_INFO = {
  /** The name under the icon on the home screen. */
  displayName: 'FlipUp',
  /** The App Store name (30 characters at most). */
  storeName: 'FlipUp: Poker with Friends',
  /** The App Store subtitle (30 characters at most). */
  storeSubtitle: 'Variants and party nights',

  /** The bundle ID made in the Apple Developer portal under the name FlipUp. */
  bundleId: 'com.goodwin.flipup',

  /** The EAS project ID, made by the build workflow's `eas init` on 2 November 2026. */
  easProjectId: '55f84d03-0b82-48a2-9fa8-a4f76a7d112a',

  /** The Premium non-consumable in-app purchase, already made in App Store Connect. */
  premiumProductId: 'flipup.premium.unlock',

  /** The server the app talks to (the same Cloudflare Worker as the web app). The domain will change later. */
  apiOrigin: 'https://gtoduel.online',
  /** Public pages the store listing and the app link to. */
  privacyUrl: 'https://gtoduel.online/privacy',
  supportUrl: 'https://gtoduel.online/support',

  /** TODO(before launch): placeholder address. Replace before submitting (listed in docs/APP_STORE.md). */
  supportEmail: 'goodwinconnor007@gmail.com',

  /** The oldest iOS the app runs on. */
  iosDeploymentTarget: '18.0',
} as const;
