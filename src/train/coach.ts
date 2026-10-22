// What the GTO Coach says. The solver's numbers go in, short plain sentences come out. All the wording
// lives here so the tone stays the same on every screen: friendly, brief, no jargon until you ask.

import { handClass } from '../game/botPlay';
import type { Kind } from '../game/judge';
import type { Colour, Decision, HandReport } from '../gto/types';
import { STYLE_NOTES } from '../scroll/styleNotes';
import type { Decision as CardMove, Outcome, Template } from '../scroll/types';
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

// ── Scroll ─────────────────────────────────────────────────────────────────

const ON = { preflop: 'before the flop', flop: 'on the flop', turn: 'on the turn', river: 'on the river' } as const;

function sizeWord(f?: number): string {
  if (f === undefined) return '';
  return f < 0.45 ? 'a small bet' : f < 0.85 ? 'a bet of about two thirds of the pot' : 'a pot-sized bet';
}

/** A move in words: "fold", "call", "a small bet", "a raise", "a shove". */
function moveWords(kind: Kind, size?: number): string {
  switch (kind) {
    case 'bet':
      return sizeWord(size) || 'a bet';
    case 'raise':
      return 'a raise';
    case 'allin':
      return 'a shove';
    default:
      return kind;
  }
}

const aggressive = (k: Kind) => k === 'bet' || k === 'raise' || k === 'allin';
const ING: Record<Kind, string> = { fold: 'folding', check: 'checking', call: 'calling', bet: 'betting', raise: 'raising', allin: 'shoving' };
const cardsOf = (s: string) => [s.slice(0, 2), s.slice(2, 4)];

/** The coach's read on one move of a Scroll card, in a sentence or two. Plain words, the numbers only where they make the point. */
export function scrollMove(d: CardMove, stack: number): string[] {
  const cls = handClass(cardsOf(d.hand));
  const when = ON[d.street];
  const lines: string[] = [];
  const good = d.grade === 'green';
  const best = moveWords(d.best, d.bestSize);
  const mine = moveWords(d.mine);
  if (d.how === 'chart') {
    const f = d.freq ?? 0;
    lines.push(
      good
        ? `${cls} ${when}: ${ING[d.mine]} is a move I make with it${f < 0.9 ? `, about ${pct(f)} of the time` : ''}.`
        : `With ${cls} ${when} I'd usually ${d.best === 'bet' ? 'raise' : d.best === 'allin' ? 'shove' : d.best}. ${ING[d.mine].charAt(0).toUpperCase() + ING[d.mine].slice(1)} is something I rarely do there.`,
    );
    if (d.size === 'big') lines.push('That raise is bigger than it needs to be. Two to three big blinds does the job.');
    if (d.size === 'small') lines.push('Make it a touch bigger. Two big blinds is about the least you want.');
  } else if (d.how === 'push') {
    lines.push(
      d.best === 'allin'
        ? `At ${stack} big blinds it's shove or fold, and ${cls} is a shove. Folding gives up the blinds you could win.`
        : `At ${stack} big blinds it's shove or fold, and ${cls} is a fold. A shove gets called by better hands too often.`,
    );
  } else if (d.how === 'price' && d.eq !== undefined && d.need !== undefined) {
    lines.push(`You need to win about ${pct(d.need)} of the time to call. Against what it could hold, you win ${d.eq < 0.03 ? 'almost never' : `about ${pct(d.eq)} of the time`}.`);
    lines.push(d.eq >= d.need ? (good || d.mine === 'call' || d.mine === 'allin' ? 'That clears the price, so calling pays.' : "That clears the price, so folding gives up chips.") : good ? "That's short of the price, so folding saves chips." : "That's short of the price, so calling loses chips over time.");
  } else {
    if (d.eq !== undefined) lines.push(`You win about ${pct(d.eq)} of the time against what it could hold${d.folds !== undefined && (aggressive(d.mine) || aggressive(d.best)) ? `, and it folds to a bet about ${pct(d.folds)} of the time` : ''}.`);
    if (good) lines.push(aggressive(d.mine) ? 'That bet earns its keep.' : `${mine.charAt(0).toUpperCase() + mine.slice(1)} is the play.`);
    else if (aggressive(d.best) && !aggressive(d.mine)) lines.push(`I'd go for ${best} here. ${d.mine === 'check' ? 'Checking leaves chips on the table.' : "That's worth more than sitting back."}`);
    else if (aggressive(d.mine) && !aggressive(d.best)) lines.push(`I'd ${d.best} here. Betting gets called by better hands and folded out by worse ones.`);
    else lines.push(`I'd lean towards ${best} here.`);
  }
  return lines;
}

/** What the coach says when a Scroll card is done: how it went, the move that mattered, and the idea to take away. */
export function scrollLines(t: Template, moves: CardMove[], outcome: Outcome, bot: { style: keyof typeof STYLE_NOTES } | null): string[] {
  const out: string[] = [];
  const costly = moves.filter((m) => !m.easy && m.grade !== 'green').sort((a, b) => b.loss - a.loss);
  const focus = costly[0] ?? moves.filter((m) => !m.easy).pop() ?? moves[moves.length - 1];
  if (outcome.passed && outcome.stars === 3) out.push(t.quick ? 'Good call. That is what I would do too.' : 'A clean card. Every move you made was one I like.');
  else if (outcome.passed) out.push(t.quick ? 'Close enough, but there was a better move.' : 'You got there, but one move was worth a second look.');
  else if (t.goal.kind === 'bluff' && !moves.some((m) => aggressive(m.mine))) out.push('A bluff needs a bet, and this one never got one.');
  else if (outcome.miss === 'goal') out.push("The moves were fine and the cards didn't cooperate. You can play a hand well and still lose it.");
  else out.push(t.quick ? 'Not this one.' : "Not this time. Let's see where it slipped.");
  if (focus) out.push(...scrollMove(focus, t.stack));
  const note = bot ? STYLE_NOTES[bot.style] : null;
  if (!outcome.passed || outcome.stars < 3) out.push(t.lesson);
  else if (t.theme === 'exploit' && note) out.push(`Nice read. ${note.line}`);
  return out;
}

export { scenarioTitle };
