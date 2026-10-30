import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  broke,
  cashBuyIn,
  cashMin,
  cashStakeFor,
  claimGoal,
  collectSalary,
  FORMATS,
  goalDone,
  goals,
  isOpen,
  nextTitle,
  ROULETTE_MIN,
  salaryDue,
  stakeById,
  STAKES,
  titleOf,
  topDraw,
  venueById,
  VENUES,
  bossReward,
  claimMission,
  dailyFor,
  legendById,
  missionBonus,
  missionReward,
  MISSIONS,
  salaryFor,
  STREAK_DAYS,
  streakToday,
  weekOf,
  dayBefore,
  type Brag,
  type Campaign,
  type Goal,
  type Stake,
  type Venue,
} from '../game';
import { getCampaign, setCampaign, today, untilTomorrow, useCampaign } from '../state/campaign';
import { ensureMyCode, loadPals, myPalCode, PALS_CHANGED, refreshPals, type Pal } from '../state/pals';
import { confirm, navigate, openSheet, prepareCampaign, reconcileCampaign, startCampaign, toast, useApp } from '../state/store';
import { Avatar, Count, useNow } from '../ui/components';
import { confetti, flyChips, haptic } from '../ui/effects';
import { playSound } from '../ui/sound';
import { ChevronIcon, HelpIcon, LockIcon, PlusIcon, UsersIcon } from '../ui/Icons';

const n0 = (n: number) => n.toLocaleString('en-US');

/** Short chip counts for tight spots: 2.5K, 10M. */
export function short(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(n % 1e9 ? 1 : 0)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}K`;
  return n0(n);
}

/** Even shorter, for blinds: 500/1K. */
export const tiny = (n: number): string => (n >= 1000 && n < 1e4 ? `${+(n / 1000).toFixed(1)}K` : short(n));

export const blinds = (s: Stake): string => `${tiny(s.smallBlind)}/${tiny(s.bigBlind)}`;

/** What you can buy into with the least: the cheapest tournament or the smallest cash game. */
const cheapest = Math.min(...VENUES.map((v) => v.buyIn), ...STAKES.map(cashMin));

/** When friends were last looked up, so switching tabs doesn't ask the server every time. */
let lastSync = 0;

/** The Campaign tab: your bankroll, the daily salary, cash games, tournaments, the wheel, friends and goals. */
export function CampaignTab() {
  const c = useCampaign();
  const named = useApp((s) => s.profile.name.trim().length > 0);
  // Chips on the campaign table you're sitting at still count as yours for the salary.
  const atTable = useApp((s) => (s.game?.campaign && s.game.id === c.seat?.gameId ? (s.game.players.find((p) => p.deviceId === s.deviceId)?.stack ?? 0) : 0));
  const tableOn = useApp((s) => !!s.game?.campaign && s.game.status !== 'ended' && s.game.id === c.seat?.gameId);
  const day = today();
  const due = salaryDue(c, day, atTable);
  const streak = streakToday(c, day);

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
    const btn = e.currentTarget;
    haptic('success');
    playSound('collect');
    confetti(undefined, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    // The chips fly to the bankroll and it ticks up as the first one lands.
    chipsToBank(btn, () => setCampaign(collectSalary(c, day, atTable)));
  };

  const needName = (): boolean => {
    if (named) return false;
    navigate({ name: 'profile', then: 'done' });
    toast('Add your name first.');
    return true;
  };

  const openCash = () => {
    if (needName()) return;
    navigate({ name: 'cashSeat' });
  };

  const playTourney = (v: Venue) => {
    if (needName()) return;
    const f = FORMATS[v.format];
    // The table is set up now, so its bounty (if it has one) can be named before you buy in.
    const bounty = prepareCampaign('sng', v.id);
    const boss = v.boss ? legendById(v.boss) : undefined;
    const extra = [
      boss ? ` ${boss.emoji} ${boss.short} runs this room${c.stats.bosses.includes(boss.id) ? ' (you’ve beaten them)' : `: knock them out for ${n0(bossReward(v))} the first time`}.` : '',
      bounty ? ` 🎯 Bounty: knock out ${bounty.emoji} ${bounty.name} for +${n0(bounty.reward)}.` : '',
    ].join('');
    confirm({
      title: `${v.name} ${f.name}`,
      body: `Buy in for ${n0(v.buyIn)}. ${f.line} The prize is drawn as you sit down: anything from ${n0(v.buyIn * f.draws[0][0])} up to ${n0(v.buyIn * topDraw(f))}.${extra}`,
      confirm: `Buy in for ${n0(v.buyIn)}`,
      onConfirm: () => startCampaign('sng', v.id),
    });
  };

  const seatName = !c.seat ? '' : c.seat.kind === 'cash' ? `the ${blindsOf(c.seat.venue)} cash game` : (venueById(c.seat.venue)?.name ?? 'your table');
  const all = goals(c);
  const ready = all.filter((g) => goalDone(g) && !c.claimed.includes(g.id));
  // Everything ready to collect, then the next few to work on (always at least one).
  const next = all.filter((g) => !goalDone(g)).slice(0, Math.max(1, 3 - ready.length));

  return (
    <>
      <BankBar c={c} />
      <Bankroll c={c} />
      {due > 0 && (
        <section className="payday" aria-label="Payday">
          <span className="payday-coin" aria-hidden>
            💰
          </span>
          <div className="payday-text">
            <b>{!c.day ? 'Your first salary' : streak > 1 ? `Payday · day ${streak} in a row` : 'Payday'}</b>
            <small>
              {!c.day
                ? 'Every day you open FlipUp, your bankroll is topped up to 1,000.'
                : `Your salary tops your bankroll up to ${n0(salaryFor(streak))}.${streak < STREAK_DAYS ? ` Come back tomorrow for ${n0(salaryFor(streak + 1))}.` : ' That’s the most it gets.'}`}
            </small>
          </div>
          <button type="button" className="payday-go press" onClick={collect}>
            Collect +{n0(due)}
          </button>
        </section>
      )}
      {tableOn && c.seat && (
        <button type="button" className="hero hero-slate press" onClick={() => navigate({ name: 'table' })}>
          <span className="hero-top">
            <span className="hero-title">Back to {seatName}</span>
            <span className="hero-sub">{c.seat.friends ? 'Your table with friends' : c.seat.kind === 'cash' ? 'Your seat is waiting' : 'Your tournament is on'}</span>
          </span>
          <span className="hero-foot">
            Back to the table
            <ChevronIcon width={18} height={18} />
          </span>
        </button>
      )}
      {due === 0 && !c.seat && <OutOfChips c={c} />}

      <DailySpin c={c} />

      <h3 className="section-head">Tables</h3>
      <div className="tourney-row" role="list">
        <CashBox c={c} seated={!!c.seat} onPlay={openCash} />
        <span className="shelf-split" aria-hidden>
          <i />
          <small>Tournaments</small>
          <i />
        </span>
        {VENUES.map((v) => (
          <TourneyCard key={v.id} v={v} c={c} seated={!!c.seat} onPlay={playTourney} />
        ))}
      </div>
      <p className="camp-quiet">From the Riverboat on, a boss runs each room: a style inspired by a famous player’s public reputation. Not their real hands, and not endorsed by or affiliated with them.</p>

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

      <Friends c={c} needName={needName} />

      <div className="section-row">
        <h3 className="section-head">Missions & goals</h3>
        <button type="button" className="section-link press" onClick={() => openSheet({ name: 'campaignGoals' })}>
          See all {all.length}
        </button>
      </div>
      <Missions c={c} />
      <div className="goals">
        {[...ready, ...next].map((g) => (
          <GoalRow key={g.id} g={g} c={c} />
        ))}
      </div>

      <h3 className="section-head">Your record</h3>
      <div className="camp-stats">
        <Stat label="Best bankroll" value={short(c.peak)} />
        <Stat label="Tournaments won" value={n0(c.stats.sngWins)} />
        <Stat label="Best cash-out" value={c.stats.bestCash > 0 ? `+${short(c.stats.bestCash)}` : '–'} />
        <Stat label="Best prize draw" value={c.stats.bestDraw ? `${c.stats.bestDraw}×` : '–'} />
        <Stat label="Bosses beaten" value={`${c.stats.bosses.length} of ${VENUES.filter((v) => v.boss).length}`} />
        <Stat label="Longest streak" value={`${c.stats.bestStreak} ${c.stats.bestStreak === 1 ? 'day' : 'days'}`} />
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

const blindsOf = (id: string): string => {
  const s = stakeById(id);
  return s ? blinds(s) : '';
};

/** Chips fly from a button to whichever bankroll is on screen (the card, or the small header once it has scrolled away); `done` runs as the first lands. */
function chipsToBank(from: Element, done: () => void): void {
  const to = document.querySelector('.bank-bar.on') ?? document.querySelector('.bankroll');
  if (!to) return done();
  let once = false;
  flyChips(from, to, 10, () => {
    if (!once) done();
    once = true;
  });
}

/** Collects a goal's reward with a burst from the button. */
export function claim(c: Campaign, g: Goal, e: React.MouseEvent): void {
  const r = e.currentTarget.getBoundingClientRect();
  setCampaign(claimGoal(c, g.id));
  haptic('success');
  playSound('chips');
  confetti(undefined, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 60);
}

/** A small header that floats at the top once the big bankroll card has scrolled out of sight. */
function BankBar({ c }: { c: Campaign }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const card = document.querySelector('.bankroll');
    if (!card || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting), { threshold: 0 });
    io.observe(card);
    return () => io.disconnect();
  }, []);
  // On the page itself: the tab's own container is transformed, which would make a fixed header scroll away with it.
  return createPortal(
    <div className={`bank-bar${on ? ' on' : ''}`} aria-hidden={!on}>
      <i className="chip-dot" aria-hidden />
      <span>Bankroll</span>
      <b>
        <Count value={c.chips} />
      </b>
    </div>,
    document.body,
  );
}

/** The bankroll: the big number, your title, and how far to the next table. */
function Bankroll({ c }: { c: Campaign }) {
  const title = titleOf(c.peak);
  const nextTitleUp = nextTitle(c.peak);
  // The nearest thing still shut: a tournament or a cash game's stakes.
  const shut = [
    ...VENUES.filter((v) => !isOpen(c, v)).map((v) => ({ at: v.unlock, text: `${v.emoji} ${v.name}` })),
  ].sort((a, b) => a.at - b.at)[0];
  const target = shut ?? (nextTitleUp ? { at: nextTitleUp.at, text: `${nextTitleUp.emoji} ${nextTitleUp.name}` } : null);
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

/** The cash game, a tall box at the start of the shelf. The blinds are whatever your bankroll plays; the buy-in is picked on the next screen. */
function CashBox({ c, seated, onPlay }: { c: Campaign; seated: boolean; onPlay: () => void }) {
  const stake = cashStakeFor(c.chips);
  const max = stake ? cashBuyIn(c, stake) : 0;
  const ok = !!stake && max > 0 && !seated;
  return (
    <button type="button" className="cash-box press" disabled={!ok} onClick={onPlay} aria-label="Cash game">
      <span className="cash-chips" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <b className="cash-box-title">Cash game</b>
      <span className="cash-box-sub">Sit down, cash out any time</span>
      <span className="cash-box-blinds">
        <small>Blinds</small>
        <b className="num">{stake ? blinds(stake) : '–'}</b>
      </span>
      <span className="tourney-buyin">
        Buy-in <b>{stake ? `${short(cashMin(stake))} – ${short(max)}` : `from ${short(cashMin(STAKES[0]))}`}</b>
      </span>
      <span className="tourney-go">{seated ? 'At a table' : ok ? 'Play now' : `Need ${short(cashMin(STAKES[0]))}`}</span>
    </button>
  );
}

/** A tournament venue on the shelf: its format, the most its prize can draw, and the buy-in. */
function TourneyCard({ v, c, seated, onPlay }: { v: Venue; c: Campaign; seated: boolean; onPlay: (v: Venue) => void }) {
  const f = FORMATS[v.format];
  const open = isOpen(c, v);
  const ok = open && !seated && c.chips >= v.buyIn;
  return (
    <button type="button" role="listitem" className={`tourney venue-${v.id}${open ? '' : ' locked'} press`} disabled={!ok} onClick={() => onPlay(v)} aria-label={`${v.name} ${f.name}, buy-in ${n0(v.buyIn)}${open ? '' : `, opens at ${n0(v.unlock)}`}`}>
      <span className="tourney-emoji" aria-hidden>
        {v.emoji}
      </span>
      <b className="tourney-name">{v.name}</b>
      <span className="tourney-format">
        {f.name} · {f.seats} players
      </span>
      <span className="tourney-prize">
        <small>Prize up to</small>
        <b className="num">{short(v.buyIn * topDraw(f))}</b>
      </span>
      <span className="tourney-buyin">
        Buy-in <b>{short(v.buyIn)}</b>
      </span>
      {v.boss && <BossTag id={v.boss} beaten={c.stats.bosses.includes(v.boss)} />}
      <span className="tourney-go">{open ? (c.chips >= v.buyIn ? 'Play' : `Need ${short(v.buyIn)}`) : 'Locked'}</span>
      {!open && (
        <span className="tourney-lock" aria-hidden>
          <LockIcon />
          <small>Reach</small>
          <b className="num">{short(v.unlock)}</b>
        </span>
      )}
    </button>
  );
}

/** You and your friends by bankroll, and the way to play them. */
function Friends({ c, needName }: { c: Campaign; needName: () => boolean }) {
  const profile = useApp((s) => s.profile);
  const [pals, setPals] = useState(loadPals);
  const [code, setCode] = useState(myPalCode);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<'week' | 'bankroll'>('week');
  useEffect(() => {
    const reload = () => setPals(loadPals());
    window.addEventListener(PALS_CHANGED, reload);
    if (Date.now() - lastSync > 60_000) {
      lastSync = Date.now();
      void refreshPals();
      // Your own card gets your latest bankroll too.
      if (myPalCode() && profile.name.trim()) void ensureMyCode().catch(() => undefined);
    }
    return () => window.removeEventListener(PALS_CHANGED, reload);
  }, []);

  const getCode = async () => {
    if (busy || needName()) return;
    setBusy(true);
    try {
      setCode(await ensureMyCode());
      toast('Your friends can see your bankroll now.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't make your code.", 'error');
    } finally {
      setBusy(false);
    }
  };

  // This week's winnings count only if they're from this week; last week's champion gets a crown.
  const week = weekOf(today());
  const lastWeek = weekOf(dayBefore(week));
  const weekWon = (k: string | undefined, won: number | undefined) => (k === week ? (won ?? 0) : 0);
  const lastWon = (card: { week?: string; weekWon?: number; lastWeek?: string; lastWeekWon?: number } | undefined) =>
    card?.week === lastWeek ? (card.weekWon ?? 0) : card?.lastWeek === lastWeek ? (card.lastWeekWon ?? 0) : 0;
  const mine = { week: c.week?.key, weekWon: c.week?.won, lastWeek: c.lastWeek?.key, lastWeekWon: c.lastWeek?.won };
  const rows: { key: string; name: string; emoji: string; chips: number; peak: number; wins: number; week: number; last: number; you?: boolean; pal?: Pal }[] = [
    { key: 'you', name: profile.name.trim() || 'You', emoji: profile.emoji, chips: c.chips, peak: c.peak, wins: c.stats.sngWins, week: weekWon(mine.week, mine.weekWon), last: lastWon(mine), you: true },
    ...pals
      .filter((p) => p.campaign)
      .map((p) => ({ key: p.code, name: p.name, emoji: p.emoji, chips: p.campaign!.chips, peak: p.campaign!.peak, wins: p.campaign!.wins, week: weekWon(p.campaign!.week, p.campaign!.weekWon), last: lastWon(p.campaign), pal: p })),
  ].sort((a, b) => (board === 'week' ? b.week - a.week : b.chips - a.chips));
  const champ = rows.length > 1 ? rows.reduce((a, b) => (b.last > a.last ? b : a)) : undefined;
  const crown = champ && champ.last > 0 ? champ.key : null;
  // What friends have been up to in the last three days.
  const news = pals
    .filter((p) => p.campaign?.brag && Date.now() - p.campaign.brag.at < 3 * 86_400_000)
    .sort((a, b) => b.campaign!.brag!.at - a.campaign!.brag!.at)
    .slice(0, 3);
  const quiet = pals.filter((p) => !p.campaign);

  return (
    <>
      <div className="section-row">
        <h3 className="section-head">Friends</h3>
        {pals.length > 0 && (
          <button type="button" className="section-link press" onClick={() => openSheet({ name: 'addPal' })}>
            Add
          </button>
        )}
      </div>
      {news.map((p) => (
        <p key={p.code} className="camp-brag">
          <Avatar emoji={p.emoji} size={28} />
          <span>
            <b>{p.name}</b> {bragText(p.campaign!.brag!)}
          </span>
        </p>
      ))}
      {pals.length > 0 && (
        <>
          <div className="segmented camp-board-pick" role="tablist">
            <button type="button" role="tab" aria-selected={board === 'week'} className={board === 'week' ? 'on' : ''} onClick={() => setBoard('week')}>
              This week
            </button>
            <button type="button" role="tab" aria-selected={board === 'bankroll'} className={board === 'bankroll' ? 'on' : ''} onClick={() => setBoard('bankroll')}>
              Bankroll
            </button>
          </div>
          <ol className="camp-board" aria-label={board === 'week' ? 'You and your friends by chips won this week' : 'You and your friends by bankroll'}>
            {rows.map((r, i) => (
              <li key={r.key} className={r.you ? 'you' : ''}>
                <span className="camp-rank num">{i + 1}</span>
                <Avatar emoji={r.emoji} size={40} />
                <span className="camp-who">
                  <b>
                    {r.you ? 'You' : r.name}
                    {crown === r.key && <span title="Won last week"> 👑</span>}
                  </b>
                  <small>
                    {titleOf(r.peak).emoji} {titleOf(r.peak).name} · {r.wins} {r.wins === 1 ? 'win' : 'wins'}
                  </small>
                </span>
                <b className={`camp-chips num${board === 'week' && r.week < 0 ? ' down' : ''}`}>{board === 'week' ? `${r.week < 0 ? '−' : r.week > 0 ? '+' : ''}${short(Math.abs(r.week))}` : short(r.chips)}</b>
              </li>
            ))}
          </ol>
          {board === 'week' && <p className="camp-quiet">Chips won at the tables and the wheel since Monday. It starts again every Monday; last week’s winner wears the crown.</p>}
        </>
      )}
      {quiet.length > 0 && (
        <p className="camp-quiet">
          {quiet.map((p) => p.name).join(', ')} {quiet.length === 1 ? 'hasn’t' : 'haven’t'} started the campaign yet.
        </p>
      )}
      {pals.length === 0 && (
        <section className="camp-note">
          <span aria-hidden>🤝</span>
          <div>
            <b>Race your friends</b>
            <small>Add friends by their code to see their bankrolls next to yours, and play them at campaign tables.</small>
          </div>
        </section>
      )}
      <div className="friend-actions">
        <button type="button" className="friend-play press" onClick={() => !needName() && openSheet({ name: 'campaignFriends' })}>
          <UsersIcon width={24} height={24} />
          Play with friends
        </button>
        {pals.length === 0 && (
          <button type="button" className="friend-add press" onClick={() => openSheet({ name: 'addPal' })}>
            <PlusIcon width={20} height={20} />
            Add a friend
          </button>
        )}
      </div>
      {!code ? (
        <button type="button" className="camp-share press" disabled={busy} onClick={getCode}>
          {busy ? 'Making your code…' : 'Get a friend code so friends can see your bankroll'}
        </button>
      ) : (
        <p className="camp-quiet">
          Your friend code is <b className="num">{code}</b>. Friends add you with it to see your bankroll.
        </p>
      )}
    </>
  );
}

/** One goal: its progress, and the button to collect it once it's done. */
export function GoalRow({ g, c }: { g: Goal; c: Campaign }) {
  const done = goalDone(g);
  const collected = c.claimed.includes(g.id);
  const pct = Math.min(100, (g.have / g.need) * 100);
  return (
    <div className={`goal${done && !collected ? ' ready' : ''}${collected ? ' collected' : ''}`}>
      <span className="goal-emoji" aria-hidden>
        {g.emoji}
      </span>
      <div className="goal-text">
        <b>{g.title}</b>
        <small>{g.line}</small>
        {!done && (
          <div className="bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {collected ? (
        <span className="goal-reward done">Collected</span>
      ) : done ? (
        <button type="button" className="goal-go press" onClick={(e) => claim(c, g, e)}>
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

/** What a friend's card says they did, as a line under their name. */
function bragText(b: Brag): string {
  if (b.kind === 'boss') return `knocked out ${legendById(b.where)?.short ?? 'a boss'} 💥`;
  const where = venueById(b.where)?.name ?? 'a tournament';
  return b.kind === 'draw' ? `drew a ${b.value}× prize at ${where} 🎰` : `won ${short(b.value)} at ${where} 🏆`;
}

/** A venue's boss on its card: their face and name, ticked once you've knocked them out. */
function BossTag({ id, beaten }: { id: string; beaten: boolean }) {
  const boss = legendById(id);
  if (!boss) return null;
  return (
    <span className={`tourney-boss${beaten ? ' beaten' : ''}`}>
      {boss.emoji} {boss.short}
      {beaten ? ' ✓' : ''}
    </span>
  );
}

/** Today's free spin. */
function DailySpin({ c }: { c: Campaign }) {
  const spun = c.spinDay === today();
  return (
    <button type="button" className={`spin-card press${spun ? ' spun' : ''}`} disabled={spun} onClick={() => openSheet({ name: 'dailySpin' })}>
      <span className="spin-card-wheel" aria-hidden>
        <i />
      </span>
      <span className="spin-card-text">
        <b>{spun ? 'Spun for today' : 'Free daily spin'}</b>
        <small>{spun ? 'Your next free spin comes tomorrow.' : 'Up to 5,000 chips, once a day.'}</small>
      </span>
      {!spun && <ChevronIcon width={22} height={22} />}
    </button>
  );
}

/** Today's three missions, in green at the top of the goals. */
function Missions({ c }: { c: Campaign }) {
  const day = today();
  const daily = dailyFor(c, day);
  const reward = missionReward(c);
  const claim = (id: string, e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const before = getCampaign().chips;
    const next = claimMission(getCampaign(), day, id);
    setCampaign(next);
    haptic('success');
    playSound('chips');
    confetti(undefined, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 50);
    if (next.daily?.bonus) toast(`All three done: +${n0(next.chips - before)}`, 'success');
  };
  return (
    <>
      <section className="missions" aria-label="Today’s missions">
        <div className="missions-head">
          <b>Today’s missions</b>
          <small>
            +{short(reward)} each · all three +{short(missionBonus(c))} more
          </small>
        </div>
        {daily.picks.map((id) => {
          const m = MISSIONS.find((x) => x.id === id)!;
          const have = Math.min(m.need, daily.progress[id] ?? 0);
          const done = have >= m.need;
          const got = daily.claimed.includes(id);
          return (
            <div key={id} className={`mission${got ? ' got' : done ? ' done' : ''}`}>
              <span className="mission-emoji" aria-hidden>
                {m.emoji}
              </span>
              <span className="mission-text">
                <b>{m.line}</b>
                <span className="bar">
                  <i style={{ width: `${(have / m.need) * 100}%` }} />
                </span>
              </span>
              {got ? (
                <span className="mission-state">✓</span>
              ) : done ? (
                <button type="button" className="goal-go press" onClick={(e) => claim(id, e)}>
                  +{short(reward)}
                </button>
              ) : (
                <span className="mission-state num">
                  {have}/{m.need}
                </span>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
