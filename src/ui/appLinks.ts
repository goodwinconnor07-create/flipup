// Where the iPhone app lives, for the web's "get the app" card. The App Store id is the one in
// native/eas.json (`ascAppId`); the scheme is `flipup` in native/app.config.ts.
export const APP_STORE_URL = 'https://apps.apple.com/app/id6829639428';

/** A link that opens the app straight at a table's code (the app's `[code].tsx` route). */
export const appLink = (code: string) => `flipup://${code}`;
