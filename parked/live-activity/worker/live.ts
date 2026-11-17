// Live Activities: the table pushes each registered phone its own Lock Screen and Dynamic Island view through Apple's
// push service (APNs), so it keeps up while the app is closed. What goes out is `liveState()` (src/game/liveActivity.ts),
// worked out from that phone's redacted view only.
//
// Needs three things set on the Worker, and does nothing without them:
//   APNS_KEY      secret: the .p8 key from the Apple Developer portal (Keys > + > Apple Push Notifications service)
//   APNS_KEY_ID   secret: that key's 10-character id
//   APPLE_TEAM_ID var (wrangler.jsonc), already set for the app links
// The topic is the app's bundle id (APPLE_BUNDLE_ID) with ".push-type.liveactivity".

import type { LiveState } from '../src/game';

/** One phone's Live Activity at one table. Kept in the table's storage; never sent to any phone. */
export interface LiveReg {
  /** The ActivityKit push token, hex. */
  token: string;
  /** The key the activity's Check button sends back: random, per phone and table, and only good for a check. */
  act: string;
  /** A development build talks to Apple's sandbox. */
  sandbox: boolean;
  /** The last state sent, to skip pushes that change nothing and to judge how urgent the next one is. */
  last: LiveState | null;
}

type Vars = { APNS_KEY?: string; APNS_KEY_ID?: string; APPLE_TEAM_ID?: string; APPLE_BUNDLE_ID?: string };

export const isPushToken = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64,200}$/.test(v);

/** Whether this Worker has what it needs to push. Without it, phones keep their activity up to date only while the app is open. */
export function canPush(env: unknown): boolean {
  const v = env as Vars;
  return !!(v.APNS_KEY && v.APNS_KEY_ID && v.APPLE_TEAM_ID && v.APPLE_BUNDLE_ID);
}

const b64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const textB64url = (s: string): string => b64url(new TextEncoder().encode(s));

/** The .p8 file's PEM, as the bytes WebCrypto imports. */
export function pemBytes(pem: string): Uint8Array {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/**
 * Apple's provider token: a JWT signed with ES256. Apple wants it renewed at least every hour and no more than every
 * 20 minutes, so one is kept for 40 minutes per Worker instance.
 */
let cached: { jwt: string; at: number; kid: string } | null = null;
export async function providerToken(env: unknown, now = Date.now()): Promise<string> {
  const v = env as Vars;
  if (cached && cached.kid === v.APNS_KEY_ID && now - cached.at < 40 * 60_000) return cached.jwt;
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(v.APNS_KEY!), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = textB64url(JSON.stringify({ alg: 'ES256', kid: v.APNS_KEY_ID }));
  const claims = textB64url(JSON.stringify({ iss: v.APPLE_TEAM_ID, iat: Math.floor(now / 1000) }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${claims}`)));
  const jwt = `${head}.${claims}.${b64url(sig)}`;
  cached = { jwt, at: now, kid: v.APNS_KEY_ID! };
  return jwt;
}

export interface LivePush {
  event: 'update' | 'end';
  state: LiveState;
  priority: 5 | 10;
  /** Your turn: a short alert that lights up the island and plays the notification sound. */
  alert?: { title: string; body: string } | null;
  /** When the activity leaves the Lock Screen (seconds since 1970), for `end`. */
  dismissAt?: number;
  /** When the activity counts as out of date (seconds since 1970): the view greys its clock. */
  staleAt?: number;
}

/** The JSON body Apple expects for a Live Activity push. */
export function apnsBody(push: LivePush, now = Date.now()): string {
  const aps: Record<string, unknown> = {
    timestamp: Math.floor(now / 1000),
    event: push.event,
    'content-state': push.state,
  };
  if (push.alert) aps.alert = { title: push.alert.title, body: push.alert.body, sound: 'default' };
  if (push.dismissAt !== undefined) aps['dismissal-date'] = push.dismissAt;
  if (push.staleAt !== undefined) aps['stale-date'] = push.staleAt;
  return JSON.stringify({ aps });
}

export type PushOutcome = 'sent' | 'gone' | 'failed';

/**
 * Sends one push. 'gone' means Apple says the token is dead (the activity ended or the app was deleted), so the caller
 * drops the registration. Never throws.
 */
export async function sendLive(env: unknown, reg: LiveReg, push: LivePush): Promise<PushOutcome> {
  const v = env as Vars;
  if (!canPush(env)) return 'failed';
  try {
    const host = reg.sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
    const res = await fetch(`${host}/3/device/${reg.token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${await providerToken(env)}`,
        'apns-push-type': 'liveactivity',
        'apns-topic': `${v.APPLE_BUNDLE_ID}.push-type.liveactivity`,
        'apns-priority': String(push.priority),
        'content-type': 'application/json',
      },
      body: apnsBody(push),
    });
    if (res.ok) return 'sent';
    if (res.status === 410) return 'gone';
    const reason = await res.text().catch(() => '');
    if (res.status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(reason)) return 'gone';
    console.warn('APNs refused a Live Activity push', res.status, reason.slice(0, 200));
    return 'failed';
  } catch (e) {
    console.warn('APNs push failed', String(e).slice(0, 200));
    return 'failed';
  }
}
