import { useEffect } from 'react';
import {
  broke,
  cashBuyIn,
  cashMin,
  claimGoal,
  collectSalary,
  goalDone,
  goals,
  isOpen,
  nextTitle,
  ROULETTE_MIN,
  salaryDue,
  SNG_PRIZES,
  titleOf,
  venueById,
  VENUES,
  type Campaign,
  type Goal,
  type Venue,
} from '../game';
import { setCampaign, today, untilTomorrow, useCampaign } from '../state/campaign';
import { confirm, navigate, openSheet, reconcileCampaign, startCampaign, toast, useApp } from '../state/store';
import { Count, useNow } from '../ui/components';
import { confetti, haptic } from '../ui/effects';
import { playSound } from '../ui/sound';
import { ChevronIcon, HelpIcon, LockIcon } from '../ui/Icons';

const n0 = (n: number) => n.toLocaleString('en-US');

/** Short chip counts for tight spots: 2.5K, 10M. */
export function short(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(n % 1e9 ? 1 : 0)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}K`;
  return n0(n);
}

/** Even shorter, for blinds in a tight row: 500/1K. */
const tiny = (n: number): string => (n >= 1000 && n < 1e4 ? `${+(n / 1000).toFixed(1)}K` : short(n));

/** What you can buy into with the least: a venue's tournament or its cash table, whichever is cheaper. */
const cheapest = Math.min(...VENUES.flatMap((v) => [v.sng, cashMin(v)]));

/** The Campaign tab: your bankroll, the daily salary, the venues to climb, the wheel and the goals. */
export function CampaignTab() {
  const c = useCampaign();
  const named = useApp((s) => s.profile.name.trim().length > 0);
  // Chips on the campaign table you're sitting at still count as yours for the salary.
  const atTable = useApp((s) => (s.game?.campaign && s.game.id === c.seat?.gameId ? (s.game.players.find((p) => p.deviceId === s.deviceId)?.stack ?? 0) : 0));
  const tableOn = useApp((s) => !!s.game?.campaign && s.game.status !== 'ended' && s.game.id === c.seat?.gameId);
  const day = today();
  const due = salaryDue(c, day, atTable);

  useEffect(() => {
    reconcileCampaign();
    // The first time here: how it works.
    if (!c.intro) openSheet({ name: 'campaignIntro' });
  }, []);

  // Nothing to top up today: the day still counts, without a button to press.
  useEffect(() => {
    if (c.day !== day && due === 0) setCampaign(collectSalary(c, day, atTable));
  }, [c, day, due, atTable]);

  const collect = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setCampaign(collectSalary(c, day, atTable));
    haptic('success');
    playSound('collect');
    confetti(undefined, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  const needName = (): boolean => {
    if (named) return false;
    navigate({ name: 'profile', then: 'done' });
    toast('Add your name first.');
    return true;
  };

  const sit = (kind: 'cash' | 'sng', v: Venue) => {
    if (needName()) return;
    if (kind === 'cash') {
      const buyIn = cashBuyIn(c, v);
      confirm({
        title: `Sit down at ${v.name}?`,
        body: `Cash game, blinds ${n0(v.smallBlind)}/${n0(v.bigBlind)}. You sit with ${n0(buyIn)} from your bankroll and can cash out any time from the table menu.`,
        confirm: `Sit down with ${n0(buyIn)}`,
        onConfirm: () => startCampaign('cash', v.id),
      });
    } else {
      confirm({
        title: `${v.name} tournament`,
        body: `Buy in for ${n0(v.sng)}. Six players with 1,500 chips each, and the blinds double every six hands. 1st wins ${n0(v.sng * SNG_PRIZES[0])}, 2nd wins ${n0(v.sng * SNG_PRIZES[1])}.`,
        confirm: `Buy in for ${n0(v.sng)}`,
        onConfirm: () => startCampaign('sng', v.id),
      });
    }
  };

  const seatVenue = venueById(c.seat?.venue);
  const all = goals(c);
  const ready = all.filter((g) => goalDone(g) && !c.claimed.includes(g.id));
  const next = all.filter((g) => !goalDone(g)).slice(0, 3);
  const doneCount = c.claimed.length;

  return (
    <>
      <Bankroll c={c} />
      {due > 0 && (
        <section className="payday" aria-label="Payday">
          <span className="payday-coin" aria-hidden>
            💰
          </span>
          <div className="payday-text">
            <b>{c.day ? 'Payday' : 'Your first salary'}</b>
            <small>{c.day ? 'Your salary tops your bankroll back up to 1,000.' : 'Every day you open FlipUp, your bankroll is topped up to 1,000.'}</small>
          </div>
          <button type="button" className="payday-go press" onClick={collect}>
            Collect +{n0(due)}
          </button>
        </section>
      )}
      {tableOn && seatVenue && (
        <button type="button" className="hero hero-slate press" onClick={() => navigate({ name: 'table' })}>
          <span className="hero-top">
            <span className="hero-title">Back to {seatVenue.name}</span>
            <span className="hero-sub">{c.seat?.kind === 'cash' ? `Cash table ${n0(seatVenue.smallBlind)}/${n0(seatVenue.bigBlind)}` : 'Your tournament is on'}</span>
          </span>
          <span className="hero-foot">
            Back to the table
            <ChevronIcon width={18} height={18} />
          </span>
        </button>
      )}
      {due === 0 && !c.seat && <OutOfChips c={c} />}

      <h3 className="section-head">Tables</h3>
      <div className="venues">
        {VENUES.map((v) => (
          <VenueCard key={v.id} v={v} c={c} seated={!!c.seat} onSit={sit} />
        ))}
      </div>

      <button type="button" className="wheel-card press" disabled={c.chips < ROULETTE_MIN && due === 0} onClick={() => navigate({ name: 'roulette' })}>
        <span className="wheel-card-art" aria-hidden>
          <i />
        </span>
        <span className="wheel-card-text">
          <b>Roulette</b>
          <small>Red or black? Put your chips on the wheel and try to win big.</small>
        </span>
        <ChevronIcon width={22} height={22} />
      </button>

      <div className="section-row">
        <h3 className="section-head">Goals</h3>
        <span className="section-count">
          {doneCount} of {all.length}
        </span>
      </div>
      <div className="goals">
        {[...ready, ...next].map((g) => (
          <GoalRow key={g.id} g={g} ready={goalDone(g)} onClaim={(e) => claim(c, g, e)} />
        ))}
      </div>

      <h3 className="section-head">Your record</h3>
      <div className="camp-stats">
        <Stat label="Best bankroll" value={short(c.peak)} />
        <Stat label="Tournaments won" value={n0(c.stats.sngWins)} />
        <Stat label="Best cash-out" value={c.stats.bestCash > 0 ? `+${short(c.stats.bestCash)}` : '–'} />
        <Stat label="Paydays" value={n0(c.days)} />
      </div>

      <div className="group">
        <button type="button" className="group-row press" onClick={() => openSheet({ name: 'campaignIntro' })}>
          <span className="gr-icon" style={{ background: 'var(--party-blue)' }}>
            <HelpIcon />
          </span>
          <span className="gr-text">How the campaign works</span>
          <ChevronIcon className="gr-chev" width={18} height={18} />
        </button>
      </div>
    </>
  );
}

function claim(c: Campaign, g: Goal, e: React.MouseEvent): void {
  const r = e.currentTarget.getBoundingClientRect();
  setCampaign(claimGoal(c, g.id));
  haptic('success');
  playSound('chips');
  confetti(undefined, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 60);
}

/** The bankroll: the big number, your title, and how far to the next room. */
function Bankroll({ c }: { c: Campaign }) {
  const title = titleOf(c.peak);
  const nextTitleUp = nextTitle(c.peak);
  const nextVenue = VENUES.find((v) => !isOpen(c, v));
  const target = nextVenue ? { at: nextVenue.unlock, text: `${nextVenue.emoji} ${nextVenue.name}` } : nextTitleUp ? { at: nextTitleUp.at, text: `${nextTitleUp.emoji} ${nextTitleUp.name}` } : null;
  const pct = target ? Math.min(100, (c.peak / target.at) * 100) : 100;
  return (
    <section className="bankroll" aria-label="Your bankroll">
      <div className="bankroll-top">
        <span className="eyebrow">Bankroll</span>
        <span className="bankroll-title">
          {title.emoji} {title.name}
        </span>
      </div>
      <b className="bankroll-chips">
        <i className="chip-dot" aria-hidden />
        <Count value={c.chips} />
      </b>
      {target && (
        <div className="bankroll-next">
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={target.at} aria-valuenow={Math.min(c.peak, target.at)}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <small>
            Reach <b>{n0(target.at)}</b> to open {target.text}
          </small>
        </div>
      )}
    </section>
  );
}

/** Nothing left to play with: say when the salary comes. */
function OutOfChips({ c }: { c: Campaign }) {
  const now = useNow(30_000);
  if (c.chips >= cheapest) return null;
  const ms = untilTomorrow(new Date(now));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const when = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <section className={`camp-note${broke(c) ? ' broke' : ''}`}>
      <span aria-hidden>{broke(c) ? '🪫' : '🎡'}</span>
      <div>
        <b>{broke(c) ? 'You’re out of chips' : `Down to your last ${n0(c.chips)}`}</b>
        <small>
          {broke(c) ? 'That’s it for today.' : 'Not enough for a table. The wheel could get you back in.'} Your salary tops you up to 1,000 in {when}.
        </small>
      </div>
    </section>
  );
}

function VenueCard({ v, c, seated, onSit }: { v: Venue; c: Campaign; seated: boolean; onSit: (kind: 'cash' | 'sng', v: Venue) => void }) {
  if (!isOpen(c, v)) {
    const pct = Math.min(100, (c.peak / v.unlock) * 100);
    return (
      <article className={`venue venue-${v.id} locked`} aria-label={`${v.name}, locked`}>
        <span className="venue-emoji" aria-hidden>
          {v.emoji}
        </span>
        <div className="venue-name">
          <b>{v.name}</b>
          <small>
            Opens at {short(v.unlock)} · blinds {tiny(v.smallBlind)}/{tiny(v.bigBlind)}
          </small>
          <div className="bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <LockIcon className="venue-lock" width={22} height={22} />
      </article>
    );
  }
  const buyIn = cashBuyIn(c, v);
  const cashOk = !seated && buyIn > 0;
  const sngOk = !seated && c.chips >= v.sng;
  return (
    <article className={`venue venue-${v.id}`}>
      <div className="venue-head">
        <span className="venue-emoji" aria-hidden>
          {v.emoji}
        </span>
        <div className="venue-name">
          <b>{v.name}</b>
          <small>{v.line}</small>
        </div>
      </div>
      <div className="venue-games">
        <button type="button" className="venue-btn press" disabled={!cashOk} onClick={() => onSit('cash', v)}>
          <small>Cash table</small>
          <b>
            {short(v.smallBlind)}/{short(v.bigBlind)}
          </b>
          <span>{buyIn > 0 ? `Sit with ${short(buyIn)}` : `Need ${short(cashMin(v))}`}</span>
        </button>
        <button type="button" className="venue-btn press" disabled={!sngOk} onClick={() => onSit('sng', v)}>
          <small>Tournament</small>
          <b>{short(v.sng)}</b>
          <span>Win {short(v.sng * SNG_PRIZES[0])}</span>
        </button>
      </div>
    </article>
  );
}

function GoalRow({ g, ready, onClaim }: { g: Goal; ready: boolean; onClaim: (e: React.MouseEvent) => void }) {
  const pct = Math.min(100, (g.have / g.need) * 100);
  return (
    <div className={`goal${ready ? ' ready' : ''}`}>
      <span className="goal-emoji" aria-hidden>
        {g.emoji}
      </span>
      <div className="goal-text">
        <b>{g.title}</b>
        <small>{g.line}</small>
        {!ready && (
          <div className="bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {ready ? (
        <button type="button" className="goal-go press" onClick={onClaim}>
          +{short(g.reward)}
        </button>
      ) : (
        <span className="goal-reward">+{short(g.reward)}</span>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="camp-stat">
      <b className="num">{value}</b>
      <small>{label}</small>
    </div>
  );
}
