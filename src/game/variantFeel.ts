import { SENSE, variantEquity } from './botVariants';
import { potTotal } from './holdem';
import { pulseOf, type HandPulse } from '../bot_engine/director';
import type { Game, HandAction } from './types';
import type { Variant } from './variants';

/**
 * How a game mode feels, measured from the bots' own play at an all-bot table: do they bet a good hand that was checked
 * to them, fold a hand that is a favourite at the price, call with nothing, shove junk; and each game's own goals (the
 * imposter gets caught about as often as not, powers get played, missions get done, a hit usually doesn't bust).
 * `scripts/variantFeel.ts` prints them; `variantFeel.test.ts` holds the general ones. Bands are our estimates (marked
 * `est`): the published advice is about plain Hold'em, not these games.
 */
const AGGRESSIVE = ['bet', 'raise', 'allin'];

export interface VariantMetric {
  id: string;
  label: string;
  value: number | null;
  n: number;
  band: [number, number] | null;
  note: string;
  pass: boolean | null;
}
interface Tally {
  n: number;
  hit: number;
}
interface Snapshot {
  hand: number;
  actorId: string;
  eq: number;
  price: number;
  canCheck: boolean;
  fair: number;
  /** What a hand needs to be a favourite here: its fair share times one and a half, more in games where big hands are common. */
  bar: number;
  stackBb: number;
  actions: number;
}

const BANDS: Record<string, { label: string; band: [number, number] | null; minN: number; note: string }> = {
  openBetStrong: { label: 'Bet a favourite when it is free to check', band: [72, 100], minN: 40, note: 'est: against random hands; a favourite is not always one against a player whose bet says something' },
  openBetAny: { label: 'Bet at all when it is free to check', band: [15, 65], minN: 80, note: 'est: lower in Ghost, where a bluff cannot win the pot' },
  scaredFold: { label: 'Fold a favourite at the price', band: [0, 14], minN: 40, note: 'est: was 11 to 23% before the habits' },
  crazyCall: { label: 'Call with far too little', band: [0, 15], minN: 40, note: 'est' },
};

export class VariantFeel {
  private t: Record<string, Tally> = {};
  private snap: Snapshot | null = null;
  private lastHand = -1;
  private pulses: HandPulse[] = [];
  private trash = 0;
  private hands = 0;
  private extra: Record<string, number> = {};
  /** The lab's one seated person, played by the same brain as the bots. */
  hostId = '';
  constructor(private variant: Variant) {}
  private bump(id: string, hit: boolean) {
    const t = (this.t[id] ??= { n: 0, hit: 0 });
    t.n++;
    if (hit) t.hit++;
  }
  private add(id: string, by = 1) {
    this.extra[id] = (this.extra[id] ?? 0) + by;
  }
  /** Call before every step: remembers what the bot about to move is facing. */
  before(game: Game, rng: () => number): void {
    this.snap = null;
    const hand = game.hand;
    if (!hand || hand.result || hand.runout || !hand.toAct || this.variant === 'imposter') return;
    const seat = hand.seats.find((s) => s.playerId === hand.toAct);
    const player = game.players.find((p) => p.id === hand.toAct);
    if (!seat || !(player?.bot || player?.id === this.hostId) || seat.folded || seat.allIn) return;
    const rivals = hand.seats.filter((s) => s.playerId !== seat.playerId && !s.folded).length;
    if (!rivals) return;
    const toCall = Math.max(0, hand.currentBet - seat.bet);
    const pot = potTotal(hand);
    this.snap = {
      hand: hand.number,
      actorId: seat.playerId,
      eq: variantEquity(game, hand, seat, rng, 70),
      price: toCall > 0 ? toCall / (pot + toCall) : 0,
      canCheck: toCall === 0,
      fair: 1 / (rivals + 1),
      bar: 1.5 / (rivals + 1) + (SENSE[this.variant]?.value ?? 0) * 0.6,
      stackBb: player.stack / game.settings.bigBlind,
      actions: hand.actions?.length ?? 0,
    };
  }
  /** Call after every step. */
  after(game: Game): void {
    const hand = game.hand;
    if (!hand) return;
    const s = this.snap;
    if (s && s.hand === hand.number) {
      const move = (hand.actions ?? []).slice(s.actions).find((a: HandAction) => a.playerId === s.actorId && !a.outOfTurn);
      if (move && hand.board.length) this.decision(s, move);
      this.snap = null;
    }
    if (hand.result && this.lastHand !== hand.number) {
      this.lastHand = hand.number;
      this.finished(game);
    }
  }
  private decision(s: Snapshot, a: HandAction) {
    const betting = AGGRESSIVE.includes(a.move);
    if (s.canCheck) {
      if (s.eq >= s.bar) this.bump('openBetStrong', betting);
      this.bump('openBetAny', betting);
    } else {
      if (s.eq > s.price * 1.4 && s.price > 0.05) this.bump('scaredFold', a.move === 'fold');
      if (s.eq < s.price * 0.6 && s.price > 0.1) this.bump('crazyCall', a.move === 'call');
    }
    if ((a.move === 'allin' || (betting && a.to !== undefined)) && s.eq < 0.15 && s.stackBb > 15 && a.move === 'allin') this.trash++;
  }
  private finished(game: Game) {
    const hand = game.hand!;
    this.hands++;
    this.pulses.push(pulseOf(hand, game.settings.bigBlind));
    const r = hand.result!;
    const v = this.variant;
    if (v === 'imposter' && r.imposter) {
      this.bump('imposterCaught', r.imposter.caught);
      const voters = Object.entries(r.imposter.votes);
      for (const [from, at] of Object.entries(hand.points ?? {})) {
        if (from === r.imposter.id) continue;
        this.bump('pointAccuracy', at === r.imposter.id);
      }
      this.add('imposterHands');
      this.add('votesOnImposter', voters.filter(([, at]) => at === r.imposter!.id).length);
      this.add('voters', voters.length);
    }
    if (v === 'power') {
      this.add('powersDealt', Object.keys(hand.powers ?? {}).length);
      this.add('powersPlayed', (hand.powerUses ?? []).length);
      for (const u of hand.powerUses ?? []) this.add(`power:${u.power}`);
    }
    if (v === 'missions') this.add('missionsDone', (hand.missionsDone ?? []).length);
    if (v === 'bjholdem') {
      const hits = Object.values(hand.hits ?? {}).reduce((a, b) => a + b, 0);
      this.add('hits', hits);
      this.add('busts', (hand.busted ?? []).length);
      this.bump('anyBust', (hand.busted ?? []).length > 0);
    }
    if (v === 'ghost' && r.ghost) this.bump('ghostKept', r.ghost.kept > 0);
    if (v === 'dice' && hand.dice) this.bump('dieSwapped', hand.dice.roll <= 5);
  }
  report(): VariantMetric[] {
    const out: VariantMetric[] = [];
    const pct = (id: string, b: { label: string; band: [number, number] | null; minN: number; note: string }) => {
      const t = this.t[id] ?? { n: 0, hit: 0 };
      const value = t.n ? (100 * t.hit) / t.n : null;
      out.push({
        id,
        label: b.label,
        value,
        n: t.n,
        band: b.band,
        note: b.note,
        pass: b.band === null || value === null || t.n < b.minN ? null : value >= b.band[0] && value <= b.band[1],
      });
    };
    for (const [id, b] of Object.entries(BANDS)) pct(id, b);
    const hands = Math.max(1, this.hands);
    out.push({
      id: 'trashAllIn',
      label: 'All in with almost no chance, per 100 hands',
      value: (100 * this.trash) / hands,
      n: this.hands,
      band: [0, 1],
      note: 'owner: no all-ins on stupid hands',
      pass: (100 * this.trash) / hands <= 1,
    });
    const mean = (f: (p: HandPulse) => number) => (100 * this.pulses.reduce((a, p) => a + f(p), 0)) / Math.max(1, this.pulses.length);
    out.push({ id: 'flops', label: 'Hands that saw a flop', value: mean((p) => +p.flop), n: this.hands, band: null, note: 'info', pass: null });
    out.push({ id: 'showdowns', label: 'Hands that went to a showdown', value: mean((p) => +p.showdown), n: this.hands, band: null, note: 'info', pass: null });
    out.push({
      id: 'pot',
      label: 'Average pot, big blinds',
      value: this.pulses.reduce((a, p) => a + p.potBb, 0) / Math.max(1, this.pulses.length),
      n: this.hands,
      band: null,
      note: 'info',
      pass: null,
    });
    const own = (id: string, label: string, band: [number, number] | null, minN: number, note: string) => pct(id, { label, band, minN, note });
    if (this.variant === 'imposter') {
      own('imposterCaught', 'Imposter caught by the table', [20, 55], 40, 'est: bots read bets into checks only, so they catch it now and then; people do the rest');
      own('pointAccuracy', 'Bots point at the real imposter', null, 40, 'chance is 1 in (players - 1); above that is real detection');
    }
    if (this.variant === 'bjholdem') {
      own('anyBust', 'Hands where someone busts', [10, 55], 40, 'est');
      out.push({ id: 'hits', label: 'Hits per hand', value: (this.extra.hits ?? 0) / hands, n: this.hands, band: null, note: 'info', pass: null });
    }
    if (this.variant === 'ghost') own('ghostKept', 'Showdowns the ghost wins the pot', [8, 40], 25, 'est');
    if (this.variant === 'dice') own('dieSwapped', 'Die swaps a card (1 to 5)', null, 20, 'five in six');
    if (this.variant === 'power') {
      const dealt = this.extra.powersDealt ?? 0;
      const share = dealt ? (100 * (this.extra.powersPlayed ?? 0)) / dealt : null;
      out.push({
        id: 'powersPlayed',
        label: 'Dealt powers that get played',
        value: share,
        n: dealt,
        band: [50, 90],
        note: 'est: a power is played when it helps, not always',
        pass: share === null ? null : share >= 50 && share <= 90,
      });
    }
    if (this.variant === 'missions') {
      const per = (100 * (this.extra.missionsDone ?? 0)) / hands;
      out.push({ id: 'missions', label: 'Missions completed per 100 hands', value: per, n: this.hands, band: [15, 60], note: 'est: a goal that lands every few hands', pass: per >= 15 && per <= 60 });
    }
    return out;
  }
  /** Counts of each power played, for the report. */
  powerCounts(): Record<string, number> {
    return Object.fromEntries(Object.entries(this.extra).filter(([k]) => k.startsWith('power:')));
  }
}
