import { useState } from 'react';
import { CASH, cashBuyIn, cashMin, cashStakeFor, STAKES } from '../game';
import { useCampaign } from '../state/campaign';
import { startCampaign } from '../state/store';
import { BackBar } from '../ui/components';
import { haptic } from '../ui/effects';
import { blinds, short } from './HomeCampaign';

const n0 = (n: number) => n.toLocaleString('en-US');

/** The cash game's own screen: the blinds your bankroll plays, and how much of it to sit down with. */
export function CashSeat() {
  const c = useCampaign();
  const stake = cashStakeFor(c.chips);
  const max = stake ? cashBuyIn(c, stake) : 0;
  const min = stake ? cashMin(stake) : 0;
  // Starts at 40 big blinds, or as near as the bankroll allows.
  const start = stake ? Math.max(min, Math.min(max, stake.bigBlind * 40)) : 0;
  const [pick, setPick] = useState<number | null>(null);
  const amount = Math.max(min, Math.min(max, pick ?? start));
  if (!stake || max < min) {
    return (
      <div className="screen cash-seat">
        <BackBar title="Cash game" />
        <div className="cs-page">
          <p className="muted">You need {n0(cashMin(STAKES[0]))} chips to sit at the smallest table. Your salary tops you up tomorrow.</p>
        </div>
      </div>
    );
  }
  const bb = amount / stake.bigBlind;
  const set = (v: number) => {
    setPick(v);
    haptic('light');
  };
  const quick = [
    { label: `${CASH.minBB} BB`, value: min },
    { label: '40 BB', value: stake.bigBlind * 40 },
    { label: '75 BB', value: stake.bigBlind * 75 },
    { label: 'Max', value: max },
  ].filter((q, i, all) => q.value >= min && q.value <= max && all.findIndex((x) => x.value === q.value) === i);
  return (
    <div className="screen cash-seat">
      <BackBar title="Cash game" right={<span className="rl-bank num">{short(c.chips)}</span>} />
      <div className="cs-page">
        <section className="cs-table" aria-label="Blinds">
          <span className="cs-felt" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <small>Your blinds</small>
          <b className="num">{blinds(stake)}</b>
          <span className="cs-note">Set by your bankroll. They go up as it grows.</span>
        </section>

        <section className="cs-pick" aria-label="Buy-in">
          <small>Sit down with</small>
          <b className="cs-amount num">
            <i className="chip-dot" aria-hidden />
            {n0(amount)}
          </b>
          <span className="cs-bb">
            {+bb.toFixed(1)} big blinds · {n0(c.chips - amount)} stays in your bankroll
          </span>
          <input
            type="range"
            className="cs-slider"
            aria-label="Buy-in"
            min={min}
            max={max}
            step={stake.smallBlind}
            value={amount}
            onChange={(e) => setPick(Number(e.target.value))}
            style={{ ['--fill' as string]: `${max > min ? ((amount - min) / (max - min)) * 100 : 100}%` }}
          />
          <div className="cs-range">
            <span>{short(min)}</span>
            <span>{short(max)}</span>
          </div>
          <div className="cs-quick">
            {quick.map((q) => (
              <button key={q.label} type="button" className={`cs-chip press${q.value === amount ? ' on' : ''}`} onClick={() => set(q.value)}>
                {q.label}
              </button>
            ))}
          </div>
        </section>

        <p className="cs-fine">Cash out any time from the table menu. Bots sit with 100 big blinds.</p>
        <button type="button" className="cs-go press" disabled={!!c.seat} onClick={() => startCampaign('cash', stake.id, amount)}>
          {c.seat ? 'Finish your table first' : `Sit down with ${short(amount)}`}
        </button>
      </div>
    </div>
  );
}
