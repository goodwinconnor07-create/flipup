// Stable offline identities. The UI continues to receive only a name and an emoji.
import type { Style, StyleId } from './botStyles';

export const VOICE_NAMES = [
  'regular',
  'dry',
  'competitive',
  'oldSchool',
  'analytical',
  'sociable',
  'cheeky',
  'stoic',
  'optimist',
  'sceptic',
  'restless',
  'understated',
] as const;
export interface BotProfile {
  id: string;
  voice: number;
  /** Independent traits, not difficulty levels or hidden access to cards. */
  discipline: number;
  curiosity: number;
  pressure: number;
  patience: number;
  composure: number;
  sociability: number;
  signature: number;
}
export interface BotIdentity {
  name: string;
  emoji: string;
  style: StyleId;
  profile: BotProfile;
}

const FIRST = `Dave Mick Steve John Paul Tony Gary Mark Rob Pete Andy Chris Matt Dan Ben Jack Luke Tom Sam Will
James Joe Frank Alan Ken Phil Colin Ray Ron Barry Terry Dean Neil Ian Scott Craig Adam Aaron Brett Brad
Shane Troy Trent Glen Ross Sean Liam Owen Ryan Kyle Josh Jake Nick Vince Victor Eddie Danny Tommy Jimmy
Billy Bobby Ronnie Reggie Sonny Archie Alfie Harry George Charlie Arthur Walter Martin Simon David Brian
Darren Dennis Derek Graham Gordon Bruce Keith Kevin Wayne Warren Russell Roger Ralph Leonard Lewis Logan
Marcus Marco Andre Anton Ivan Omar Ravi Ali Hassan Luis Carlos Diego Miguel Sara Kate Jess`.split(/\s+/);
const INITIALS = ['B', 'C', 'D', 'H', 'M', 'W'];
const AVATARS = [
  '😎',
  '🤠',
  '🥸',
  '🧔',
  '👨',
  '🧑',
  '👨‍🦱',
  '👨‍🦲',
  '👨‍🦳',
  '🧓',
  '🦈',
  '🦅',
  '🐺',
  '🦁',
  '🐻',
  '♠️',
  '♦️',
  '♣️',
  '🎲',
  '🃏',
  '🏆',
  '🎱',
  '🗿',
  '🔥',
];
const STYLES: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'maniac', 'rock', 'station', 'gambler', 'trapper', 'nervous'];

function hash(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function profile(name: string): BotProfile {
  let seed = hash(name);
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  return {
    id: `pub-${hash(name).toString(36)}`,
    voice: Math.floor(next() * VOICE_NAMES.length),
    discipline: next(),
    curiosity: next(),
    pressure: next(),
    patience: next(),
    composure: next(),
    sociability: next(),
    signature: Math.floor(next() * 12),
  };
}

export function makeRoster(familiar: { name: string; emoji: string; style: StyleId }[]): BotIdentity[] {
  // 100 first names × 6 surname initials. Initials keep names within the existing ten-character limit.
  const regulars = FIRST.slice(0, 100).flatMap((first, i) =>
    INITIALS.map((initial, j) => {
      const name = `${first} ${initial}`;
      return {
        name,
        emoji: AVATARS[(i * 7 + j * 11) % AVATARS.length],
        style: STYLES[(i + j * 3) % STYLES.length],
        profile: profile(name),
      };
    }),
  );
  return [...regulars, ...familiar.map((b) => ({ ...b, profile: profile(b.name) }))];
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
/** Small continuous differences preserve the ten readable poker archetypes. */
export function individualStyle(base: Style, p: BotProfile): Style {
  const d = p.discipline - 0.5,
    a = p.pressure - 0.5,
    c = p.curiosity - 0.5;
  return {
    ...base,
    pre: {
      ...base.pre,
      tight: base.pre.tight ? clamp(base.pre.tight + d * 0.08, 0, 0.94) : 0,
      loose: clamp(base.pre.loose + c * 0.08),
      aggro: clamp(base.pre.aggro + a * 0.16, -1, 1),
      open: base.pre.open + a * 0.4,
      iso: clamp(base.pre.iso + a * 0.12),
    },
    post: {
      ...base.post,
      sizes: [...base.post.sizes],
      sense: clamp(base.post.sense + d * 0.12, 0.15),
      bluff: base.post.bluff + a * 0.025,
      value: base.post.value + d * 0.02,
      sticky: base.post.sticky + c * 0.04,
      wobble: Math.max(0.025, base.post.wobble * (1 - d * 0.5)),
    },
    adapt: clamp(base.adapt + 0.12 + p.discipline * 0.15, 0.12),
    mind: { tilt: clamp(base.mind.tilt * (1.2 - p.composure * 0.6)), grudge: clamp(base.mind.grudge * (0.8 + p.pressure * 0.4)) },
    tempo: { ...base.tempo, speed: base.tempo.speed * (0.85 + p.patience * 0.3), tank: base.tempo.tank * (0.8 + p.patience * 0.4) },
    talk: { ...base.talk, chatty: clamp(base.talk.chatty * (0.4 + p.sociability), 0.08, 0.95) },
  };
}
