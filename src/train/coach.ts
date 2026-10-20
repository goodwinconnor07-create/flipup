// What the GTO Coach says. The solver's numbers go in, short plain sentences come out. All the wording
// lives here so the tone stays the same on every screen: friendly, brief, no jargon until you ask.

import type { Colour, Decision, HandReport } from '../gto/types';
import { actionKind, bb, pct, prettyAction } from './format';
import { scenarioTitle } from './scenarios';

export const COACH_NAME = 'GTO Coach';
export const COACH_EMOJI = '🧑‍💻';

/** The label on a grade: plain words first, the solver's terms one tap deeper. */
export const GRADE_WORD: Record<Colour, string> = { green: 'Good', yellow: 'Close call', red: 'Costly' };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** What you did, in words ("raise to 22.5"). */
export function yourMove(d: Decision): string {
  if (d.matched_action) return lower(prettyAction(d.matched_action));
  if (!d.action) return 'that';
  const { move, to_bb } = d.action;
  if (move === 'fold' || move === 'check') return move;
  if (move === 'allin') return `all in for ${bb(to_bb)}`;
  return `${move} ${bb(to_bb)}`;
}

/** How often GTO takes the move you made with your exact hand (null if unknown). */
export function yourFrequency(d: Decision): number | null {
  if (!d.matched_action || !d.gto) return null;
  return d.gto.find((g) => g.action === d.matched_action)?.frequency ?? null;
}

const kindOf = (d: Decision): ReturnType<typeof actionKind> | null =>
  d.matched_action ? actionKind(d.matched_action) : d.action ? actionKind(d.action.move) : null;

/** The bubbles for one graded decision. */
export function verdictLines(d: Decision): string[] {
  const best = d.best_action ? lower(prettyAction(d.best_action)) : null;
  const mine = yourMove(d);
  const freq = yourFrequency(d);
  const cost = d.ev_loss_bb != null && d.ev_loss_bb > 0.005 ? bb(d.ev_loss_bb) : null;

  if (d.pending) {
    return [best ? `Here's what I'd do${d.hand ? ` with ${d.hand}` : ''}: ${best}.` : "That's the next move in this hand."];
  }
  if (d.colour === 'green') {
    const same = !best || d.matched_action === d.best_action;
    const lines = [same ? `Good one. That's what I'd do too.` : `That works. ${prettyAction(d.best_action ?? '')} is a touch better, but ${mine} is fine.`];
    if (freq != null && freq < 0.97) lines.push(`I take that line about ${pct(freq)} of the time with this hand, so it's a real option.`);
    return lines;
  }
  if (d.colour === 'yellow') {
    const lines = [`Close call. I'd lean towards ${best ?? 'another line'} here, but ${mine} isn't crazy.`];
    if (cost) lines.push(`The gap is small: about ${cost} over the long run.`);
    return lines;
  }
  if (d.colour === 'red') {
    const lines = [`I'd skip ${mine} here. ${best ? `${prettyAction(d.best_action ?? '')} is the play.` : ''}`.trim()];
    if (cost) lines.push(`${mine.charAt(0).toUpperCase() + mine.slice(1)} gives up about ${cost}${d.ev_loss_pct_pot ? `, ${d.ev_loss_pct_pot.toFixed(0)}% of the pot` : ''}.`);
    return lines;
  }
  return ["I couldn't grade this one."];
}

/** One sentence you can take to the next hand, from what you did against what GTO prefers. */
export function lessonLine(d: Decision): string | null {
  if (d.colour !== 'red' && d.colour !== 'yellow') return null;
  const mine = kindOf(d);
  const best = d.best_action ? actionKind(d.best_action) : null;
  if (!mine || !best) return null;
  const aggressive = (k: string) => k === 'bet' || k === 'raise' || k === 'allin';
  if (best === 'fold' && mine !== 'fold') return 'You kept a hand GTO lets go. Folding the weakest hands here saves chips.';
  if (mine === 'fold' && best !== 'fold') return 'You folded a hand GTO keeps playing. Folding too often gives up easy wins.';
  if (mine === 'call' && aggressive(best)) return 'GTO puts chips in with this hand instead of just calling. Raising wins the pot outright or builds it when you are ahead.';
  if (mine === 'check' && aggressive(best)) return 'You checked a hand GTO bets. A bet here takes the pot down or gets paid by worse hands.';
  if (aggressive(mine) && (best === 'check' || best === 'call')) return 'This hand likes a smaller pot. GTO keeps it in check here rather than building it.';
  if (aggressive(mine) && aggressive(best)) return 'Right idea, different size. Try matching the bet size to how strong your range is on this board.';
  return 'Your move was close in shape but not the best one. Look at the mix above and see which line GTO leans on.';
}

export interface HandLesson {
  text: string;
  decision: Decision | null;
  scenario: string | null;
}

/** The one thing to remember from a hand: the costliest decision, or a clean sheet. */
export function handLesson(report: HandReport): HandLesson {
  const graded = report.decisions.filter((d) => !d.pending && d.colour);
  if (graded.length === 0) return { text: "There was nothing for me to grade this time. Often that's everyone folding to your big blind.", decision: null, scenario: null };
  const off = graded.filter((d) => d.colour !== 'green').sort((a, b) => (b.ev_loss_bb ?? 0) - (a.ev_loss_bb ?? 0));
  if (off.length === 0) return { text: 'A clean hand. Every move you made was one I like.', decision: null, scenario: null };
  const worst = off[0];
  return { text: lessonLine(worst) ?? `Your costliest move was ${yourMove(worst)}.`, decision: worst, scenario: worst.scenario ?? null };
}

/** The opening bubble on a hand's review: how it went in one breath. */
export function summaryLine(report: HandReport): string {
  const c = report.summary.colours;
  const n = report.summary.graded;
  if (!c || n === 0) return "Let's go through it.";
  if (c.red === 0 && c.yellow === 0) return n === 1 ? 'You made one decision and it was a good one.' : `You made ${n} decisions and all of them were good.`;
  const bad = c.red + c.yellow;
  const lost = report.summary.total_ev_loss_bb;
  return `${n} decisions, ${bad === 1 ? 'one' : bad} worth a second look${lost > 0.05 ? `. It cost about ${bb(lost)} in all.` : '.'}`;
}

// ── Coaching on drills ─────────────────────────────────────────────────────

export function drillLines(colour: Colour | null, bestAction: string, frequency: number, lossBb: number): string[] {
  const best = lower(prettyAction(bestAction));
  if (colour === 'green') return [frequency >= 0.5 ? 'Spot on.' : `That works. It's one of the lines I mix in, about ${pct(frequency)} of the time.`];
  if (colour === 'yellow') return [`Close. I'd lean ${best} here.`, `It's only a small gap: about ${bb(lossBb)}.`];
  return [`Not this one. I'd ${best} here.`, `Your pick gives up about ${bb(lossBb)}. That's a spot worth a few more tries.`];
}

// ── Progress ───────────────────────────────────────────────────────────────

export interface TrendPoint {
  key: string;
  at: number;
  /** Share of that hand's decisions that were good (a close call counts half). */
  score: number;
}

/** A line about whether you're getting better, from your last reviewed hands. */
export function trendLine(trend: TrendPoint[]): string | null {
  if (trend.length < 4) return null;
  const half = Math.floor(trend.length / 2);
  const avg = (xs: TrendPoint[]) => xs.reduce((t, x) => t + x.score, 0) / xs.length;
  const delta = Math.round((avg(trend.slice(-half)) - avg(trend.slice(0, half))) * 100);
  if (delta >= 5) return `You're improving: up ${delta} points over your last ${trend.length} hands.`;
  if (delta <= -5) return `A dip lately: down ${-delta} points over your last ${trend.length} hands. Worth a couple of drills.`;
  return `Steady over your last ${trend.length} hands. Pick one leak and push on it.`;
}

/** What the coach opens with on the Train tab and in Insights. */
export function greeting(opts: { toReview: number; decisions: number; gtoPct: number; weakest?: { id: string; title: string } | null }): string {
  if (opts.toReview > 0) return `I haven't looked at ${opts.toReview === 1 ? 'one of your hands' : `${opts.toReview} of your hands`} yet. Want me to?`;
  if (opts.weakest) return `Your toughest spot lately is ${opts.weakest.title.toLowerCase()}. A few drills would help.`;
  if (opts.decisions > 0) return `You're matching me on ${pct(opts.gtoPct)} of your decisions. Keep playing and I'll keep watching.`;
  return 'Play a few hands and I will go through them with you.';
}

export { scenarioTitle };
