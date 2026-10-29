import { useEffect, useRef, useState } from 'react';
import { cashMax, DAILY_SPIN, FORMATS, goalDone, goals, isOpen, STAKES, topDraw, VENUES } from '../../game';
import { useCampaign } from '../../state/campaign';
import { closeSheet, openCampaignForFriends, takeFreeSpin, useApp } from '../../state/store';
import { today } from '../../state/campaign';
import { confetti, haptic, reducedMotion } from '../../ui/effects';
import { playSound } from '../../ui/sound';
import { Sheet } from '../../ui/components';
import { ChevronIcon, LockIcon } from '../../ui/Icons';
import { blinds, GoalRow, short } from '../HomeCampaign';

/** Every goal in one list: ready to collect first, then the ones on the way, then the ones already collected. */
export function CampaignGoalsSheet() {
  const c = useCampaign();
  const all = goals(c);
  const ready = all.filter((g) => goalDone(g) && !c.claimed.includes(g.id));
  const going = all.filter((g) => !goalDone(g));
  const collected = all.filter((g) => c.claimed.includes(g.id));
  const earned = collected.reduce((a, g) => a + g.reward, 0);
  return (
    <Sheet title="Goals">
      <p className="muted" style={{ marginTop: 0 }}>
        {collected.length} of {all.length} collected{earned ? `, worth ${short(earned)} chips so far` : ''}. Each goal pays once.
      </p>
      {[
        { title: 'Ready to collect', list: ready },
        { title: 'On the way', list: going },
        { title: 'Collected', list: collected },
      ]
        .filter((part) => part.list.length > 0)
        .map((part) => (
          <section key={part.title} className="goal-part">
            <p className="menu-section">{part.title}</p>
            <div className="goals">
              {part.list.map((g) => (
                <GoalRow key={g.id} g={g} c={c} />
              ))}
            </div>
          </section>
        ))}
    </Sheet>
  );
}

/** Pick a campaign table to open online. Friends join with the code, and everyone pays from their own bankroll. */
export function CampaignFriendsSheet() {
  const c = useCampaign();
  const busy = useApp((s) => !!s.busy);
  const [kind, setKind] = useState<'sng' | 'cash'>('sng');
  const seated = !!c.seat;
  return (
    <Sheet title="Play with friends">
      <p className="muted" style={{ marginTop: 0 }}>
        Open a campaign table and share its code. Everyone pays the buy-in from their own bankroll, and empty seats fill with bots when you deal.
      </p>
      <div className="segmented" role="tablist" style={{ marginBottom: 16 }}>
        <button type="button" role="tab" aria-selected={kind === 'sng'} className={kind === 'sng' ? 'on' : ''} onClick={() => setKind('sng')}>
          Tournament
        </button>
        <button type="button" role="tab" aria-selected={kind === 'cash'} className={kind === 'cash' ? 'on' : ''} onClick={() => setKind('cash')}>
          Cash game
        </button>
      </div>
      <div className="settings-list">
        {kind === 'sng'
          ? VENUES.map((v) => {
              const f = FORMATS[v.format];
              const open = isOpen(c, v);
              const ok = open && !seated && c.chips >= v.buyIn;
              return (
                <button key={v.id} type="button" className="group-row press" disabled={!ok || busy} onClick={() => void openCampaignForFriends('sng', v.id)}>
                  <span className="gr-icon friend-pick-emoji" aria-hidden>
                    {v.emoji}
                  </span>
                  <span className="gr-text">
                    {v.name}
                    <small>
                      {f.name} · buy-in {short(v.buyIn)} · prize up to {short(v.buyIn * topDraw(f))}
                    </small>
                  </span>
                  {open ? <ChevronIcon className="gr-chev" width={18} height={18} /> : <LockIcon className="gr-chev" width={18} height={18} />}
                </button>
              );
            })
          : STAKES.map((s) => {
              const open = isOpen(c, s);
              const ok = open && !seated && c.chips >= cashMax(s);
              return (
                <button key={s.id} type="button" className="group-row press" disabled={!ok || busy} onClick={() => void openCampaignForFriends('cash', s.id)}>
                  <span className="gr-icon friend-pick-emoji" aria-hidden>
                    🃏
                  </span>
                  <span className="gr-text">
                    {blinds(s)} cash game
                    <small>Everyone sits with {short(cashMax(s))}</small>
                  </span>
                  {open ? <ChevronIcon className="gr-chev" width={18} height={18} /> : <LockIcon className="gr-chev" width={18} height={18} />}
                </button>
              );
            })}
      </div>
      {seated && <p className="muted">Finish the campaign table you’re at first.</p>}
    </Sheet>
  );
}

/** How long the prize wheel turns (matches .daily-wheel g's transition in campaign.css). */
const DAILY_MS = 3200;
const SLICE = 360 / DAILY_SPIN.length;

/** The free daily spin: a prize wheel with what it can pay, spun once a day. */
export function DailySpinSheet() {
  const c = useCampaign();
  const [won, setWon] = useState<number | null>(null);
  const [turn, setTurn] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const used = c.spinDay === today() && won === null;

  const spin = () => {
    if (won !== null) return;
    const prize = takeFreeSpin();
    if (prize === null) return;
    const i = DAILY_SPIN.findIndex(([x]) => x === prize);
    // Lands the slice under the pointer at the top, a little off its middle so it looks like a real stop.
    setTurn(360 * 5 - i * SLICE - SLICE / 2 + (Math.random() - 0.5) * SLICE * 0.6);
    setWon(prize);
    haptic('medium');
    playSound('shuffle');
    timer.current = setTimeout(
      () => {
        setDone(true);
        haptic('success');
        playSound(prize >= 1000 ? 'victory' : 'collect');
        confetti(undefined, undefined, prize >= 1000 ? 140 : 60);
      },
      reducedMotion() ? 0 : DAILY_MS,
    );
  };

  const colours = ['var(--party-pink)', 'var(--party-orange)', 'var(--party-yellow)', 'var(--party-green)', 'var(--party-blue)', 'var(--violet)', 'var(--rl-red)'];
  return (
    <Sheet title="Free daily spin">
      <div className="daily-wheel-wrap">
        <svg className="daily-wheel" viewBox="-110 -110 220 220" aria-hidden>
          <g style={{ transform: `rotate(${turn}deg)` }}>
            {DAILY_SPIN.map(([x], i) => {
              const a0 = (i * SLICE - 90) * (Math.PI / 180);
              const a1 = ((i + 1) * SLICE - 90) * (Math.PI / 180);
              const r = 100;
              return (
                <g key={x}>
                  <path d={`M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)}Z`} style={{ fill: colours[i % colours.length] }} />
                  <text transform={`rotate(${(i + 0.5) * SLICE}) translate(0 -66)`} className="daily-label">
                    {short(x)}
                  </text>
                </g>
              );
            })}
            <circle r="18" className="daily-hub" />
          </g>
          <path d="M0 -92 L-9 -110 L9 -110 Z" className="daily-pointer" />
        </svg>
      </div>
      <p className="daily-result" aria-live="polite">
        {done && won !== null ? (
          <>
            You won <b className="num">+{short(won)}</b>
          </>
        ) : used ? (
          'You’ve had today’s spin. Come back tomorrow for another.'
        ) : won !== null ? (
          'Spinning…'
        ) : (
          'One free spin every day.'
        )}
      </p>
      {done || used ? (
        <button type="button" className="btn btn-xl btn-green" onClick={closeSheet}>
          Done
        </button>
      ) : (
        <button type="button" className="btn btn-xl btn-green" disabled={won !== null} onClick={spin}>
          Spin
        </button>
      )}
    </Sheet>
  );
}
