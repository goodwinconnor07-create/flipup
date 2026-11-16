// Reads FlipUp's subscriptions from App Store Connect and says whether they match what the app and the server expect
// (docs/SUBMISSION.md, step 2). Read-only: it changes nothing. Run by the "App Store Connect check" workflow with the
// repository's APPLE_KEY, APPLE_KEY_ID and APPLE_ISSUER_ID secrets; locally:
//   ASC_KEY_PATH=AuthKey.p8 ASC_KEY_ID=... ASC_ISSUER_ID=... node scripts/ascCheck.mjs
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const APP_ID = '6829639428'; // native/appInfo.ts appStoreId
const NOTIFY_URL = 'https://playflipup.com/api/apple/notifications';
const WANT = [
  { id: 'flipup.premium.monthly', period: 'ONE_MONTH', usd: 7 },
  { id: 'flipup.premium.yearly', period: 'ONE_YEAR', usd: 50 },
];

const { ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
if (!ASC_KEY_PATH || !ASC_KEY_ID || !ASC_ISSUER_ID) {
  console.error('Set ASC_KEY_PATH, ASC_KEY_ID and ASC_ISSUER_ID.');
  process.exit(2);
}

const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const key = createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}
const auth = `Bearer ${token()}`;

async function get(path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, { headers: { authorization: auth } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} on ${path}: ${data.errors?.[0]?.detail ?? data.errors?.[0]?.title ?? 'no detail'}`);
  return data;
}

const problems = [];
const ok = (text) => console.log(`  ok    ${text}`);
const bad = (text) => {
  problems.push(text);
  console.log(`  FIX   ${text}`);
};

console.log('App');
const app = await get(`/v1/apps/${APP_ID}`);
const a = app.data.attributes;
console.log(`  ${a.name} (${a.bundleId})`);
a.bundleId === 'com.goodwin.flipup' ? ok('bundle id') : bad(`bundle id is ${a.bundleId}, the app uses com.goodwin.flipup`);
a.subscriptionStatusUrl === NOTIFY_URL ? ok('server notifications URL (production)') : bad(`App Information > App Store Server Notifications: production URL should be ${NOTIFY_URL} (now ${a.subscriptionStatusUrl ?? 'not set'})`);
a.subscriptionStatusUrlForSandbox === NOTIFY_URL ? ok('server notifications URL (sandbox)') : bad(`App Store Server Notifications: sandbox URL should be ${NOTIFY_URL} (now ${a.subscriptionStatusUrlForSandbox ?? 'not set'})`);
a.subscriptionStatusUrlVersion === 'V2' ? ok('server notifications version 2') : bad(`App Store Server Notifications should be Version 2 (now ${a.subscriptionStatusUrlVersion ?? 'not set'})`);

console.log('\nSubscriptions');
const groups = await get(`/v1/apps/${APP_ID}/subscriptionGroups?include=subscriptions&limit=50`);
const subs = (groups.included ?? []).filter((x) => x.type === 'subscriptions');
for (const g of groups.data) console.log(`  group: ${g.attributes.referenceName}`);
if (!groups.data.length) bad('no subscription group yet');

const groupOf = new Map();
for (const g of groups.data) for (const s of g.relationships?.subscriptions?.data ?? []) groupOf.set(s.id, g.id);

const levels = [];
for (const want of WANT) {
  console.log(`\n  ${want.id}`);
  const sub = subs.find((s) => s.attributes.productId === want.id);
  if (!sub) {
    bad(`${want.id} doesn't exist (product IDs must match exactly)`);
    continue;
  }
  const s = sub.attributes;
  console.log(`  "${s.name}", state ${s.state}, group level ${s.groupLevel}`);
  levels.push({ id: want.id, group: groupOf.get(sub.id), level: s.groupLevel });
  s.subscriptionPeriod === want.period ? ok(`length ${want.period}`) : bad(`${want.id} length is ${s.subscriptionPeriod}, should be ${want.period}`);
  s.familySharable ? bad(`${want.id} has Family Sharing on (the server ties Premium to one phone's purchase)`) : ok('Family Sharing off');
  if (s.state === 'MISSING_METADATA') bad(`${want.id} is missing metadata (a localization, a price or the review screenshot)`);

  const locs = await get(`/v1/subscriptions/${sub.id}/subscriptionLocalizations`);
  locs.data.length ? ok(`localizations: ${locs.data.map((l) => l.attributes.locale).join(', ')}`) : bad(`${want.id} has no localization (display name and description)`);

  const prices = await get(`/v1/subscriptions/${sub.id}/prices?filter[territory]=USA&include=subscriptionPricePoint&limit=10`);
  const point = (prices.included ?? []).find((x) => x.type === 'subscriptionPricePoints');
  const usd = point ? Number(point.attributes.customerPrice) : null;
  usd === want.usd ? ok(`US price $${usd.toFixed(2)}`) : bad(`${want.id} US price is ${usd === null ? 'not set' : `$${usd.toFixed(2)}`}, the plan says $${want.usd.toFixed(2)}`);

  const intro = await get(`/v1/subscriptions/${sub.id}/introductoryOffers?filter[territory]=USA&include=subscriptionPricePoint&limit=10`);
  const offer = intro.data[0]?.attributes;
  if (!offer) bad(`${want.id} has no introductory offer in the US (the plan: pay up front, 1 month, $1.00)`);
  else {
    const offerPoint = (intro.included ?? []).find((x) => x.type === 'subscriptionPricePoints');
    const price = offerPoint ? Number(offerPoint.attributes.customerPrice) : 0;
    const line = `${offer.offerMode}, ${offer.duration}${offer.numberOfPeriods > 1 ? ` x${offer.numberOfPeriods}` : ''}${offer.offerMode === 'FREE_TRIAL' ? '' : `, $${price.toFixed(2)}`}`;
    offer.offerMode === 'PAY_UP_FRONT' && offer.duration === 'ONE_MONTH' && price === 1 ? ok(`intro offer ${line}`) : console.log(`  note  intro offer is ${line} (the plan was pay up front, 1 month, $1.00; the app words whatever is set)`);
  }

  try {
    const shot = await get(`/v1/subscriptions/${sub.id}/appStoreReviewScreenshot`);
    shot.data ? ok('review screenshot') : bad(`${want.id} has no review screenshot`);
  } catch {
    bad(`${want.id} has no review screenshot`);
  }
}

if (levels.length === 2) {
  if (levels[0].group !== levels[1].group) bad('the two plans are in different subscription groups; they belong in one group');
  else if (levels[0].level !== levels[1].level) console.log(`  note  the plans are on levels ${levels[0].level} and ${levels[1].level}; the same level is simplest (they unlock the same thing)`);
}

console.log(`\n${problems.length ? `${problems.length} to fix.` : 'Everything matches.'}`);
console.log('Not checked here (the API has no way in): the Paid Apps agreement, tax and banking, and sandbox testers.');
process.exit(problems.length ? 1 : 0);
