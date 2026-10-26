// Scouting a friend's AI twin: what they do, in plain words, and a way to beat it for each. Worked out
// from the same counts as your own habits (twinReport.ts) and the same "usual range", so it's the same
// numbers seen from the other side of the table. No solver: the plans are standard ways to play against
// each habit. scripts/twinLab.ts `beat` checks the kinds of plan against simulated twins, and a plan the
// lab didn't back (calling light against bluffers, bluffing the most fold-prone copy) isn't offered.

import type { TwinProfile } from '../game';
import type { TwinGame } from '../state/twinGames';
import { RULES, sizeMeans } from './twinReport';

export type PlanKind = 'pressure' | 'value' | 'fold-more';

export interface ScoutNote {
  id: string;
  /** What they do, with their number in it. */
  say: string;
  /** What to do about it. */
  plan: string;
  /** What kind of plan it is, for checking after a game how it went. */
  kind: PlanKind;
  /** For "Show me the numbers". */
  numbers: string;
  weight: number;
}

interface Take {
  say: (p: string) => string;
  plan: string;
  kind: PlanKind;
}

/** For each habit, from one side or the other: how to say it about them, and the plan. */
const TAKES: Record<string, { high?: Take; low?: Take }> = {
  hands: {
    high: { say: (p) => `They play ${p} of their hands.`, plan: 'Tighten up and bet your good hands for value. They call with a lot of weak ones.', kind: 'value' },
    low: { say: (p) => `They only play ${p} of their hands.`, plan: "Steal their blinds: raise when you're first in. When they do play, they usually have something.", kind: 'pressure' },
  },
  raise: {
    low: { say: (p) => `Of the hands they play, they only raise ${p}. The rest they call.`, plan: 'Take the lead by raising before the flop. Their calling hands are weaker than they look.', kind: 'pressure' },
  },
  limp: {
    high: { say: (p) => `When they're first in, they limp ${p} of the time.`, plan: "Raise their limps. They fold or call weakly, and you'll have the lead.", kind: 'pressure' },
  },
  'fold-to-raise': {
    high: { say: (p) => `They fold ${p} of the time when you raise before the flop.`, plan: 'Raise a lot before the flop, even with so-so hands. It wins their blinds.', kind: 'pressure' },
  },
  'three-bet': {
    low: { say: (p) => `They almost never re-raise before the flop (${p}).`, plan: 'Raise freely. When they do re-raise it is a big hand, so let go of the marginal ones.', kind: 'pressure' },
  },
  'fold-to-bet': {
    high: { say: (p) => `They fold to ${p} of bets after the flop.`, plan: "Bet your good hands and keep your bluffs small. Betting into them with nothing didn't win enough in testing.", kind: 'value' },
    low: { say: (p) => `They fold to only ${p} of bets after the flop.`, plan: "Don't bluff them. Bet your good hands for value, and bet them big.", kind: 'value' },
  },
  bet: {
    low: { say: (p) => `When it's checked to them, they only bet ${p} of the time.`, plan: 'When they check, bet. They give up a lot of pots.', kind: 'pressure' },
    high: { say: (p) => `When nobody has bet, they bet ${p} of the time. A lot of those are weak hands.`, plan: 'Call with a pair or better and bet your good hands. Calling with weak hands lost chips against copies like this.', kind: 'value' },
  },
  cbet: {
    low: { say: (p) => `After they raise before the flop, they only bet the flop ${p} of the time.`, plan: 'Stay in when they raise and check. Then bet: the pot is yours.', kind: 'pressure' },
    high: { say: (p) => `After they raise before the flop, they bet the flop ${p} of the time.`, plan: "Call or raise their flop bets with a pair or better. Don't chase with nothing.", kind: 'value' },
  },
  bluff: {
    high: { say: (p) => `${p} of their bets after the flop are with a weak hand or a draw.`, plan: "Don't try to catch bluffs with weak hands: calling light lost chips in testing. Call with a pair or better and bet your good hands.", kind: 'value' },
    low: { say: (p) => `Only ${p} of their bets after the flop are bluffs.`, plan: "Fold a medium hand to their big bets. When they bet, they usually have it.", kind: 'fold-more' },
  },
  showdown: {
    high: { say: (p) => `They go to showdown ${p} of the time they see a flop.`, plan: "Don't bluff the river. Bet your good hands there: they call too much.", kind: 'value' },
  },
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** How well we know them, from how many hands it is built on. */
export function confidenceWord(hands: number): string {
  return hands < 60 ? 'a rough copy' : hands < 150 ? 'a decent copy' : 'a close copy';
}

/** What they do that stands out, biggest first, each with a plan. Empty when nothing does. */
export function scout(twin: TwinProfile, max = 4): ScoutNote[] {
  const out: ScoutNote[] = [];
  for (const rule of RULES) {
    const r = rule.read(twin);
    if (!r || r.of < rule.enough) continue;
    const value = r.hits / r.of;
    const [lo, hi] = rule.band;
    const high = value > hi;
    const take = TAKES[rule.id]?.[high ? 'high' : 'low'];
    if (!take || (!high && value >= lo)) continue;
    const weight = (high ? value - hi : lo - value) / rule.scale;
    if (weight < 0.5) continue;
    out.push({ id: rule.id, say: take.say(pct(value)), plan: take.plan, kind: take.kind, numbers: `${pct(value)} of ${r.of} ${rule.what}. Most players land between ${pct(lo)} and ${pct(hi)}.`, weight });
  }
  const means = sizeMeans(twin);
  if (means && Math.abs(means.strong - means.weak) >= 0.3) {
    const big = means.strong > means.weak;
    out.push({
      id: 'size-tell',
      say: big ? `They bet big with good hands (${pct(means.strong)} of the pot) and small with weak ones (${pct(means.weak)}).` : `They bet bigger with weak hands (${pct(means.weak)} of the pot) than good ones (${pct(means.strong)}).`,
      plan: big ? 'Fold a medium hand to their big bets, and call or raise their small ones.' : 'Call their big bets with a pair or better, and fold your weak hands.',
      kind: big ? 'fold-more' : 'value',
      numbers: `${pct(means.strong)} of the pot with top pair or better, ${pct(means.weak)} with less.`,
      weight: (Math.abs(means.strong - means.weak) - 0.3) / 0.15 + 0.5,
    });
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, max);
}

// ── After a game ────────────────────────────────────────────────────────────

export interface PlanCheck {
  hands: number;
  /** Pots you won without a showdown, and how many of those were your bet or raise getting them to fold. */
  wonUncontested: number;
  madeFold: number;
  /** Showdowns, and the ones you won. */
  showdowns: number;
  showdownsWon: number;
  /** Chips on the whole. */
  net: number;
}

/** What your plan did in a game: pots won with a bet, and how you fared at showdown. From hands saved with their facts. */
export function planCheck(game: TwinGame): PlanCheck | null {
  const known = game.hands.filter((h) => h.facts?.end);
  if (known.length < 5) return null;
  const won = known.filter((h) => h.net > 0 && h.facts!.end === 'fold-them');
  const sd = known.filter((h) => h.facts!.end === 'showdown');
  return {
    hands: known.length,
    wonUncontested: won.length,
    madeFold: won.filter((h) => h.facts!.lastAgg === 'me').length,
    showdowns: sd.length,
    showdownsWon: sd.filter((h) => h.net > 0).length,
    net: game.hands.reduce((a, h) => a + h.net, 0),
  };
}

/** The coach's read on whether the plan worked, for the plan you were meant to follow. */
export function planLines(check: PlanCheck, kind: PlanKind | null): string[] {
  const share = Math.round((check.madeFold / check.hands) * 100);
  const lines: string[] = [];
  if (kind === 'pressure' || kind === null) {
    lines.push(`Your bets and raises won the pot ${check.madeFold} ${check.madeFold === 1 ? 'time' : 'times'} out of ${check.hands} hands.`);
    lines.push(share >= 20 ? "That's the plan working: they gave up pots you'd have lost at a showdown." : share >= 8 ? 'Some of it worked. Try betting a little more when they check.' : "Not many folds. Try again, with bets they have to think about.");
  }
  if (kind === 'value' || kind === 'fold-more') {
    if (check.showdowns >= 3) lines.push(`You won ${check.showdownsWon} of ${check.showdowns} showdowns.`);
    lines.push(
      kind === 'value'
        ? check.showdownsWon * 2 >= check.showdowns ? "Your good hands got paid. That's the plan working." : 'They beat you at showdown more than they should. Bet your good hands bigger, and skip the bluffs.'
        : check.showdownsWon * 2 >= check.showdowns ? 'Folding to their big bets kept you out of trouble.' : 'You still lost a lot at showdown. Fold the medium hands when they bet big.',
    );
  }
  return lines;
}
