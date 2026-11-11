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

  /** The App Store id (App Store Connect > General > App Information), for the share link and the rating page. */
  appStoreId: '6829639428',

  /** The old one-time Premium purchase. No longer sold; people who bought it keep Premium for good. */
  premiumProductId: 'flipup.premium.unlock',
  /**
   * FlipUp Premium as auto-renewing subscriptions, one subscription group ("FlipUp Premium") in App Store Connect:
   * monthly at $7.00 and yearly at $50.00. Each has an introductory offer: pay up front, $1.00 for 14 days. The prices on screen always come from the App Store. TODO(owner): make both in App Store
   * Connect with these ids and offers before the next build (docs/APP_STORE.md).
   */
  premiumMonthlyId: 'flipup.premium.monthly',
  premiumYearlyId: 'flipup.premium.yearly',

  /** The server the app talks to (the same Cloudflare Worker as the web app). The domain will change later. */
  apiOrigin: 'https://playflipup.com',
  /** Public pages the store listing and the app link to. */
  privacyUrl: 'https://playflipup.com/privacy',
  supportUrl: 'https://playflipup.com/support',
  /** Terms of use for the subscriptions: Apple's standard licence agreement (App Store Review 3.1.2 asks for a link). */
  termsUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',

  /** TODO(before launch): placeholder address. Replace before submitting (listed in docs/APP_STORE.md). */
  supportEmail: 'support@playflipup.com',

  /** The oldest iOS the app runs on. */
  iosDeploymentTarget: '18.0',
} as const;
