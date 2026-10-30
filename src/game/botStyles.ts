import { individualStyle, makeRoster } from './botProfiles';

// Ten poker foundations, with individual player traits layered on top. A bot's style never leaves the
// server (or the bots-only phone): players work out who's who by playing against them.

export type StyleId =
  | 'pro'
  | 'shark'
  | 'tag'
  | 'lag'
  | 'maniac'
  | 'rock'
  | 'station'
  | 'gambler'
  | 'trapper'
  | 'nervous';

export interface Style {
  id: StyleId;
  /** What the style is, for people reading the code. Never shown in the app. */
  about: string;
  pre: {
    /** 0 to 1: only plays hands stronger than this share of all starting hands (0 plays GTO's whole range). */
    tight: number;
    /** 0 to 1: plays hands GTO folds. */
    loose: number;
    /** -1 to 1: turns calls into raises (or raises into calls when negative). */
    aggro: number;
    /** 0 to 1: limps instead of raising or folding when nobody has raised. */
    limp: number;
    /** Usual opening raise, in big blinds. */
    open: number;
    /** 0 to 1: raises people who limp in, with a wider range. */
    iso: number;
    /** Multiplies how wide it moves all in when its stack is short. */
    shove: number;
    /** Added to its chance of winning when it decides whether to call an all-in (looser above 0). */
    callShove: number;
    /** 0 to 1: how much it fears going broke when there are no rebuys. */
    survival: number;
  };
  post: {
    /** 0 to 1: how much it thinks about what the other player could have (0: only looks at its own cards). */
    sense: number;
    /** Bet sizes it likes, as shares of the pot. */
    sizes: number[];
    /** 0 to 1: how much its bet size gives its hand away (big bets for big hands, small for so-so ones). */
    tell: number;
    /** Extra pull towards betting and raising with good hands, in pots (about -0.1 to 0.1). */
    value: number;
    /** Extra pull towards betting and raising with nothing, in pots. */
    bluff: number;
    /** Extra pull towards betting at all, in pots. */
    bet: number;
    /** Extra pull towards calling, in pots. Negative folds more. */
    sticky: number;
    /** Extra pull towards raising, in pots. */
    raise: number;
    /** 0 to 1: checks its best hands to let others bet (and raises them later). */
    trap: number;
    /** 0 to 1: overrates its draws. */
    chase: number;
    /** 0 to 1: overrates one pair. */
    pairs: number;
    /** 0 to 1: gives up against big bets. */
    scared: number;
    /** 0 to 1: how much it leans on the GTO tables (balance) over its own reading of the hand. */
    gto: number;
    /** How much its choices wobble, in pots: bigger is less predictable and makes more mistakes. */
    wobble: number;
  };
  /** 0 to 1: how much it changes its play after watching yours. */
  adapt: number;
  /** Techniques it has: situations it plays in its own way, beyond how loose or aggressive it is. */
  craft: Craft;
  /** How it takes the ups and downs. */
  mind: {
    /** 0 to 1: how easily bad beats and big losses get to it. */
    tilt: number;
    /** 0 to 1: how much it wants chips back from whoever hurt it. */
    grudge: number;
  };
  /** How long it takes to act. */
  tempo: {
    /** Multiplies its thinking time (below 1 is quick). */
    speed: number;
    /** Multiplies the extra time it takes on hard decisions. */
    tank: number;
    /** 0 to 1: sometimes acts instantly when the decision is easy. */
    snap: number;
    /** 0 to 1: sometimes takes ages with a monster, like it's a tough call. */
    hollywood: number;
  };
  /** Chances it turns its cards over when it doesn't have to. */
  show: {
    /** After a bluff that worked. */
    bluffs: number;
    /** After winning with a strong hand that nobody called. */
    strong: number;
    /** After folding a good hand to a big bet. */
    folds: number;
  };
  talk: { tone: 'trash' | 'friendly'; chatty: number };
}

/**
 * Techniques that depend on the situation (which street, who has the initiative, what the board is like,
 * who it's against), where the knobs in `post` apply the same everywhere. Numbers are pulls in pots (like
 * `bet` and `bluff`) or 0 to 1 strengths; zero means the plain play. See botPlay.ts for what each does.
 */
export interface Craft {
  /** Continuation bets after raising before the flop: extra pull towards betting on dry boards and on wet ones. */
  cbetDry: number;
  cbetWet: number;
  /** Betting again on the turn and river after betting the street before. Below zero it gives up. */
  barrel: number;
  /** Calling a flop bet in position with a weak hand, to take the pot away later when it's checked to. */
  float: number;
  /** Leading the turn out of position after the flop went check, check. */
  probe: number;
  /** Leading into the player who raised before the flop (most people almost never do, so below zero for most). */
  donk: number;
  /** Checking strong hands and draws out of position to raise the bet. */
  checkRaise: number;
  /** River: big bets with the best hands and with bluffs that hold a card the caller needs, check the middle. */
  polar: number;
  /** Betting one pair for value against players who call too much. */
  thin: number;
  /** Calling down light against stories that smell of a bluff. */
  hero: number;
  /** Folding a good hand when the story says it's beaten (not paying off a big river raise). */
  layDown: number;
  /** Before the flop: 4-bet bluffs with a blocker, and 3-bets without a premium hand. */
  fourBet: number;
  threeBet: number;
  /** Bet size follows the board: small on dry boards, big on wet ones. */
  texture: number;
  /** How much it acts on what it has seen of the other player's habits (folds, size, check-raises). */
  exploit: number;
  /** Starting hands it likes (a signature hand), and how often it plays one when the chart says fold. */
  pets: string[];
  petRate: number;
}

export const NO_CRAFT: Craft = { cbetDry: 0, cbetWet: 0, barrel: 0, float: 0, probe: 0, donk: 0, checkRaise: 0, polar: 0, thin: 0, hero: 0, layDown: 0, fourBet: 0, threeBet: 0, texture: 0, exploit: 0, pets: [], petRate: 0 };

const base = { tight: 0, loose: 0, aggro: 0, limp: 0, open: 2.5, iso: 0.5, shove: 1, callShove: 0, survival: 0.3 };
const post = {
  sense: 0.7,
  sizes: [0.33, 0.66, 1],
  tell: 0,
  value: 0,
  bluff: 0,
  bet: 0,
  sticky: 0,
  raise: 0,
  trap: 0,
  chase: 0,
  pairs: 0,
  scared: 0,
  gto: 0.15,
  wobble: 0.08,
};
const tempo = { speed: 1, tank: 1, snap: 0.1, hollywood: 0.05 };

export const STYLES: Record<StyleId, Style> = {
  pro: {
    id: 'pro',
    about: 'A solid regular: plays close to GTO, reads ranges well and adjusts to what it sees. Hard to rattle.',
    pre: { ...base, open: 2.3, iso: 0.5, survival: 0.3 },
    post: { ...post, sense: 0.95, sizes: [0.33, 0.66, 1, 1.4], value: 0.02, trap: 0.12, gto: 0.3, wobble: 0.05 },
    adapt: 0.5,
    craft: { ...NO_CRAFT, cbetDry: 0.03, barrel: 0.01, float: 0.2, probe: 0.1, donk: -0.02, checkRaise: 0.15, polar: 0.3, thin: 0.25, hero: 0.15, layDown: 0.2, fourBet: 0.15, threeBet: 0.15, texture: 0.3, exploit: 0.6 },
    mind: { tilt: 0.1, grudge: 0.1 },
    tempo: { ...tempo, tank: 1.1, hollywood: 0.1 },
    show: { bluffs: 0.02, strong: 0.03, folds: 0.01 },
    talk: { tone: 'friendly', chatty: 0.35 },
  },
  shark: {
    id: 'shark',
    about: 'GTO with a sharper edge: a little more aggressive, and the quickest to work you out and go after you.',
    pre: { ...base, aggro: 0.15, open: 2.3, iso: 0.7, shove: 1.1, survival: 0.2 },
    post: { ...post, sense: 1, sizes: [0.33, 0.75, 1.25], value: 0.03, bluff: 0.02, raise: 0.02, trap: 0.15, gto: 0.2, wobble: 0.045 },
    adapt: 0.85,
    craft: { ...NO_CRAFT, cbetDry: 0.05, cbetWet: 0.02, barrel: 0.03, float: 0.4, probe: 0.25, donk: -0.01, checkRaise: 0.25, polar: 0.4, thin: 0.35, hero: 0.3, layDown: 0.3, fourBet: 0.25, threeBet: 0.3, texture: 0.4, exploit: 1 },
    mind: { tilt: 0.15, grudge: 0.5 },
    tempo: { ...tempo, speed: 0.9, snap: 0.2, hollywood: 0.15 },
    show: { bluffs: 0.15, strong: 0.05, folds: 0 },
    talk: { tone: 'trash', chatty: 0.6 },
  },
  tag: {
    id: 'tag',
    about: 'Tight and aggressive: few hands, played hard. Bets its good hands big.',
    pre: { ...base, tight: 0.72, aggro: 0.15, open: 3, iso: 0.6, shove: 0.95, callShove: -0.01, survival: 0.4 },
    post: { ...post, sense: 0.75, sizes: [0.5, 0.75], tell: 0.3, value: 0.07, bluff: -0.01, bet: 0.03, sticky: -0.05, raise: 0.04, trap: 0.05, gto: 0.2, wobble: 0.06 },
    adapt: 0.35,
    craft: { ...NO_CRAFT, cbetDry: 0.04, cbetWet: 0.03, barrel: -0.02, donk: -0.04, checkRaise: 0.1, polar: 0.1, thin: 0.2, layDown: 0.4, fourBet: 0.05, threeBet: 0.05, texture: 0.2, exploit: 0.3 },
    mind: { tilt: 0.2, grudge: 0.2 },
    tempo,
    show: { bluffs: 0.02, strong: 0.1, folds: 0.03 },
    talk: { tone: 'friendly', chatty: 0.35 },
  },
  lag: {
    id: 'lag',
    about: 'Loose and aggressive: lots of hands, lots of pressure, bluffs a fair bit.',
    pre: { ...base, loose: 0.3, aggro: 0.35, open: 2.7, iso: 0.8, shove: 1.2, callShove: 0.02, survival: 0.2 },
    post: { ...post, sense: 0.75, sizes: [0.5, 0.75, 1.2], tell: 0.1, value: 0.02, bluff: 0.06, bet: 0.05, raise: 0.06, gto: 0.15, wobble: 0.08 },
    adapt: 0.5,
    craft: { ...NO_CRAFT, cbetDry: 0.08, cbetWet: 0.06, barrel: 0.05, float: 0.5, probe: 0.3, donk: 0.02, checkRaise: 0.2, polar: 0.3, thin: 0.1, hero: 0.2, fourBet: 0.35, threeBet: 0.5, texture: 0.2, exploit: 0.5 },
    mind: { tilt: 0.35, grudge: 0.4 },
    tempo: { ...tempo, speed: 0.85, snap: 0.2 },
    show: { bluffs: 0.2, strong: 0.03, folds: 0.02 },
    talk: { tone: 'trash', chatty: 0.55 },
  },
  maniac: {
    id: 'maniac',
    about: 'Raises everything and bluffs constantly. Calls too much too. Hard to read, easy to trap.',
    pre: { ...base, loose: 0.6, aggro: 0.4, open: 3.5, iso: 0.8, shove: 1.4, callShove: -0.02, survival: 0 },
    post: { ...post, sense: 0.55, sizes: [0.75, 1, 1.5], tell: 0.1, value: 0.04, bluff: 0.07, bet: 0.1, sticky: -0.06, raise: 0.1, chase: 0.2, pairs: 0.15, gto: 0.05, wobble: 0.1 },
    adapt: 0.15,
    craft: { ...NO_CRAFT, cbetDry: 0.1, cbetWet: 0.1, barrel: 0.08, float: 0.2, probe: 0.3, donk: 0.08, checkRaise: 0.15, hero: 0.1, fourBet: 0.2, threeBet: 0.4, exploit: 0.1 },
    mind: { tilt: 0.6, grudge: 0.6 },
    tempo: { speed: 0.6, tank: 0.5, snap: 0.4, hollywood: 0 },
    show: { bluffs: 0.35, strong: 0.1, folds: 0.05 },
    talk: { tone: 'trash', chatty: 0.8 },
  },
  rock: {
    id: 'rock',
    about: 'Only plays great hands. When it bets big, believe it. Folds to pressure without the goods.',
    pre: { ...base, tight: 0.87, aggro: -0.1, open: 3, iso: 0.2, shove: 0.6, callShove: -0.05, survival: 0.8 },
    post: { ...post, sense: 0.55, sizes: [0.66, 0.9], tell: 0.6, value: 0.04, bluff: -0.08, sticky: -0.18, raise: -0.02, scared: 0.5, gto: 0.1, wobble: 0.06 },
    adapt: 0.15,
    craft: { ...NO_CRAFT, cbetDry: 0.02, cbetWet: -0.02, barrel: -0.06, donk: -0.05, checkRaise: 0.05, polar: 0.2, layDown: 0.6, exploit: 0.2 },
    mind: { tilt: 0.1, grudge: 0.2 },
    tempo: { ...tempo, speed: 1.15, snap: 0.05 },
    show: { bluffs: 0, strong: 0.25, folds: 0.15 },
    talk: { tone: 'friendly', chatty: 0.2 },
  },
  station: {
    id: 'station',
    about: 'Calls far too much and rarely raises: only looks at its own cards. Bluffing it is a bad idea.',
    pre: { ...base, loose: 0.45, aggro: -0.6, open: 2, iso: 0, shove: 0.7, callShove: 0.03, survival: 0.2 },
    post: { ...post, sense: 0.25, sizes: [0.33, 0.5], tell: 0.2, value: -0.05, bluff: -0.1, bet: -0.12, sticky: 0.1, raise: -0.15, chase: 0.5, pairs: 0.4, gto: 0.05, wobble: 0.1 },
    adapt: 0.05,
    craft: { ...NO_CRAFT, donk: 0.03, hero: 0.2, thin: -0.2 },
    mind: { tilt: 0.3, grudge: 0.3 },
    tempo: { ...tempo, speed: 1.1, snap: 0.3 },
    show: { bluffs: 0, strong: 0.05, folds: 0.1 },
    talk: { tone: 'friendly', chatty: 0.45 },
  },
  gambler: {
    id: 'gambler',
    about: 'Limps, chases every draw and loves a big pot. Raises big when it finally has a hand.',
    pre: { ...base, loose: 0.5, limp: 0.6, aggro: 0.05, open: 4, iso: 0.1, shove: 1.3, callShove: 0.04, survival: 0 },
    post: { ...post, sense: 0.4, sizes: [0.5, 1, 1.5], tell: 0.3, bluff: 0.04, bet: 0.04, sticky: 0.06, raise: 0.03, chase: 0.6, pairs: 0.2, gto: 0.05, wobble: 0.11 },
    adapt: 0.1,
    craft: { ...NO_CRAFT, barrel: 0.03, float: 0.3, donk: 0.06, hero: 0.2, exploit: 0.1 },
    mind: { tilt: 0.55, grudge: 0.4 },
    tempo: { ...tempo, speed: 0.8, snap: 0.25 },
    show: { bluffs: 0.25, strong: 0.1, folds: 0.05 },
    talk: { tone: 'friendly', chatty: 0.65 },
  },
  trapper: {
    id: 'trapper',
    about: 'Slow-plays its monsters and check-raises. Quiet until it pounces.',
    pre: { ...base, tight: 0.66, aggro: -0.25, open: 2.5, iso: 0.2, shove: 0.9, survival: 0.4 },
    post: { ...post, sense: 0.7, sizes: [0.33, 0.66, 1.3], tell: 0.2, value: -0.04, bluff: -0.02, raise: 0.06, trap: 0.6, gto: 0.15, wobble: 0.07 },
    adapt: 0.3,
    craft: { ...NO_CRAFT, cbetDry: -0.02, donk: -0.02, float: 0.1, checkRaise: 0.7, polar: 0.3, thin: 0.1, layDown: 0.3, exploit: 0.4 },
    mind: { tilt: 0.2, grudge: 0.3 },
    tempo: { ...tempo, tank: 1.2, hollywood: 0.5 },
    show: { bluffs: 0.02, strong: 0.2, folds: 0.02 },
    talk: { tone: 'trash', chatty: 0.45 },
  },
  nervous: {
    id: 'nervous',
    about: 'Plays fair hands but folds to pressure, bets small when it does bet, and gets rattled after losing.',
    pre: { ...base, tight: 0.4, loose: 0.15, aggro: -0.2, open: 2, iso: 0.1, shove: 0.65, callShove: -0.06, survival: 0.9 },
    post: { ...post, sense: 0.25, sizes: [0.25, 0.4, 0.5], tell: 0.5, value: -0.15, bluff: -0.05, bet: -0.15, sticky: -0.45, raise: -0.15, scared: 2.4, gto: 0.1, wobble: 0.3 },
    adapt: 0,
    craft: { ...NO_CRAFT, cbetDry: -0.03, cbetWet: -0.05, barrel: -0.08, hero: -0.1, layDown: 0.8 },
    mind: { tilt: 0.45, grudge: 0.1 },
    tempo: { speed: 1.2, tank: 1.6, snap: 0.05, hollywood: 0 },
    show: { bluffs: 0.01, strong: 0.05, folds: 0.2 },
    talk: { tone: 'friendly', chatty: 0.4 },
  },
};

/** Original identities remain available to saved quick games. */
const FAMILIAR_BOTS: { name: string; emoji: string; style: StyleId }[] = [
  { name: 'Luna', emoji: '🐸', style: 'gambler' },
  { name: 'Eli', emoji: '🤩', style: 'lag' },
  { name: 'Remi', emoji: '🧌', style: 'rock' },
  { name: 'Emma', emoji: '🦊', style: 'shark' },
  { name: 'Anna', emoji: '🐼', style: 'station' },
  { name: 'Max', emoji: '🤠', style: 'maniac' },
  { name: 'Zoe', emoji: '🐙', style: 'trapper' },
  { name: 'Theo', emoji: '🦁', style: 'tag' },
  { name: 'Ivy', emoji: '🦄', style: 'nervous' },
  { name: 'Kai', emoji: '🐯', style: 'pro' },
  { name: 'Milo', emoji: '🐶', style: 'station' },
  { name: 'Nora', emoji: '🦉', style: 'pro' },
  { name: 'Otis', emoji: '🐻', style: 'rock' },
  { name: 'Pia', emoji: '🐧', style: 'nervous' },
  { name: 'Rex', emoji: '🦖', style: 'maniac' },
  { name: 'Sage', emoji: '🌵', style: 'trapper' },
  { name: 'Tess', emoji: '🐝', style: 'tag' },
  { name: 'Uma', emoji: '🐳', style: 'shark' },
  { name: 'Vic', emoji: '😎', style: 'lag' },
  { name: 'Wren', emoji: '🐦', style: 'gambler' },
  { name: 'Yuki', emoji: '🦋', style: 'pro' },
  { name: 'Ziggy', emoji: '🦓', style: 'maniac' },
  { name: 'Bea', emoji: '🐞', style: 'station' },
  { name: 'Cole', emoji: '🐺', style: 'shark' },
  { name: 'Dot', emoji: '🐹', style: 'nervous' },
  { name: 'Finn', emoji: '🐬', style: 'tag' },
  { name: 'Gus', emoji: '🐢', style: 'rock' },
  { name: 'Hana', emoji: '🌸', style: 'gambler' },
  { name: 'Iggy', emoji: '🦎', style: 'trapper' },
  { name: 'Jax', emoji: '🔥', style: 'lag' },
  { name: 'Kiki', emoji: '🐱', style: 'station' },
  { name: 'Leo', emoji: '🦒', style: 'pro' },
  { name: 'Mags', emoji: '🐊', style: 'trapper' },
  { name: 'Ned', emoji: '🐭', style: 'nervous' },
  { name: 'Ora', emoji: '🦚', style: 'shark' },
  { name: 'Pip', emoji: '🐥', style: 'gambler' },
  { name: 'Quinn', emoji: '🦅', style: 'tag' },
  { name: 'Rosa', emoji: '🌹', style: 'lag' },
  { name: 'Stan', emoji: '🗿', style: 'rock' },
  { name: 'Tex', emoji: '🌪️', style: 'maniac' },
];

// Keep the original names addressable for saved quick games, alongside 600 new regulars.
export const BOTS = makeRoster(FAMILIAR_BOTS);
const PROFILE_STYLES = new Map(BOTS.map((bot) => [bot.profile.id, individualStyle(STYLES[bot.style], bot.profile)]));

export const styleOf = (id: string | undefined, profileId?: string): Style => {
  const base = Object.hasOwn(STYLES, id ?? '') ? STYLES[id as StyleId] : STYLES.pro;
  const individual = profileId ? PROFILE_STYLES.get(profileId) : undefined;
  return individual?.id === base.id ? individual : base;
};

const DULLED = new WeakMap<Style, Map<number, Style>>();

/**
 * A style played less well, for the easier campaign rooms: `d` from 0 (as it is) to 1 (as dull as it gets). Its
 * choices wobble more, it reads hands and people less, and it leans less on the solved tables. Its personality
 * (how loose, how aggressive, what it overrates) stays. Kept, so a decision doesn't build a new style each time.
 */
export function dulled(style: Style, d: number): Style {
  const k = Math.max(0, Math.min(1, d));
  if (k === 0) return style;
  let byD = DULLED.get(style);
  if (!byD) DULLED.set(style, (byD = new Map()));
  const have = byD.get(k);
  if (have) return have;
  const out: Style = {
    ...style,
    post: { ...style.post, wobble: style.post.wobble + 0.16 * k, sense: style.post.sense * (1 - 0.6 * k), gto: style.post.gto * (1 - 0.6 * k) },
    adapt: style.adapt * (1 - k),
    craft: { ...style.craft, exploit: style.craft.exploit * (1 - k), layDown: style.craft.layDown * (1 - 0.7 * k), hero: style.craft.hero * (1 - 0.7 * k) },
  };
  byD.set(k, out);
  return out;
}

/** How a seat plays: an AI twin's fitted style, or the bot's own (with its individual quirks), dulled at an easy campaign table. */
export const playerStyle = (p: { style?: string; botProfile?: string; twin?: { style: Style }; dull?: number } | undefined): Style => {
  const s = p?.twin?.style ?? styleOf(p?.style, p?.botProfile);
  return p?.dull ? dulled(s, p.dull) : s;
};
