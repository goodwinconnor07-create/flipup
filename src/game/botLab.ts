// Bot Lab: bots people make themselves on their phone (Settings > Bot Lab) and seat at their own tables.
//
// A lab bot is a name, a face and eight dials from 0 to 10, plus how it talks. The dials are turned into a full
// `Style` (botStyles.ts) here, so a lab bot plays through the same brain as the named bots (`decide()` in
// botPlay.ts, or the game's own in botVariants.ts); the everyday Hold'em engine leaves it alone. The dials stay on
// the server (or the bots-only phone): `redactForDevice()` strips them like any bot's style. Bot Lab is Premium (the
// owner, 17 Nov 2026): the table room refuses a lab bot from a host without it, and so does the phone.
import { EMOJIS, isEmoji } from './emoji';
import { isNameBlocked } from './names';
import { NO_CRAFT, STYLES, type Style } from './botStyles';

/** How many bots one phone keeps in its lab. */
export const MAX_LAB_BOTS = 25;
/** The same as `LIMITS.maxNameLength` (reducer.ts imports this file, so it can't be read from there). */
export const LAB_NAME_MAX = 10;

export type DialId = 'hands' | 'aggression' | 'bluffing' | 'calling' | 'skill' | 'temper' | 'speed' | 'chat';
export type LabTone = 'friendly' | 'trash';

/** Every dial is a whole number from 0 to 10. */
export type LabDials = Record<DialId, number> & { tone: LabTone };

export interface LabDial {
  id: DialId;
  name: string;
  /** What 0 and 10 mean, for the dial's two ends. */
  low: string;
  high: string;
  /** A word for each fifth of the range (0-1, 2-3, 4-6, 7-8, 9-10), shown under the dial. */
  words: [string, string, string, string, string];
}

export const LAB_DIALS: LabDial[] = [
  { id: 'hands', name: 'Hands played', low: 'Tight', high: 'Loose', words: ['Only the best', 'Picky', 'Normal', 'Plays a lot', 'Plays anything'] },
  { id: 'aggression', name: 'Aggression', low: 'Passive', high: 'Aggressive', words: ['Never raises', 'Careful', 'Balanced', 'Pushy', 'Relentless'] },
  { id: 'bluffing', name: 'Bluffing', low: 'Honest', high: 'Bluffer', words: ['Never bluffs', 'Rarely', 'Sometimes', 'Often', 'Always at it'] },
  { id: 'calling', name: 'Calling', low: 'Folds', high: 'Calls', words: ['Folds to anything', 'Cautious', 'Fair', 'Sticky', 'Calls it all'] },
  { id: 'skill', name: 'Skill', low: 'Beginner', high: 'Expert', words: ['First night', 'Learning', 'Solid', 'Sharp', 'Pro'] },
  { id: 'temper', name: 'Temper', low: 'Calm', high: 'Hothead', words: ['Ice cold', 'Steady', 'Human', 'Touchy', 'Tilts hard'] },
  { id: 'speed', name: 'Speed', low: 'Thinker', high: 'Quick', words: ['Takes ages', 'Thoughtful', 'Normal', 'Quick', 'Instant'] },
  { id: 'chat', name: 'Chat', low: 'Quiet', high: 'Chatty', words: ['Silent', 'Quiet', 'Says a bit', 'Talkative', 'Never stops'] },
];

export const DIAL_IDS = LAB_DIALS.map((d) => d.id);

/** A new bot's dials: the middle of everything, friendly. */
export const DEFAULT_DIALS: LabDials = { hands: 5, aggression: 5, bluffing: 5, calling: 5, skill: 5, temper: 5, speed: 5, chat: 5, tone: 'friendly' };

/** A word for where a dial sits. */
export const dialWord = (d: LabDial, v: number): string => d.words[v <= 1 ? 0 : v <= 3 ? 1 : v <= 6 ? 2 : v <= 8 ? 3 : 4];

/**
 * Faces a lab bot can wear: animals and things, never a person and never one from the profile picker (`EMOJIS`), so
 * a bot can't pass for a friend. The server takes any single emoji that isn't in the picker.
 */
// prettier-ignore
export const LAB_FACES = [
  '🦝', '🦬', '🦧', '🦜', '🦡', '🦥', '🐆', '🦌',
  '🦑', '🐴', '🦦', '🦨', '🦘', '🦔', '🦩', '🦫',
  '🦅', '🐺', '🐗', '🦀', '🐌', '🦚', '🦉', '🐧',
  '🐝', '🐳', '🦋', '🦓', '🐞', '🐹', '🐬', '🐢',
  '🦒', '🐊', '🐭', '🐥', '🦎', '🐲', '🐕', '🐈',
  '🦾', '🗿', '⚡', '🌪️', '🌹', '🌸', '🪴', '🎰',
] as const;

/** What arrives with an `addBot` for a lab bot: everything the table needs, nothing else. */
export interface LabBotSpec {
  name: string;
  emoji: string;
  dials: LabDials;
}

const isDial = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10;

/** Dials with every key a whole number from 0 to 10 and a known tone, or null. Unknown keys are dropped. */
export function parseDials(raw: unknown): LabDials | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.tone !== 'friendly' && r.tone !== 'trash') return null;
  const out = { tone: r.tone } as LabDials;
  for (const id of DIAL_IDS) {
    if (!isDial(r[id])) return null;
    out[id] = r[id];
  }
  return out;
}

/** Tidies a typed name the way the table does (`cleanName()`). */
export const labName = (name: string): string => name.replace(/\s+/g, ' ').trim().slice(0, LAB_NAME_MAX).trimEnd();

/** A lab bot from the network, checked: a clean, allowed name, one emoji that isn't a person's, and sound dials. */
export function parseLabBot(raw: unknown): LabBotSpec | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.length > LAB_NAME_MAX * 4) return null;
  const name = labName(r.name);
  if (!name || isNameBlocked(name)) return null;
  if (!isEmoji(r.emoji) || (EMOJIS as readonly string[]).includes(r.emoji)) return null;
  const dials = parseDials(r.dials);
  return dials ? { name, emoji: r.emoji, dials } : null;
}

const STYLE_CACHE = new Map<string, Style>();
const keyOf = (d: LabDials) => `${DIAL_IDS.map((id) => d[id]).join(',')}:${d.tone}`;
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/**
 * The dials as a style. Each dial moves the numbers its name promises, between the extremes the named styles
 * already use (a 10 on Hands played is about the Maniac's range, a 0 tighter than the Rock's), so no setting
 * makes a bot that breaks the brain. The middle of every dial plays close to a solid regular.
 */
export function labStyle(d: LabDials): Style {
  const key = keyOf(d);
  const have = STYLE_CACHE.get(key);
  if (have) return have;
  const v = (id: DialId) => d[id] / 10;
  const hands = v('hands'),
    aggro = v('aggression'),
    bluff = v('bluffing'),
    call = v('calling'),
    skill = v('skill'),
    temper = v('temper'),
    speed = v('speed'),
    chat = v('chat');
  const c = (x: number) => x - 0.5;
  const base = STYLES.pro;
  const loose = hands > 0.5 ? (hands - 0.5) * 2 * 0.6 : 0;
  const style: Style = {
    ...base,
    id: 'pro',
    about: 'Made in the Bot Lab.',
    pre: {
      tight: hands < 0.5 ? (0.5 - hands) * 2 * 0.9 : 0,
      loose,
      aggro: clamp(c(aggro) * 1.1, -0.6, 0.5),
      // A loose, passive bot limps in; an aggressive one raises or folds.
      limp: clamp(loose * (1 - aggro) * 1.4),
      open: 2.2 + aggro * 1.4,
      iso: aggro * 0.8,
      shove: 0.6 + aggro * 0.4 + loose * 0.5,
      callShove: c(call) * 0.08,
      survival: clamp(0.9 - temper * 0.7 - aggro * 0.2),
    },
    post: {
      sense: 0.2 + skill * 0.8,
      sizes: aggro < 0.34 ? [0.25, 0.4, 0.5] : aggro < 0.67 ? [0.33, 0.66, 1] : [0.66, 1, 1.4],
      tell: (1 - skill) * 0.6,
      value: c(aggro) * 0.1,
      bluff: c(bluff) * 0.16,
      bet: c(aggro) * 0.2,
      sticky: call < 0.5 ? c(call) * 0.8 : c(call) * 0.24,
      raise: c(aggro) * 0.2,
      trap: 0.05 + skill * 0.15,
      chase: call > 0.5 ? (call - 0.5) * 2 * 0.4 : 0,
      pairs: call > 0.5 ? (call - 0.5) * 2 * 0.4 : 0,
      scared: call < 0.5 ? (0.5 - call) * 2 * 1.5 : 0,
      gto: 0.03 + skill * 0.27,
      wobble: 0.2 - skill * 0.155,
    },
    adapt: skill * 0.85,
    craft: {
      ...NO_CRAFT,
      cbetDry: c(aggro) * 0.16,
      cbetWet: c(aggro) * 0.14,
      barrel: c(bluff) * 0.12,
      float: bluff * 0.4,
      probe: aggro * 0.25,
      donk: c(aggro) * 0.06 - skill * 0.03,
      checkRaise: aggro * 0.3,
      polar: bluff * 0.15 + skill * 0.2,
      thin: skill * 0.3,
      hero: call * 0.3,
      layDown: (1 - call) * 0.6,
      fourBet: bluff * 0.3,
      threeBet: aggro * 0.5,
      texture: skill * 0.4,
      exploit: skill,
    },
    mind: { tilt: 0.05 + temper * 0.6, grudge: temper * 0.6 },
    tempo: { speed: 1.4 - speed * 0.8, tank: 1.5 - speed, snap: 0.03 + speed * 0.4, hollywood: 0.1 },
    show: { bluffs: bluff * 0.3, strong: 0.05 + (1 - skill) * 0.1, folds: (1 - call) * 0.12 },
    talk: { tone: d.tone, chatty: 0.03 + chat * 0.87 },
  };
  STYLE_CACHE.set(key, style);
  return style;
}

/** A short name for the kind of player the dials make, for the lab's list and the lobby's menu. */
export function labPersona(d: LabDials): string {
  const { hands, aggression: aggro, calling, skill, bluffing } = d;
  if (skill >= 8 && hands <= 6 && aggro >= 5) return 'The Shark';
  if (hands >= 7 && aggro >= 7) return 'The Maniac';
  if (hands >= 6 && calling >= 7 && aggro <= 4) return 'The Calling Station';
  if (hands <= 3 && aggro >= 6) return 'Tight and aggressive';
  if (hands <= 3) return 'The Rock';
  if (bluffing >= 8) return 'The Bluffer';
  if (calling <= 2) return 'The Nervous One';
  if (hands >= 6 && aggro >= 6) return 'Loose and aggressive';
  if (skill <= 2) return 'The Beginner';
  return 'The All-rounder';
}
