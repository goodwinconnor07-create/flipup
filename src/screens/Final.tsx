import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LEGENDS_ON, legendById, net, standings, type Game } from '../game';
import { finishLine } from '../game/botTalk';
import { badgeById, legendBefore, loadProgress, nextLegend, settleTable, type TableReport } from '../state/progress';
import { closeTable, dispatch, openLog, startLegend, useApp } from '../state/store';
import { shareCard } from '../ui/shareCard';
import { shareText } from './sheets/InviteSheet';
import { Avatar, PlayingCard, chips } from '../ui/components';
import { confetti, CONFETTI, haptic, reducedMotion } from '../ui/effects';
import { playSound } from '../ui/sound';
import { LegendArt } from './HomeLegends';

export function signed(n: number): string {
  return n > 0 ? `+${chips(n)}` : n < 0 ? `−${chips(-n)}` : '0';
}

/** Who's up and who's down. */
export function StandingsList({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  return (
    <ol className="standings">
      {standings(game).map((p, i) => {
        const n = net(p);
        return (
          <li key={p.id} className={`standing${p.deviceId === deviceId ? ' you' : ''}`}>
            <span className="standing-rank">{i + 1}</span>
            <Avatar emoji={p.emoji} size={40} />
            <span className="standing-name">
              <b>{p.name}</b>
              <small className="muted">{chips(p.stack)} chips</small>
            </span>
            <b className={`standing-net num ${n > 0 ? 'good' : n < 0 ? 'bad' : ''}`}>{signed(n)}</b>
          </li>
        );
      })}
    </ol>
  );
}

/** Tables whose win has been celebrated on this phone, so reopening the page stays quiet. */
const celebrated = new Set<string>();

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`;

/** True once the element has been on screen (straight away with Reduce Motion). */
function useSeen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => reducedMotion() || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** Slides and fades in as it scrolls into view. */
function Reveal({ children, className = '', delay = 0, onSeen }: { children: ReactNode; className?: string; delay?: number; onSeen?: (el: HTMLElement) => void }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const told = useRef(false);
  useEffect(() => {
    if (seen && onSeen && ref.current && !told.current) {
      told.current = true;
      onSeen(ref.current);
    }
  }, [seen, onSeen, ref]);
  return (
    <div ref={ref} className={`reveal${seen ? ' in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** A number that counts up from zero once it's on screen. */
function Big({ value, format = (n: number) => chips(n), className = '', start = true }: { value: number; format?: (n: number) => string; className?: string; start?: boolean }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  useEffect(() => {
    if (!seen || !start || reducedMotion()) {
      if (reducedMotion()) setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / 1100);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [seen, start, value]);
  return (
    <span ref={ref} className={`num ${className}`}>
      {format(shown)}
    </span>
  );
}

/** The chips line: starts at zero, draws itself as it scrolls in, and marks the high and the low. */
function Journey({ series }: { series: number[] }) {
  const [ref, seen] = useSeen<SVGSVGElement>();
  const W = 320;
  const H = 140;
  const hi = Math.max(0, ...series);
  const lo = Math.min(0, ...series);
  const span = Math.max(1, hi - lo);
  const x = (i: number) => 8 + (i / Math.max(1, series.length - 1)) * (W - 16);
  const y = (v: number) => 12 + (1 - (v - lo) / span) * (H - 24);
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const top = series.indexOf(hi);
  const bottom = series.indexOf(lo);
  return (
    <svg ref={ref} className={`journey${seen ? ' in' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your chips after each hand">
      <line x1="8" x2={W - 8} y1={y(0)} y2={y(0)} className="journey-zero" />
      <path d={d} className="journey-line" pathLength={1} />
      {hi > 0 && <circle cx={x(top)} cy={y(hi)} r="5" className="journey-hi" />}
      {lo < 0 && <circle cx={x(bottom)} cy={y(lo)} r="5" className="journey-lo" />}
    </svg>
  );
}

function Meter({ label, value, tip }: { label: string; value: number; tip: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className="meter" title={tip}>
      <span>{label}</span>
      <i>
        <b style={{ width: seen ? `${Math.round(Math.min(1, value) * 100)}%` : '0%' }} />
      </i>
      <small className="num">{Math.round(value * 100)}%</small>
    </div>
  );
}

/** One big announcement: a badge, an unlocked legend, a comeback. It pops and throws confetti when it appears. */
function Announce({ icon, title, text, tone = 'gold', burst = true, children }: { icon: ReactNode; title: string; text: string; tone?: 'gold' | 'blue' | 'green'; burst?: boolean; children?: ReactNode }) {
  return (
    <Reveal
      className={`announce announce-${tone}`}
      onSeen={(el) => {
        if (!burst) return;
        haptic('success');
        const r = el.getBoundingClientRect();
        confetti(CONFETTI.win, { x: r.left + r.width / 2, y: r.top + r.height / 3 }, 70);
      }}
    >
      <span className="announce-icon" aria-hidden>{icon}</span>
      <b className="announce-title">{title}</b>
      <span className="announce-text">{text}</span>
      {children}
    </Reveal>
  );
}

/** The end of a table: one long page that builds as you scroll. The numbers are yours, from the hands you saved. */
export function Final({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const rows = standings(game);
  const top = rows[0];
  const iWon = top?.deviceId === deviceId;
  const me = game.players.find((p) => p.deviceId === deviceId);
  const host = game.hostDeviceId === deviceId;
  const hostName = game.players.find((p) => p.deviceId === game.hostDeviceId)?.name ?? 'the host';
  const asked = !!me && !!game.again?.includes(me.id);
  const waiting = (game.again ?? []).filter((id) => game.players.some((p) => p.id === id)).length;
  const place = me ? rows.findIndex((p) => p.id === me.id) + 1 : 0;
  const myNet = me ? net(me) : 0;
  // Counted once; if this page opens again for the same table it gives back the same report.
  const [report] = useState<TableReport | null>(() => settleTable(game, deviceId));
  const stats = report?.stats ?? null;
  const progress = useMemo(() => loadProgress(), [report]);
  const legend = game.legendGame ? legendById(game.legendGame) : undefined;
  const next = report && LEGENDS_ON ? nextLegend(progress) : null;
  const [pick] = useState(() => Math.floor(Math.random() * 8));
  const myName = me?.name;
  const line = useMemo(() => {
    if (!legend || !myName) return null;
    return finishLine(legend.id, iWon ? 'finishLost' : 'finishWon', myName, pick);
  }, [legend, myName, iWon, pick]);

  useEffect(() => {
    // Once per table: coming back to a finished table doesn't throw another party.
    if (!iWon || celebrated.has(game.id)) return;
    celebrated.add(game.id);
    haptic('success');
    playSound('victory');
    confetti(CONFETTI.win, { x: innerWidth / 2, y: innerHeight * 0.25 }, 150);
  }, [iWon, game.id]);

  const headline = !top ? 'Table closed' : iWon ? 'You win!' : `${top.name} wins!`;
  const hands = stats?.hands ?? game.hand?.number ?? 0;
  const announced = report && (report.newBadges.length > 0 || report.firstBeat || report.unlocked || report.comeback || report.rival);

  const send = async () => {
    if (!me) return;
    const info = {
      headline,
      sub: `${hands} hand${hands === 1 ? '' : 's'} at FlipUp`,
      emoji: me.emoji,
      big: signed(myNet),
      stats: stats
        ? [
            { label: 'hands won', value: `${stats.won}` },
            { label: 'best pot', value: stats.bigWin ? signed(stats.bigWin.net) : '–' },
            { label: 'bluffs won', value: `${stats.bluffsWon}` },
            { label: 'style', value: stats.style.split(' ')[0] },
          ]
        : [],
    };
    if (await shareCard(info)) return;
    const where = iWon ? 'I won' : `I finished ${ordinal(place)}`;
    void shareText('FlipUp result', `${where} at FlipUp: ${signed(myNet)} chips over ${hands} hand${hands === 1 ? '' : 's'}.`, 'Result copied');
  };

  return (
    <>
      <div className="screen-body final-body">
        <section className="fin-hero">
          <div className="fin-face">
            {iWon && <span className="fin-crown" aria-hidden>👑</span>}
            <Avatar emoji={top?.emoji ?? '🏆'} size={112} className="pop" />
          </div>
          <h1 className="fin-title" aria-live="polite">{headline}</h1>
          {me && !iWon && place > 0 && <p className="fin-place">{`You finished ${ordinal(place)}`}</p>}
          <Big value={Math.abs(myNet)} format={(n) => `${myNet < 0 ? '−' : myNet > 0 ? '+' : ''}${chips(n)}`} className={`fin-big ${myNet > 0 ? 'good' : myNet < 0 ? 'bad' : ''}`} />
          <p className="fin-sub">{`chips after ${hands} hand${hands === 1 ? '' : 's'}`}</p>
          {line && legend && (
            <p className="fin-quote">
              <b>{legend.short}:</b> “{line}”
            </p>
          )}
          <span className="fin-hint" aria-hidden>Scroll ↓</span>
        </section>

        {announced && report && (
          <section className="fin-section" aria-label="What you earned">
            {report.firstBeat && report.beat && legendById(report.beat) && (
              <Announce icon="⚔️" title={`You beat ${legendById(report.beat)!.short}!`} text="Knocked out heads-up. That's a first.">
                <LegendArt legend={legendById(report.beat)!} size={56} className="announce-art" />
              </Announce>
            )}
            {report.unlocked && legendById(report.unlocked) && (
              <Announce icon="🔓" title={`${legendById(report.unlocked)!.short} is open`} text={`${legendById(report.unlocked)!.name} is next on the ladder.`} tone="blue">
                <LegendArt legend={legendById(report.unlocked)!} size={56} className="announce-art" />
              </Announce>
            )}
            {report.newBadges.map((id) => {
              const b = badgeById(id);
              return b ? <Announce key={id} icon={b.emoji} title={`Badge: ${b.name}`} text={b.text} /> : null;
            })}
            {report.comeback && <Announce icon="🎢" title="What a comeback" text={`You were down to ${Math.round((stats?.lowest ?? 0) * 100)}% of your chips and still won.`} tone="green" />}
            {report.rival && (
              <Announce
                icon={legend?.emoji ?? '⚔️'}
                title={`${legend?.short}: ${report.rival.record.w}–${report.rival.record.l}`}
                text={report.rival.record.w > report.rival.record.l ? 'You lead the series.' : report.rival.record.w < report.rival.record.l ? 'They lead the series. Rematch?' : 'All square.'}
                tone="blue"
                burst={false}
              />
            )}
          </section>
        )}

        {stats && stats.hands > 0 && (
          <section className="fin-section" aria-label="Your game in numbers">
            <h2 className="fin-h">Your game</h2>
            <div className="fin-tiles">
              <Reveal className="tile tile-wide">
                <small>Hands you won</small>
                <span className="tile-row">
                  <Big value={stats.won} className="tile-num" />
                  <span className="tile-of">of {stats.hands}</span>
                </span>
              </Reveal>
              <Reveal className="tile" delay={80}>
                <small>Biggest pot</small>
                <Big value={stats.bigWin?.net ?? 0} format={(n) => (n ? `+${chips(n)}` : '–')} className="tile-num good" />
                <em>{stats.bigWin ? `${Math.round(stats.bigWinBlinds)} big blinds` : 'No pots won'}</em>
              </Reveal>
              <Reveal className="tile" delay={160}>
                <small>Longest streak</small>
                <Big value={stats.streak} className="tile-num" />
                <em>hands in a row</em>
              </Reveal>
              <Reveal className="tile" delay={0}>
                <small>Bluffs that worked</small>
                <Big value={stats.bluffsWon} className="tile-num" />
                <em>{stats.bluffsWon === 0 ? 'none this time' : 'with nothing'}</em>
              </Reveal>
              <Reveal className="tile" delay={80}>
                <small>Showdowns won</small>
                <span className="tile-row">
                  <Big value={stats.showdownsWon} className="tile-num" />
                  <span className="tile-of">of {stats.showdowns}</span>
                </span>
              </Reveal>
              {stats.allIns > 0 && (
                <Reveal className="tile" delay={160}>
                  <small>All-ins won</small>
                  <span className="tile-row">
                    <Big value={stats.allInsWon} className="tile-num" />
                    <span className="tile-of">of {stats.allIns}</span>
                  </span>
                </Reveal>
              )}
              {stats.bestMade && (
                <Reveal className="tile tile-wide">
                  <small>Best hand you made</small>
                  <b className="tile-hand">{stats.bestMade.detail}</b>
                  <span className="tile-cards">
                    {stats.bestMade.cards.map((c) => (
                      <PlayingCard key={c} card={c} size="sm" />
                    ))}
                  </span>
                </Reveal>
              )}
            </div>
          </section>
        )}

        {stats && stats.series.length > 2 && (
          <section className="fin-section" aria-label="Your chips">
            <h2 className="fin-h">How it went</h2>
            <Reveal className="fin-card">
              <Journey series={stats.series} />
              <p className="fin-cap">
                {Math.max(...stats.series) > 0 ? `High point ${signed(Math.max(...stats.series))} after hand ${stats.series.indexOf(Math.max(...stats.series))}. ` : ''}
                {Math.min(...stats.series) < 0 ? `Low point ${signed(Math.min(...stats.series))} after hand ${stats.series.indexOf(Math.min(...stats.series))}.` : ''}
              </p>
            </Reveal>
          </section>
        )}

        {stats && stats.hands >= 5 && (
          <section className="fin-section" aria-label="Your style">
            <h2 className="fin-h">Your style</h2>
            <Reveal className="fin-card">
              <b className="fin-style">{stats.style}</b>
              <Meter label="Hands played" value={stats.vpip} tip="How often you put chips in before the flop" />
              <Meter label="Raised first" value={stats.pfr} tip="How often you raised before the flop" />
              <Meter label="Betting" value={stats.aggression} tip="Bets and raises against calls" />
              <Meter label="Folded" value={stats.foldPct} tip="How often you gave up the hand" />
            </Reveal>
          </section>
        )}

        {next && !report?.firstBeat && (
          <section className="fin-section" aria-label="Next up">
            <Reveal className="fin-card next-up">
              <LegendArt legend={next} size={48} className="announce-art" />
              <span>
                <small>Next on the ladder</small>
                <b>{next.name}</b>
                {legendBefore(next.id) && <em>{`After ${legendBefore(next.id)!.short}.`}</em>}
              </span>
              <button type="button" className="btn btn-sm btn-blue" onClick={() => startLegend(next.id)}>
                Play
              </button>
            </Reveal>
          </section>
        )}

        <section className="fin-section" aria-label="Final standings">
          <h2 className="fin-h">Final standings</h2>
          {rows.length >= 2 && (
            <ol className="podium">
              {rows.slice(0, 3).map((p, i) => (
                <li key={p.id} className={`podium-step podium-${i + 1} shown`}>
                  {i === 0 && <span className="podium-crown">👑</span>}
                  <Avatar emoji={p.emoji} size={i === 0 ? 72 : 56} />
                  <span className="podium-name">{p.deviceId === deviceId ? 'You' : p.name}</span>
                  <span className={`podium-score num ${net(p) > 0 ? 'good' : net(p) < 0 ? 'bad' : ''}`}>{signed(net(p))}</span>
                  <span className="podium-block">{i + 1}</span>
                </li>
              ))}
            </ol>
          )}
          <StandingsList game={game} />
        </section>
      </div>
      <div className="screen-foot">
        {me && (
          <>
            {host ? (
              <button type="button" className="btn btn-xl btn-blue" onClick={() => (game.legendGame ? startLegend(game.legendGame) : dispatch({ type: 'playAgain' }))}>
                {game.legendGame && report?.beat ? `Rematch ${legend?.short ?? ''}`.trim() : 'Play again'}
                {waiting > 0 ? ` · ${waiting} waiting` : ''}
              </button>
            ) : asked ? (
              <button type="button" className="btn btn-xl btn-ghost" onClick={() => dispatch({ type: 'playAgain', off: true })}>
                Waiting for {hostName} to start… (tap to cancel)
              </button>
            ) : (
              <button type="button" className="btn btn-xl btn-blue" onClick={() => dispatch({ type: 'playAgain' })}>
                Play again
              </button>
            )}
          </>
        )}
        <button type="button" className={`btn btn-xl ${me ? 'btn-ghost' : 'btn-dark'}`} onClick={closeTable}>
          Done
        </button>
        {me && (
          <button type="button" className="btn btn-link" onClick={() => void send()}>
            Share result
          </button>
        )}
        <button type="button" className="btn btn-link" onClick={openLog}>
          Hand log
        </button>
      </div>
    </>
  );
}

