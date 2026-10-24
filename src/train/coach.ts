// What the GTO Coach says. The solver's numbers go in, short plain sentences come out. All the wording
// lives here so the tone stays the same on every screen: friendly, brief, no jargon until you ask.

import type { Colour, Decision, HandReport } from '../gto/types';
import { actionKind, bb, pct, prettyAction } from './format';
import { scenarioTitle } from './scenarios';
import type { Draw, Made, Spot } from '../quiz/read';

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
export function greeting(opts: { toReview: number; lastGame?: number; decisions: number; gtoPct: number; weakest?: { id: string; title: string } | null }): string {
  const hands = (n: number) => (n === 1 ? 'one hand' : `${n} hands`);
  if (opts.lastGame) return `Your last game has ${hands(opts.lastGame)} I haven't looked at. Want to go through them?`;
  if (opts.toReview > 0) return `There are ${hands(opts.toReview)} I haven't looked at yet. Want to go through them?`;
  if (opts.weakest) return `Your toughest spot lately is ${opts.weakest.title.toLowerCase()}. A few drills would help.`;
  if (opts.decisions > 0) return `You're matching me on ${pct(opts.gtoPct)} of your decisions. Keep playing and I'll keep watching.`;
  return "Play a few hands and I'll go through them with you.";
}

export { scenarioTitle };

// ── Solved hands ───────────────────────────────────────────────────────────

/** The coach's verdict on one of your moves in a solved hand (after the grade), and GTO's mix there. */
export function quizLines(colour: Colour, best: string, freq: number, loss: number | null, mix: { label: string; freq: number }[]): string[] {
  const verdict =
    loss == null
      ? `I never make that move here. My pick is ${lower(best)}.`
      : colour === 'green'
        ? freq >= 0.5
          ? "That's my play."
          : freq >= 0.15
            ? `It's one of my plays here, about ${pct(freq)} of the time.`
            : 'It costs next to nothing.'
        : colour === 'yellow'
          ? `My pick is ${lower(best)}, about ${bb(loss)} better.`
          : `My pick is ${lower(best)}. Yours gives up about ${bb(loss)}.`;
  const always = mix.length === 1 || mix[0].freq >= 0.99;
  const how = always
    ? `With this hand I always ${lower(mix[0].label)}.`
    : `With this hand I mix it up: ${mix.map((o) => `${lower(o.label)} ${pct(o.freq)}`).join(', ')}.`;
  return [verdict, how];
}

const MADE_TEXT: Record<Made, string> = {
  'nuts-ish': 'a very strong hand',
  set: 'a set',
  'two-pair': 'two pair',
  overpair: 'an overpair',
  'top-pair-good': 'top pair with a good kicker',
  'top-pair': 'top pair with a weak kicker',
  'middle-pair': 'middle pair',
  'weak-pair': 'a weak pair',
  board: 'only what the board gives everyone',
  'ace-high': 'ace high',
  nothing: 'no pair',
};
const DRAW_TEXT: Record<NonNullable<Draw>, string> = {
  combo: 'a flush and straight draw',
  flush: 'a flush draw',
  'open-ended': 'an open-ended straight draw',
  gutshot: 'a gutshot straight draw',
  backdoor: 'backdoor draws',
};
const strongMade = (m: Made) => m === 'nuts-ish' || m === 'set' || m === 'two-pair' || m === 'overpair' || m === 'top-pair-good';
const mediumMade = (m: Made) => m === 'top-pair' || m === 'middle-pair' || m === 'weak-pair';
const realDraw = (d: Draw) => d != null && d !== 'backdoor';
const moveKind = (o: { kind: string; to: number }, pot: number): 'fold' | 'check' | 'call' | 'small' | 'big' | 'raise' =>
  o.kind === 'fold'
    ? 'fold'
    : o.kind === 'check'
      ? 'check'
      : o.kind === 'call'
        ? 'call'
        : o.kind === 'raise'
          ? 'raise'
          : o.kind === 'allin' || o.to >= 0.6 * pot
            ? 'big'
            : 'small';
const PREFLOP_KIND: Record<Spot['preflopKind'], string> = {
  premium: 'is one of the best starting hands',
  strong: 'is a strong ace that dominates a lot of the hands that play back',
  'suited-ace': 'makes the nut flush and takes away some of their aces',
  pair: 'can flop a set and win a big pot',
  'suited-connector': 'makes straights and flushes and plays well after the flop',
  broadway: 'makes strong top pairs often',
  weak: 'is on the weak side',
};
const BEHIND: Record<string, number> = { UTG: 5, HJ: 4, CO: 3, BTN: 2, SB: 1, BB: 0 };

/** Why GTO plays a spot the way it does, and what's wrong with your pick if it differs: the poker reasons in plain words. */
export function quizWhy(s: Spot, chosen: { kind: string; to: number; freq: number; ev: number | null }): string[] {
  const out: string[] = [];
  const need = Math.round(s.needed * 100);
  const eq = s.equity == null ? null : Math.round(s.equity * 100);
  const best = moveKind(s.best, s.pot);
  const mine = moveKind(chosen, s.pot);
  // Strong enough to play for value: against one player that's half the pot, multiway a good share above average.
  const strong = strongMade(s.made) && (s.equity == null || s.equity >= (s.players >= 3 ? s.fairShare + 0.1 : 0.5));
  const made = strongMade(s.made) && !strong ? 'a hand that looks strong but is weaker than it seems here' : MADE_TEXT[s.made];
  const draw = s.draw ? DRAW_TEXT[s.draw] : null;
  // Well ahead of an average hand here, whatever the hand is called.
  const ahead = eq != null && eq >= Math.max(50, Math.round(s.fairShare * 100) + 15);

  if (s.street === 'preflop') {
    const facing = s.toCall > 0 && s.pot > 2;
    const hand = `${s.handClass}`;
    if (!facing) {
      if (best === 'raise' || best === 'big' || best === 'small')
        out.push(
          s.preflopKind === 'weak'
            ? `From the ${s.position} you can raise wide: ${BEHIND[s.position] <= 2 ? 'only the blinds are left to act, they fold often, and you' : 'you'}'ll have position after the flop.`
            : `${hand} ${PREFLOP_KIND[s.preflopKind]}, so it's a profitable raise from the ${s.position}.`,
        );
      else if (best === 'check') out.push(`In the big blind you see the flop for free. With ${hand} there's no reason to raise the limp.`);
      else out.push(`${hand} is too weak to play from the ${s.position}: ${BEHIND[s.position]} players still to act could wake up with something better, and it does badly when called.`);
    } else {
      out.push(`You need about ${need}% equity to call, because you're putting in ${bbWord(s.toCall)} to win ${bbWord(s.pot + s.toCall)}.`);
      if (best === 'call')
        out.push(`${hand} ${PREFLOP_KIND[s.preflopKind] === PREFLOP_KIND.weak ? 'has enough equity at that price' : PREFLOP_KIND[s.preflopKind]}, so calling is right${s.position === 'BB' ? ' and you close the action' : ''}.`);
      else if (best === 'raise' || best === 'big')
        out.push(
          s.preflopKind === 'premium' || s.preflopKind === 'strong'
            ? `Re-raise for value: ${hand} is ahead of most of the hands that raised.`
            : `A re-raise as a bluff: ${hand} blocks some of their strong hands and still plays well when they call.`,
        );
      else out.push(`Even at that price ${hand} loses too often to the hands that raise${!s.inPosition ? ", and you'd play it out of position" : ''}. Folding saves chips.`);
      if (s.callers > 0) {
        const who = s.callers === 1 ? 'a raise and a call' : `a raise and ${s.callers} calls`;
        const multiwayHand = s.preflopKind === 'pair' || s.handClass.endsWith('s');
        if (best === 'call')
          out.push(
            multiwayHand
              ? `With ${who} in front, the flop will be multiway, and ${hand} is the kind of hand that wants that: ${s.preflopKind === 'pair' ? 'when it flops a set' : 'when it makes a flush or a straight'} it can win a big pot from several players.`
              : `With ${who} in front you get a great price. Offsuit hands like ${hand} lose value in multiway pots, so the price is what makes this a call.`,
          );
        else if (best === 'raise' || best === 'big')
          out.push(`This is a squeeze: with ${who} in front, a re-raise often takes the pot straight away, because the callers rarely have the very best hands (they'd have re-raised).`);
        else
          out.push(`With ${who} in front you'd have to beat more than one range: hands that win small pots heads-up, like weak offsuit aces and kings, lose value multiway.`);
      }
    }
  } else {
    const t = s.texture;
    if (s.made === 'board')
      out.push("Your hand plays the board: everyone still in has at least what's out there, so the best you can do is split, and anyone holding a card that improves it beats you.");
    if (s.toCall > 0) {
      out.push(
        `You need ${need}% equity to call ${bbWord(s.toCall)}${
          eq != null ? `, and you have about ${eq}% ${s.players >= 3 ? `of the pot against the ${s.players - 1} players still in` : 'against the hands that bet here'}` : ''
        }.`,
      );
      if (s.street === 'river' && (mediumMade(s.made) || s.made === 'ace-high') && (best === 'call' || best === 'fold'))
        out.push(
          best === 'call'
            ? s.players >= 3
              ? `On the river ${made} is a bluff-catcher, and a bet into several players is weighted to value, so a call has to beat some of their value hands too. This one does often enough at this price.`
              : `On the river ${made} is a bluff-catcher: it beats their bluffs, not their value bets. Against a ${pct(s.betShare)} pot bet you have to keep calling with about ${pct(s.mdf)} of your hands, or they can bluff you with anything.`
            : s.players >= 3
              ? `On the river ${made} only beats bluffs, and someone betting into several players rarely is: multiway river bets are mostly value, so it's one of the hands you let go.`
              : `On the river ${made} only beats bluffs, and this line is weighted to value, so it's one of the hands you let go.`,
        );
      if (best === 'raise' && s.street === 'flop' && !s.inPosition && t && !t.high && t.connected)
        out.push("A low, connected board like this is where the caller check-raises: you have more sets, two pair and straights here than the preflop raiser.");
      if (s.spr > 0 && s.spr < 3 && (strong || s.made === 'top-pair') && best !== 'fold')
        out.push(`Stacks are short next to the pot (about ${Number(s.spr.toFixed(1))} pots behind), so this hand is strong enough to get all the money in.`);
      const rawOk = eq != null && eq >= need;
      if (best === 'fold' && rawOk)
        out.push(
          `Your raw equity is enough, but you won't realise all of it: ${s.street === 'river' ? 'the hands that call here are behind too much of what bets' : `there's more betting to come${!s.inPosition ? ' and you act first' : ''}, and they'll often bet again`}. So it's a fold.`,
        );
      else if (best === 'call' && eq != null && !rawOk && s.street !== 'river')
        out.push(
          `Your raw equity is a bit short, but ${draw && realDraw(s.draw) ? `${draw} wins a bigger pot when it comes in` : 'you can win more on later streets when you improve'}, so the call still pays.`,
        );
      else if (best === 'call')
        out.push(
          `So calling makes money${draw && realDraw(s.draw) && s.street !== 'river' ? `, and ${draw} gives you outs to improve` : ''}.${
            strong ? ' With a hand this strong, calling also keeps their bluffs in.' : ''
          }${!s.inPosition && s.street !== 'river' && eq != null && eq < need + 10 ? " Out of position you won't realise all of it, so it's close." : eq != null && eq < need + 5 ? " It's close, but the price is right." : ''}`,
        );
      else if (best === 'raise' || best === 'big')
        out.push(
          strong
            ? `Raise for value: with ${made} you're ahead of most of the hands that bet, and you want more money in${t?.wet && s.street !== 'river' ? ' before a draw can come in' : ''}.`
            : draw && s.street !== 'river'
              ? `Raise as a semi-bluff: ${s.nutDraw ? 'the nut flush draw' : draw} wins when they fold and still has outs when they call.`
              : `Raise as a bluff: your hand takes away some of their strongest hands and they can't call with everything.`,
        );
      else if (!rawOk) out.push(`Fold: that's not enough${eq != null ? '' : ' with ' + made}, and too many of the hands that bet like this beat you.`);
    } else {
      // A word on the board or the new card first.
      if (s.street === 'flop' && t) {
        if (s.raiser && t.high && !t.connected)
          out.push('A high, dry board like this favours the preflop raiser: they have more big pairs and strong aces.');
        else if (!t.high && t.connected) out.push("A low, connected board like this hits the caller's range harder than the raiser's.");
      } else if (t?.newCard === 'flush')
        out.push(`The flush card changes things: hands that had a flush draw just got there${s.made === 'nuts-ish' && strong ? ', and so did you' : ''}.`);
      else if (t?.newCard === 'straight') out.push('That card completes some straights.');
      else if (t?.newCard === 'overcard') out.push(`An overcard like that is good for the player who raised before the flop.`);
      else if (t?.newCard === 'pair') out.push('The board pairing means fewer strong hands are possible.');

      if (s.street === 'flop' && s.threeBetPot && s.raiser && best === 'small')
        out.push('In a 3-bet pot your range is much stronger than theirs, so small, frequent bets work well.');
      if (s.street === 'turn' && s.betLastStreet && s.newCard && t) {
        if ((best === 'small' || best === 'big') && t.newCard === 'overcard')
          out.push(`The ${cardName(s.newCard)} is a good card to keep betting: an overcard helps the preflop raiser's range more than the caller's.`);
        else if (best === 'check' && (t.newCard === 'flush' || t.newCard === 'straight' || t.newCard === 'pair'))
          out.push('Slow down: that card helps the hands that called your flop bet more than yours.');
      }
      if (s.street !== 'flop' && s.prevAggressor == null && !s.hadInitiative && best === 'check' && s.players >= 3)
        out.push('Everyone checked the last street, so nobody has shown strength, but nobody has folded either: there are still several ranges to get through.');

      if (best === 'check') {
        if (!s.hadInitiative && !s.inPosition && (s.street === 'flop' || (s.prevAggressor != null && s.best.freq > 0.95)))
          out.push(
            s.street === 'flop'
              ? 'Out of position against the preflop raiser you check almost every hand: their range is stronger here, so you let them bet first.'
              : 'You check to the player who bet the last street and let them keep betting.',
          );
        else if (strong) out.push(`Check with ${made}: it protects the hands you check with and lets them bet into you. You can still get the money in later.`);
        else if (mediumMade(s.made) && s.players < 3) out.push(`Check for pot control: ${made} has showdown value, but a bet mostly gets called by better hands and folds out worse ones.`);
        else if (draw && realDraw(s.draw) && s.street !== 'river') out.push(`Check and take a free card with ${draw}.`);
        else if (eq != null && eq >= 0.35 * 100 && s.street !== 'river')
          out.push(
            `Check: ${s.overcards ? 'two overcards give you about six outs and' : made + ' still has'} about ${eq}% equity, but a bet only folds out worse hands. Checking lets you see the next card cheaply.`,
          );
        else out.push(`Give up for now: you have ${made}, and a bet won't fold out enough better hands.`);
      } else if ((best === 'small' || best === 'big') && !strongMade(s.made) && !mediumMade(s.made) && ahead) {
        out.push(
          `Bet for thin value and protection: ${made} is ahead more often than it looks here, about ${eq}% of the pot ${s.players >= 3 ? 'against everyone' : 'against their range'}${
            s.hadInitiative ? '' : ' after the checks'
          }. A bet gets called by worse ${s.street === 'river' ? 'hands' : 'hands and draws'}${s.street !== 'river' ? ' and makes the hands with live cards pay to see the next one' : ''}.`,
        );
      } else if (best === 'small') {
        if (strong) out.push(`A small bet for value: plenty of worse hands can call it${t?.wet ? ', and it makes the draws pay' : ''}.`);
        else if (mediumMade(s.made)) out.push(`A small bet with ${made} gets value from worse pairs and draws, and protects your hand.`);
        else
          out.push(
            `A small bet is cheap: it only needs to work a little to make money${draw && realDraw(s.draw) && s.street !== 'river' ? `, and ${draw} gives you outs when called` : ', and it folds out hands that would beat you by the river'}.`,
          );
      } else if (best === 'big') {
        if (strong) out.push(`Bet big: with ${made} you want to build the pot${t?.wet && s.street !== 'river' ? ' and charge the draws' : ''}.`);
        else if (draw && realDraw(s.draw) && s.street !== 'river') out.push(`Bet big as a semi-bluff with ${draw}: lots of folds now, and outs when called.`);
        else if (mediumMade(s.made)) out.push(`A big bet with ${made}: on a board like this it charges the draws while you're likely ahead.`);
        else
          out.push(
            `Bet big as a bluff: your range has more of the very best hands here, so they can't call big bets with everything. ${
              s.blocker
                ? `Your ${cardName(s.blocker)} blocks the nut flush, so they're less likely to have the hands that call.`
                : s.made === 'nothing'
                  ? s.street === 'river'
                    ? 'A missed draw has no showdown value, which makes it the best kind of bluff.'
                    : 'With no pair you have no showdown value, which makes it a good bluff.'
                  : ''
            }`.trim(),
          );
      }
    }
  }

  if (s.street !== 'preflop' && s.players >= 3)
    out.push(...multiwayWhy(s, best, made, draw, strong).filter((l) => !(eq != null && l.startsWith('You have about') && out.some((o) => o.includes(`${eq}%`)))));

  // What's wrong with your pick, when it's a different kind of move.
  if (chosen.ev == null) {
    out.push(
      s.street === 'preflop'
        ? chosen.kind === 'allin'
          ? 'Moving all in for 100bb risks your whole stack to win a small pot: the hands that call it are mostly the ones that beat you, so GTO never does it here.'
          : chosen.kind === 'call' && s.toCall <= 1
            ? "Limping isn't part of GTO's strategy here: first in, it raises or folds."
            : "GTO doesn't use that move here."
        : !s.hadInitiative && !s.inPosition
          ? "Leading into the player who had the betting lead isn't part of my strategy here."
          : "That size isn't part of my strategy here.",
    );
  } else if (mine !== best && chosen.freq >= 0.15) {
    out.push(`It's close, though: I also ${lower(moveWord[mine])} here ${pct(chosen.freq)} of the time, so yours is fine too.`);
  } else if (mine !== best && chosen.freq >= 0.01) {
    out.push(`I only do that ${pct(chosen.freq)} of the time here. ${s.best.label} is the main play, and it's worth a little more on average.`);
  } else if (mine !== best) {
    const why: Partial<Record<string, string>> = {
      'fold>call': "Folding throws away a hand that's getting the right price.",
      'fold>raise': 'Folding gives up a hand strong enough to raise.',
      'call>fold': "Calling loses money over time: you're behind too much of their range.",
      'call>raise': 'Just calling lets them see the next card cheaply when you should be raising.',
      'raise>call':
        s.street === 'preflop'
          ? `A re-raise with ${s.handClass} folds out the hands you beat and gets called by the ones that beat you. Calling keeps it in, and it plays well when it hits the flop.`
          : strong
            ? 'Raising folds out the worse hands that would keep paying you. Calling keeps them in.'
            : 'Raising turns your hand into a bluff: worse hands fold and better ones re-raise.',
      'raise>fold': "Raising here is too expensive a bluff: they don't fold enough.",
      'check>small': strong || mediumMade(s.made) ? 'Checking misses value from worse hands.' : 'Checking gives up a pot a cheap bet would often win.',
      'check>big': strong ? `Checking misses value${s.texture?.wet ? ' and gives the draws a free card' : ''}.` : 'Checking lets them off the hook when a big bet would win the pot.',
      'small>check': 'Betting here mostly gets called by better hands and folds out worse ones.',
      'big>check':
        s.players >= 3
          ? `With ${s.players - 1} players to get through, a big bet mostly gets called by hands that beat you.`
          : strong
            ? 'A big bet folds out the worse hands you want to keep in. Checking lets them bet or catch up a little.'
            : 'A big bet here only gets called by better hands.',
      'small>big': 'Size matters here: a bigger bet makes them pay more with the hands that call.',
      'big>small': 'A smaller bet does the job: you want worse hands to keep calling.',
    };
    const line = why[`${mine}>${best}`];
    if (line) out.push(line);
  }
  return out;
}

/** What changes with three or more players in the pot (at most two lines, the most relevant first). */
function multiwayWhy(s: Spot, best: ReturnType<typeof moveKind>, made: string, draw: string | null, strong: boolean): string[] {
  const out: string[] = [];
  const others = s.players - 1;
  const eq = s.equity == null ? null : Math.round(s.equity * 100);
  if (s.toCall > 0) {
    if (best === 'fold' && s.defenders > 1 && s.mdfEach < s.mdf - 0.05)
      out.push(
        `You don't have to defend alone: with ${s.defenders} of you left to answer a ${pct(s.betShare)} pot bet, each only needs to keep about ${pct(s.mdfEach)} of hands, not the ${pct(s.mdf)} you'd need heads-up. So weaker hands can go.`,
      );
    if (s.callers > 0 && (best === 'call' || best === 'fold'))
      out.push(
        `${s.callers === 1 ? 'Someone has already called' : `${s.callers} players have already called`}, so the price looks better, but a caller's range is strong too: ${
          best === 'call' ? 'you have enough to come along' : "hands that are fine heads-up don't make it here"
        }.`,
      );
    if (s.behind > 0 && (best === 'call' || (best === 'fold' && eq != null && eq >= Math.round(s.needed * 100) - 5)) && out.length < 2)
      out.push(`${s.behind === 1 ? 'One player is' : `${s.behind} players are`} still to act behind you and could raise, so you call a bit tighter than the price alone says.`);
    if (s.made === 'top-pair' && (best === 'fold' || best === 'call') && out.length < 2)
      out.push(
        `Top pair with a weak kicker is often dominated multiway: the more players, the likelier someone has the same pair with a better kicker${best === 'call' ? ', so this call is about the price, not the hand' : ''}.`,
      );
    if ((s.draw === 'flush' || s.draw === 'combo') && s.street !== 'river' && out.length < 2)
      out.push(
        s.nutDraw
          ? 'Draws to the nuts gain value in multiway pots: when you hit, more players can pay you off, and nobody has a bigger flush.'
          : "Careful with a flush draw that isn't to the ace: in a multiway pot someone else can hold a bigger one.",
      );
    if (best === 'raise' && strong && out.length < 2)
      out.push(`With ${others} players in, raising now charges everyone drawing against you, and there are more of them than heads-up.`);
  } else {
    if (strong && (best === 'small' || best === 'big'))
      out.push(`With ${others} opponents, someone usually has a piece of this board, so strong hands bet: more hands can call, and you charge more draws.`);
    else if (best === 'check' && mediumMade(s.made))
      out.push(`Against ${others} players ${made} becomes a pot-control hand: a value bet needs a stronger hand, because someone often has you beaten or a good draw.`);
    else if (best === 'check' && !draw && (s.made === 'nothing' || s.made === 'ace-high'))
      out.push(
        `Bluffs work less with more players: every one of them has to fold. If each folds half the time, a bluff into ${others} players only gets through about ${pct(Math.pow(0.5, others))} of the time.`,
      );
    else if (best === 'check' && draw && realDraw(s.draw) && s.street !== 'river')
      out.push(`With ${others} players to get through, a semi-bluff folds out less, so ${draw} often prefers to see the next card for free.`);
    if (s.hadInitiative && s.street === 'flop' && (best === 'small' || best === 'check') && out.length < 2)
      out.push("Multiway, the preflop raiser bets less often and smaller than heads-up: each extra caller makes it likelier that someone hit the board.");
    else if (!s.hadInitiative && !s.inPosition && best === 'check' && s.street === 'flop' && s.behind > 1 && out.length < 2)
      out.push("Betting into the raiser with another player still to come rarely works: you'd have to get through two ranges, and one of them is strong.");
  }
  if (eq != null && out.length < 2)
    out.push(`You have about ${eq}% of the pot against everyone, and an average hand with ${s.players} players has ${pct(s.fairShare)}.`);
  return out.slice(0, 2);
}

const bbWord = (x: number) => `${Number(x.toFixed(1))}bb`;
const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const cardName = (c: string) => `${c[0] === 'T' ? '10' : c[0]}${SUIT_SYMBOL[c[1]]}`;
const moveWord: Record<string, string> = { fold: 'fold', check: 'check', call: 'call', small: 'bet small', big: 'bet big', raise: 'raise' };

/** When the solved line goes a different way from your pick. */
export function quizCarryOn(line: string): string {
  return `The hand carries on the way I played it: ${lower(line)}.`;
}

/** How a solved hand ended for you, in big blinds. */
export function quizResult(netBb: number, showdown: boolean): string {
  const n = Number(Math.abs(netBb).toFixed(1));
  if (netBb > 0) return `You won ${n} big blinds${showdown ? ' at showdown' : ''}.`;
  if (netBb < 0) return `You lost ${n} big blinds${showdown ? ' at showdown' : ''}.`;
  return 'You broke even.';
}

/** The last word on a finished solved hand. */
export function quizSummary(grades: Colour[]): string {
  const n = grades.length;
  const bad = grades.filter((g) => g !== 'green').length;
  if (n === 0) return 'Nothing to decide in that one.';
  if (bad === 0) return n === 1 ? 'One decision, and you got it.' : `All ${n} decisions right. Nice.`;
  return `${n - bad} of ${n} right. ${bad === 1 ? 'One' : bad} worth another look.`;
}
