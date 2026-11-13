import { handBucket, type Bucket } from '../game/handBucket';
import type { BotMove } from '../game/botPlay';
import type { InformationSet } from './information';

/**
 * How a table feels, measured from the bots' own decisions: do they bet when it's checked to them, c-bet as the
 * raiser, slowplay big hands, fold a pair to a small bet, shove with nothing. Each number has a band that a table of
 * ordinary players sits in, and the source it comes from. `npm run bot:feel` prints them; `feel.test.ts` holds them.
 *
 * Bands marked `est` are our own reading of the published advice (which is mostly qualitative), not measured data.
 */
const AGGRESSIVE = ['bet', 'raise', 'allin'];
const VALUE: Bucket[] = ['monster', 'strong', 'top'];

interface Tally {
  n: number;
  hit: number;
}
export interface FeelMetric {
  id: string;
  label: string;
  /** Percent, or per 100 hands for `per100`. */
  value: number | null;
  n: number;
  band: [number, number];
  source: string;
  pass: boolean | null;
}

const BANDS: Record<string, { label: string; band: [number, number]; source: string; minN: number }> = {
  cbetHU: { label: 'C-bet the flop, heads-up', band: [60, 78], source: 'Black Rain 79: about 70% at low stakes', minN: 40 },
  cbet2: { label: 'C-bet the flop, two opponents', band: [30, 52], source: 'Black Rain 79: 50% at most', minN: 25 },
  cbet3: { label: 'C-bet the flop, three or more', band: [8, 45], source: 'Black Rain 79: drops further (est)', minN: 15 },
  checkedToHU: { label: 'Bet when checked to (flop, heads-up)', band: [52, 75], source: 'est, from the c-bet figure and delayed bets', minN: 60 },
  checkedToValue: { label: 'Bet a big hand when checked to (all streets)', band: [78, 100], source: 'est: nobody checks top pair or better down; a river thin value bet is a choice', minN: 60 },
  checkedToAirMulti: { label: 'Stab with nothing when checked to (multiway)', band: [8, 24], source: 'est: a pot checked round is the classic stab, but far fewer than heads-up', minN: 25 },
  slowplay: { label: 'Check a big hand when able to bet', band: [0, 15], source: 'est: slowplays are the exception', minN: 40 },
  foldFlopBet: { label: 'Fold to one flop bet', band: [35, 50], source: 'est: sources disagree (micro under-folds, small stakes over-folds)', minN: 120 },
  foldTop: { label: 'Fold top pair to a bet up to 80% pot', band: [0, 10], source: 'est', minN: 20 },
  foldMid: { label: 'Fold middle pair to a bet up to 80% pot', band: [0, 38], source: 'PokerNews / DeucesCracked: micro stakes fail to fold second pair', minN: 40 },
  foldCheap: { label: 'Fold a pair or a draw to a bet of a fifth of the pot or less', band: [0, 12], source: 'pot odds: a fifth of the pot needs 14% to call; nearly every pair or draw has it (est)', minN: 40 },
  trashAllIn: { label: 'All in with nothing postflop, per 100 hands', band: [0, 1], source: 'owner: no all-ins on stupid hands', minN: 1 },
};

export class FeelCollector {
  private t: Record<string, Tally> = {};
  private hands = new Set<string>();
  private trash = 0;
  private bump(id: string, hit: boolean) {
    const t = (this.t[id] ??= { n: 0, hit: 0 });
    t.n++;
    if (hit) t.hit++;
  }
  /** Feed every decision from `simulate({ onAction })`. */
  observe(i: InformationSet, a: BotMove): void {
    this.hands.add(`${i.tableId}:${i.hand}`);
    if (i.street === 'preflop') return;
    const hero = i.players.find((p) => p.id === i.heroId)!;
    const bucket = handBucket(i.hole, i.board);
    const value = VALUE.includes(bucket);
    const acts = i.actions.filter((x) => x.street === i.street && !x.outOfTurn);
    const live = i.players.filter((p) => p.id !== i.heroId && !p.folded && !p.allIn);
    const betting = AGGRESSIVE.includes(a.move);
    const allIn = a.move === 'allin' || (betting && a.to !== undefined && a.to >= hero.stack + hero.bet);
    if (allIn && (bucket === 'air' || bucket === 'weak') && hero.stack + hero.bet > i.bigBlind * 15) this.trash++;
    if (i.legal.canCheck && live.length) {
      const checkedTo = acts.length > 0 && live.every((p) => acts.some((x) => x.playerId === p.id && x.move === 'check'));
      const preAgg = [...i.actions].reverse().find((x) => x.street === 'preflop' && AGGRESSIVE.includes(x.move) && !x.outOfTurn);
      const pfa = preAgg?.playerId === i.heroId;
      if (i.street === 'flop' && pfa && acts.every((x) => x.move === 'check')) this.bump(live.length === 1 ? 'cbetHU' : live.length === 2 ? 'cbet2' : 'cbet3', betting);
      if (checkedTo) {
        if (i.street === 'flop' && live.length === 1) this.bump('checkedToHU', betting);
        if (value) this.bump('checkedToValue', betting);
        if (live.length >= 2 && bucket === 'air') this.bump('checkedToAirMulti', betting);
      }
      if ((bucket === 'monster' || bucket === 'strong') && (checkedTo || pfa)) this.bump('slowplay', !betting);
    }
    if (!i.legal.canCheck && i.legal.toCall > 0 && (bucket === 'top' || bucket === 'mid' || bucket === 'draw')) {
      const aggressive = acts.filter((x) => AGGRESSIVE.includes(x.move));
      const pot = i.players.reduce((s, p) => s + p.total, 0);
      if (aggressive.length === 1 && !acts.some((x) => x.playerId === i.heroId) && i.legal.toCall <= (pot - i.legal.toCall) * 0.2)
        this.bump('foldCheap', a.move === 'fold');
    }
    if (!i.legal.canCheck && i.street === 'flop') {
      const aggressive = acts.filter((x) => AGGRESSIVE.includes(x.move));
      if (aggressive.length === 1 && !acts.some((x) => x.playerId === i.heroId)) {
        const pot = i.players.reduce((s, p) => s + p.total, 0);
        const price = i.legal.toCall / Math.max(1, pot - i.legal.toCall);
        const folded = a.move === 'fold';
        this.bump('foldFlopBet', folded);
        if (price <= 0.8 && bucket === 'top') this.bump('foldTop', folded);
        if (price <= 0.8 && bucket === 'mid') this.bump('foldMid', folded);
      }
    }
  }
  report(): FeelMetric[] {
    const metrics: FeelMetric[] = Object.entries(BANDS).map(([id, b]) => {
      if (id === 'trashAllIn') {
        const value = this.hands.size ? (this.trash / this.hands.size) * 100 : null;
        return { id, label: b.label, value, n: this.hands.size, band: b.band, source: b.source, pass: value === null ? null : value <= b.band[1] };
      }
      const t = this.t[id] ?? { n: 0, hit: 0 };
      const value = t.n ? (t.hit / t.n) * 100 : null;
      const enough = t.n >= b.minN;
      return {
        id,
        label: b.label,
        value,
        n: t.n,
        band: b.band,
        source: b.source,
        pass: value === null || !enough ? null : value >= b.band[0] && value <= b.band[1],
      };
    });
    return metrics;
  }
}
