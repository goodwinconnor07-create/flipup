import { useEffect, useMemo, useRef, useState } from 'react';
import { cryptoRng, noteMission, payout, pocketColour, pocketName, rouletteLimit, ROULETTE_MIN, spinBets, spinWheel, totalBet, WHEEL, type Bets, type Spot } from '../game';
import { setCampaign, today, useCampaign } from '../state/campaign';
import { toast } from '../state/store';
import { BackBar } from '../ui/components';
import { confetti, haptic, reducedMotion } from '../ui/effects';
import { playSound } from '../ui/sound';
import { short } from './HomeCampaign';

/** How long the wheel turns before the ball settles (matches .wheel-spin in campaign.css). */
const SPIN_MS = 4200;
const STEP = 360 / WHEEL.length;

/** Chip values, smallest first. The picker shows the five that suit the bankroll. */
const CHIP_VALUES = [5, 25, 100, 500, 1000, 5000, 25000, 100000, 500000, 1000000, 5000000, 25000000, 100000000];

function chipChoices(bankroll: number): number[] {
  const fit = CHIP_VALUES.filter((v) => v <= Math.max(bankroll, ROULETTE_MIN));
  return fit.slice(-5);
}

/** The outside bets down the left of the layout, two number rows tall each, as on a real table turned on its side. */
const SIDE: { spot: Spot; label: string; tone?: 'red' | 'black' }[] = [
  { spot: 'low', label: '1–18' },
  { spot: 'even', label: 'Even' },
  { spot: 'red', label: 'Red', tone: 'red' },
  { spot: 'black', label: 'Black', tone: 'black' },
  { spot: 'odd', label: 'Odd' },
  { spot: 'high', label: '19–36' },
];

const DOZENS: { spot: Spot; label: string }[] = [
  { spot: 'd1', label: '1st 12' },
  { spot: 'd2', label: '2nd 12' },
  { spot: 'd3', label: '3rd 12' },
];

interface Spin {
  n: number;
  staked: number;
  back: number;
  /** The bankroll before the spin, shown until the ball lands. */
  before: number;
  done: boolean;
}

/** The campaign's roulette table: a European wheel, bets from the bankroll. */
export function Roulette() {
  const c = useCampaign();
  // Every chip put down, in order, so Undo takes back the last one. The bets on each spot add up from these.
  const [stack, setStack] = useState<{ spot: Spot; amount: number }[]>([]);
  const [lastBets, setLastBets] = useState<Bets>({});
  const [chip, setChip] = useState(() => {
    const choices = chipChoices(c.chips);
    return choices.find((v) => v >= c.chips / 40) ?? choices[choices.length - 1];
  });
  const [spin, setSpin] = useState<Spin | null>(null);
  const [wheelTurn, setWheelTurn] = useState(0);
  const [ballTurn, setBallTurn] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const bets = useMemo(() => {
    const b: Bets = {};
    for (const x of stack) b[x.spot] = (b[x.spot] ?? 0) + x.amount;
    return b;
  }, [stack]);
  const spinning = !!spin && !spin.done;
  const staked = totalBet(bets);
  const shown = spinning ? spin.before - spin.staked : c.chips - staked;
  const choices = chipChoices(c.chips);
  const pick = choices.includes(chip) ? chip : choices[choices.length - 1];

  const place = (spot: Spot) => {
    if (spinning) return;
    if (spin?.done) setSpin(null);
    // Up to the table limit, which grows with the rooms you've opened.
    const room = Math.min(c.chips, rouletteLimit(c)) - staked;
    const amount = Math.min(pick, room);
    if (amount < ROULETTE_MIN) {
      toast(staked >= rouletteLimit(c) ? `That’s the table limit: ${short(rouletteLimit(c))} a spin.` : room < ROULETTE_MIN ? 'That’s all your chips on the table.' : 'Not enough chips left.', 'error');
      haptic('error');
      return;
    }
    setStack((st) => [...st, { spot, amount }]);
    haptic('light');
    playSound('chip');
  };

  const undo = () => !spinning && setStack((st) => st.slice(0, -1));
  const clear = () => !spinning && setStack([]);

  const repeat = () => {
    if (spinning || totalBet(lastBets) > c.chips) return;
    setSpin(null);
    setStack((Object.entries(lastBets) as [Spot, number][]).map(([spot, amount]) => ({ spot, amount })));
    playSound('chips');
  };

  const go = () => {
    if (spinning) return;
    const n = spinWheel(cryptoRng);
    const next = spinBets(c, bets, n);
    if (typeof next === 'string') {
      toast(next, 'error');
      haptic('error');
      return;
    }
    const back = payout(bets, n);
    // The bankroll is settled now, so leaving mid-spin changes nothing; the screen catches up when the ball lands.
    setCampaign(noteMission(next, today(), 'spins'));
    setSpin({ n, staked, back, before: c.chips, done: false });
    setLastBets(bets);
    setStack([]);
    const k = WHEEL.indexOf(n);
    // The wheel turns clockwise until pocket k is under the pointer; the ball goes the other way and stops at the top.
    setWheelTurn((t) => t + 360 * 4 + ((((-k * STEP - t) % 360) + 360) % 360));
    setBallTurn((t) => t - 360 * 5);
    page.current?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    haptic('medium');
    playSound('shuffle');
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setSpin((s) => s && { ...s, done: true });
        if (back > 0) {
          haptic('success');
          playSound(back >= staked * 10 ? 'victory' : 'win');
          if (back > staked) confetti(undefined, undefined, back >= staked * 10 ? 140 : 70);
        } else playSound('fold');
      },
      reducedMotion() ? 50 : SPIN_MS,
    );
  };

  const chipOn = (spot: Spot) => (bets[spot] ? <i className="rl-chip">{short(bets[spot]!)}</i> : null);
  const result = spin?.done ? spin : null;
  const net = result ? result.back - result.staked : 0;

  return (
    <div className="screen roulette">
      <BackBar title="Roulette" right={<span className="rl-bank num">{short(Math.max(0, shown))}</span>} />
      <div className="rl-page" ref={page}>
        <section className="rl-wheel-wrap" aria-live="polite">
          <Wheel turn={wheelTurn} ballTurn={ballTurn} spinKey={spin ? wheelTurn : 0} />
          <div className={`rl-result${result ? ' on' : ''}`}>
            {result ? (
              <>
                <b className={`rl-n rl-${pocketColour(result.n)}`}>{result.n}</b>
                <span className={net > 0 ? 'win' : net < 0 ? 'lose' : ''}>{result.back > 0 ? `Won ${short(result.back)}` : 'No win'}</span>
              </>
            ) : spinning ? (
              <span className="rl-wait">No more bets</span>
            ) : (
              <span className="rl-wait">Place your bets</span>
            )}
          </div>
          {result && <p className="sr-only">{`${pocketName(result.n)}. ${result.back > 0 ? `You won ${result.back}.` : 'No win.'}`}</p>}
        </section>

        {c.spins.length > 0 && (
          <div className="rl-history" aria-label="Last numbers">
            {(spinning ? c.spins.slice(1) : c.spins).map((n, i) => (
              <i key={`${i}-${n}`} className={`rl-${pocketColour(n)}`}>
                {n}
              </i>
            ))}
          </div>
        )}

        <div className="rl-board" role="group" aria-label="Betting layout">
          <button type="button" className="rl-cell rl-green rl-zero" onClick={() => place('n0')} disabled={spinning} aria-label="Zero">
            0{chipOn('n0')}
          </button>
          {SIDE.map((s, i) => (
            <button
              key={s.spot}
              type="button"
              className={`rl-cell rl-side${s.tone ? ` rl-${s.tone}` : ''}`}
              style={{ gridRow: `${2 + i * 4} / span 4` }}
              onClick={() => place(s.spot)}
              disabled={spinning}
            >
              <span>{s.label}</span>
              {chipOn(s.spot)}
            </button>
          ))}
          {DOZENS.map((d, i) => (
            <button key={d.spot} type="button" className="rl-cell rl-dozen" style={{ gridRow: `${2 + i * 8} / span 8` }} onClick={() => place(d.spot)} disabled={spinning}>
              <span>{d.label}</span>
              {chipOn(d.spot)}
            </button>
          ))}
          {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`rl-cell rl-num rl-${pocketColour(n)}${result?.n === n ? ' hit' : ''}`}
              style={{ gridRow: `${2 + Math.floor((n - 1) / 3) * 2} / span 2`, gridColumn: 3 + ((n - 1) % 3) }}
              onClick={() => place(`n${n}`)}
              disabled={spinning}
            >
              {n}
              {chipOn(`n${n}`)}
            </button>
          ))}
          {(['c1', 'c2', 'c3'] as Spot[]).map((spot, i) => (
            <button key={spot} type="button" className="rl-cell rl-col" style={{ gridColumn: 3 + i }} onClick={() => place(spot)} disabled={spinning} aria-label={`Column ${i + 1}, pays 2 to 1`}>
              2:1
              {chipOn(spot)}
            </button>
          ))}
        </div>
        <p className="rl-pays">
          A number pays 35 to 1. Dozens and columns pay 2 to 1. Red, black, odd, even, 1–18 and 19–36 pay even money. The 0 loses every outside bet. Table limit {short(rouletteLimit(c))} a spin; it grows as you open bigger rooms.
        </p>
      </div>

      <div className="rl-bar glass">
        <div className="rl-chips" role="radiogroup" aria-label="Chip value">
          {choices.map((v, i) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={pick === v}
              className={`rl-pick tone-${i}${pick === v ? ' on' : ''} press`}
              onClick={() => {
                setChip(v);
                haptic('light');
              }}
            >
              {short(v)}
            </button>
          ))}
        </div>
        <div className="rl-actions">
          {staked > 0 || totalBet(lastBets) === 0 ? (
            <button type="button" className="rl-small press" onClick={undo} disabled={spinning || stack.length === 0}>
              Undo
            </button>
          ) : (
            <button type="button" className="rl-small press" onClick={repeat} disabled={spinning || totalBet(lastBets) > c.chips}>
              Repeat
            </button>
          )}
          <button type="button" className="rl-small press" onClick={clear} disabled={spinning || staked === 0}>
            Clear
          </button>
          <button type="button" className="rl-spin press" onClick={go} disabled={spinning || staked === 0}>
            {spinning ? 'Spinning…' : staked > 0 ? `Spin · ${short(staked)}` : 'Spin'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The wheel, drawn: 37 pockets in European order, a pointer at the top and the ball. */
function Wheel({ turn, ballTurn, spinKey }: { turn: number; ballTurn: number; spinKey: number }) {
  return (
    <svg className="rl-wheel" viewBox="-110 -110 220 220" aria-hidden>
      <circle r="108" className="rl-rim" />
      <g className="rl-rotor" style={{ transform: `rotate(${turn}deg)` }}>
        {WHEEL.map((n, i) => {
          const a0 = ((i - 0.5) * STEP - 90) * (Math.PI / 180);
          const a1 = ((i + 0.5) * STEP - 90) * (Math.PI / 180);
          const R = 96;
          const r = 64;
          const d = `M${r * Math.cos(a0)} ${r * Math.sin(a0)} L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} L${r * Math.cos(a1)} ${r * Math.sin(a1)} A${r} ${r} 0 0 0 ${r * Math.cos(a0)} ${r * Math.sin(a0)}Z`;
          return (
            <g key={n}>
              <path d={d} className={`rl-pocket rl-${pocketColour(n)}`} />
              <text transform={`rotate(${i * STEP}) translate(0 -84)`} className="rl-label">
                {n}
              </text>
            </g>
          );
        })}
        <circle r="64" className="rl-cone" />
        <circle r="46" className="rl-hub" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-2" y="-44" width="4" height="30" rx="2" className="rl-spoke" transform={`rotate(${i * 45})`} />
        ))}
        <circle r="10" className="rl-knob" />
      </g>
      <g className="rl-orbit" style={{ transform: `rotate(${ballTurn}deg)` }}>
        <circle key={spinKey} r="5.5" className={`rl-ball${spinKey ? ' drop' : ''}`} />
      </g>
      <path d="M0 -96 L-7 -110 L7 -110 Z" className="rl-pointer" />
    </svg>
  );
}
