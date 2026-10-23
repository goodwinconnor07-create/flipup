import { REPLAY_ON } from '../../train/replay';
import { useEffect, useMemo, useState } from 'react';
import { recordNet } from '../../game';
import { listScenarios, toHandHistory } from '../../gto/api';
import type { Scenario } from '../../gto/types';
import { back, navigate, replace, toast, type TrainSection } from '../../state/store';
import { loadDrills, loadHistory, loadSummaries, type PlayedHand } from '../../state/training';
import { reviewAndSave } from '../../train/reviews';
import { drillFor, scenarioTitle } from '../../train/scenarios';
import { computeStats, type ScenarioScore } from '../../train/stats';
import { CoachSays } from '../../train/Coach';
import { greeting, trendLine } from '../../train/coach';
import { Dots, MiniCards, pct, Trend } from '../../train/widgets';
import { Spinner } from '../../ui/components';
import { ReviewActivity } from './ReviewActivity';
import { BackIcon, BookIcon, ChartIcon, ListIcon, MenuIcon, PencilIcon, ScrollIcon, TrophyIcon } from '../../ui/Icons';
import { InsightsTab } from '../HomeInsights';
import { StudyBank } from './StudyBank';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const SECTIONS: { id: TrainSection; title: string; hint: string; icon: typeof ListIcon }[] = [
  { id: 'review', title: 'Review hands', hint: 'Every decision, graded by GTO', icon: ListIcon },
  { id: 'scroll', title: 'Study bank', hint: 'Scroll hands you saved', icon: ScrollIcon },
  { id: 'insights', title: 'Insights', hint: 'How your tables and hands are going', icon: TrophyIcon },
  { id: 'library', title: 'Poker library', hint: 'Practise spot by spot', icon: BookIcon },
  { id: 'stats', title: 'Your stats', hint: 'Strengths and leaks', icon: ChartIcon },
  { id: 'custom', title: 'Custom hand', hint: 'Enter any hand, see GTO', icon: PencilIcon },
];

/** The training hub: a sidebar of the four tools, with the chosen one filling the screen. */
export function Train({ section = 'review' }: { section?: TrainSection }) {
  const [drawer, setDrawer] = useState(false);
  const current = SECTIONS.find((s) => s.id === section)!;
  const go = (id: TrainSection) => {
    setDrawer(false);
    if (id !== section) replace({ name: 'train', section: id });
  };

  return (
    <div className="screen train">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">{current.title}</div>
        <button type="button" className="icon-btn press" aria-label="Training menu" aria-expanded={drawer} onClick={() => setDrawer(true)}>
          <MenuIcon />
        </button>
      </div>
      <div className="screen-body">
        {section === 'review' && <ReviewList />}
        {section === 'scroll' && <StudyBank />}
        {section === 'insights' && <InsightsTab />}
        {section === 'library' && <Library />}
        {section === 'stats' && <StatsView />}
        {section === 'custom' && <CustomIntro />}
      </div>
      {drawer && (
        <>
          <div className="train-drawer-backdrop" onClick={() => setDrawer(false)} />
          <nav className="train-drawer" aria-label="Training">
            <h2 className="h2">Train</h2>
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className={`drawer-item press${s.id === section ? ' on' : ''}`} onClick={() => go(s.id)}>
                <s.icon width={22} height={22} />
                <span>
                  {s.title}
                  <small>{s.hint}</small>
                </span>
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

// ── Review ──────────────────────────────────────────────────────────────────

function when(at: number): string {
  const d = new Date(at);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ReviewList() {
  const [hands] = useState(() => [...loadHistory()].reverse());
  const [summaries, setSummaries] = useState(loadSummaries);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [only, setOnly] = useState<'all' | 'mistakes'>('all');
  const unreviewed = hands.filter((h) => !summaries[h.key]).slice(0, 20);
  const queue = useMemo(() => unreviewed.map((h) => toHandHistory(h.record)), [unreviewed.map((h) => h.key).join('|')]);
  const working = new Set(busy ? unreviewed.map((h) => h.key) : []);
  const withMistakes = (key: string) => summaries[key]?.decisions.some((d) => d.colour === 'red' || d.colour === 'yellow') ?? false;
  const shown = only === 'mistakes' ? hands.filter((h) => withMistakes(h.key)) : hands;

  const reviewRecent = async () => {
    if (busy || unreviewed.length === 0) return;
    setDone(0);
    setBusy(true);
    try {
      await reviewAndSave(unreviewed, (d) => setDone(d));
      setSummaries(loadSummaries());
      toast('Reviews ready.', 'success');
    } catch (e) {
      setSummaries(loadSummaries());
      toast(e instanceof Error ? e.message : 'The review failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (hands.length === 0) {
    return (
      <div className="t-empty">
        <h2 className="h2">No hands yet</h2>
        <p className="muted">Play a few hands with friends or the bots. Every hand you're dealt is saved here, ready for a GTO review.</p>
        <button type="button" className="btn btn-outline" onClick={() => replace({ name: 'train', section: 'custom' })}>
          Or enter a hand yourself
        </button>
      </div>
    );
  }
  return (
    <>
      <CoachSays
        lines={[
          unreviewed.length > 0
            ? `I haven't looked at ${unreviewed.length === 1 ? 'one of your hands' : `${unreviewed.length} of your hands`} yet. Tap one to watch it back, or let me go through them.`
            : 'Tap a hand to watch it back. I will stop at the moves worth a look.',
        ]}
        status={
          <>
            <b className="c-green">Green</b> is good, <b className="c-yellow">yellow</b> a close call, <b className="c-red">red</b> costly
          </>
        }
      />
      {unreviewed.length > 0 && (
        busy ? (
          <ReviewActivity hands={queue} done={done} title={`Reviewing ${queue.length} hand${queue.length === 1 ? '' : 's'}`} />
        ) : (
          <button type="button" className="btn btn-dark" onClick={() => void reviewRecent()}>
            {`Review my last ${unreviewed.length} hand${unreviewed.length === 1 ? '' : 's'}`}
          </button>
        )
      )}
      {hands.some((h) => withMistakes(h.key)) && (
        <div className="chips-row" role="group" aria-label="Filter hands">
          <button type="button" className={`chip-btn press${only === 'all' ? ' on' : ''}`} aria-pressed={only === 'all'} onClick={() => setOnly('all')}>
            All hands
          </button>
          <button type="button" className={`chip-btn press${only === 'mistakes' ? ' on' : ''}`} aria-pressed={only === 'mistakes'} onClick={() => setOnly('mistakes')}>
            With mistakes
          </button>
        </div>
      )}
      <div className="t-list">
        {shown.map((h) => (
          <HandRow key={h.key} hand={h} colours={summaries[h.key]?.decisions.map((d) => d.colour)} working={working.has(h.key)} />
        ))}
      </div>
    </>
  );
}

function HandRow({ hand, colours, working = false }: { hand: PlayedHand; colours?: ('green' | 'yellow' | 'red' | null)[]; working?: boolean }) {
  const r = hand.record;
  const net = recordNet(r, hand.heroId);
  const mine = r.holes[hand.heroId] ?? [];
  return (
    <div className="t-row-wrap">
      <button type="button" className="t-row press" onClick={() => navigate({ name: 'lesson', key: hand.key })}>
        <MiniCards cards={mine} />
        <span className="t-row-main">
          <b>
            Hand #{r.number} · {r.players.length} players
          </b>
          <small>{when(r.at)}</small>
          {colours ? <Dots colours={colours.filter((c) => c)} /> : <small>{working ? 'Coach is looking at it…' : 'Not reviewed yet'}</small>}
        </span>
        <b className={`num ${net > 0 ? 'good' : net < 0 ? 'bad' : ''}`}>
          {net > 0 ? '+' : ''}
          {net}
        </b>
      </button>
      {REPLAY_ON && (
        <button type="button" className="btn btn-sm btn-dark t-replay" aria-label={`Replay hand ${r.number}`} onClick={() => navigate({ name: 'replay', key: hand.key })}>
          Replay
        </button>
      )}
    </div>
  );
}

// ── Library ─────────────────────────────────────────────────────────────────

/** Preflop drills come from the solved preflop game, so they're listed even before the service answers. */
const PREFLOP_FALLBACK: Scenario[] = ['rfi', 'vs_open_ip', 'vs_open_blinds', 'vs_3bet', 'vs_4bet', 'vs_limp'].map((id) => ({
  id,
  group: 'Preflop',
  title: scenarioTitle(id),
  description: '',
  available: true,
  spots: null,
}));

function Library() {
  const [list, setList] = useState<Scenario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drills] = useState(loadDrills);
  useEffect(() => {
    let live = true;
    listScenarios()
      .then((l) => live && setList(l))
      .catch((e: unknown) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : 'Library unavailable.');
        setList(PREFLOP_FALLBACK);
      });
    return () => {
      live = false;
    };
  }, []);
  if (!list) return <Spinner label="Opening the library…" />;
  const groups = [...new Set(list.map((s) => s.group))];
  return (
    <>
      <p className="muted">
        Each drill deals you a hand in a classic spot, asks what you'd do, then shows GTO's answer and the EV of every option.
      </p>
      {error && <p className="note">{error}</p>}
      {groups.map((g) => (
        <section key={g} className="t-list">
          <p className="section-title">{g}</p>
          {list
            .filter((s) => s.group === g)
            .map((s) => {
              const d = drills[s.id];
              return (
                <button key={s.id} type="button" className="t-row press" disabled={!s.available} onClick={() => navigate({ name: 'drill', scenario: s.id })}>
                  <span className="t-row-main">
                    <b>{s.title}</b>
                    <small>{s.available ? s.description : 'Coming soon: still being solved.'}</small>
                  </span>
                  {d && d.attempts > 0 && <span className="grade-pill">{pct((d.green + 0.5 * d.yellow) / d.attempts)}</span>}
                </button>
              );
            })}
        </section>
      ))}
    </>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────

function StatsView() {
  const stats = useMemo(() => computeStats(loadHistory(), loadSummaries(), loadDrills()), []);
  if (stats.hands === 0 && stats.scenarios.length === 0) {
    return (
      <div className="t-empty">
        <h2 className="h2">No stats yet</h2>
        <p className="muted">Play some hands and review them, or try a few drills from the library. Your strengths and leaks show up here.</p>
      </div>
    );
  }
  const winRate = stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0;
  const tiles: [string, string, string?][] = [
    ['Hands', String(stats.hands)],
    ['Won', String(stats.wins)],
    ['Lost', String(stats.losses)],
    ['Win rate', `${stats.bbPer100 >= 0 ? '+' : ''}${stats.bbPer100.toFixed(1)}`, 'bb/100'],
    ['Hands won', pct(winRate), 'of hands with a result'],
    ['Net', `${stats.netBb >= 0 ? '+' : ''}${stats.netBb.toFixed(1)}bb`],
    ['Pots played', pct(stats.vpip), 'VPIP'],
    ['Raised first', pct(stats.pfr), 'PFR'],
    ['3-bet', pct(stats.threeBet)],
    ['C-bet', pct(stats.cbet)],
    ['Fold to c-bet', pct(stats.foldToCbet)],
    ['Showdowns', pct(stats.wtsd), 'WTSD'],
    ['Won at showdown', pct(stats.wsd), 'W$SD'],
    ['Aggression', stats.aggression.toFixed(1), 'AF'],
    ['EV lost', stats.evLossPer100.toFixed(1), 'bb/100 vs GTO'],
  ];
  return (
    <>
      <CoachSays
        lines={[
          trendLine(stats.trend) ??
            greeting({ toReview: 0, decisions: stats.decisions, gtoPct: stats.gtoPct, weakest: stats.weaknesses[0] ?? null }),
        ]}
      />
      <section className="stat-hero">
        <small className="section-title">GTO score</small>
        <div className="big-num">{stats.decisions ? pct(stats.gtoPct) : '–'}</div>
        <p className="muted">
          {stats.decisions
            ? `${plural(stats.decisions, 'decision')} reviewed across ${plural(stats.reviewed, 'hand')}.`
            : 'Review some hands to get your GTO score.'}
        </p>
        {stats.decisions > 0 && (
          <div className="meter" aria-hidden>
            <span className="green" style={{ width: pct(stats.gtoPct, 1) }} />
            <span className="yellow" style={{ width: pct(stats.yellowPct, 1) }} />
            <span className="red" style={{ width: pct(stats.redPct, 1) }} />
          </div>
        )}
      </section>

      {stats.trend.length >= 3 && (
        <section>
          <p className="section-title">Your last {stats.trend.length} hands</p>
          <Trend points={stats.trend.map((t) => t.score)} />
        </section>
      )}

      {stats.weaknesses.length > 0 && (
        <section className="t-list">
          <p className="section-title">Work on these</p>
          {stats.weaknesses.map((s) => (
            <FocusCard key={s.id} s={s} kind="weak" />
          ))}
        </section>
      )}
      {stats.strengths.length > 0 && (
        <section className="t-list">
          <p className="section-title">Your strengths</p>
          {stats.strengths.map((s) => (
            <FocusCard key={s.id} s={s} kind="strong" />
          ))}
        </section>
      )}

      <section>
        <p className="section-title">Numbers</p>
        <div className="stat-grid">
          {tiles.map(([k, v, sub]) => (
            <div key={k} className="stat">
              <small>{k}</small>
              <b className="num">{v}</b>
              {sub && <small className="muted">{sub}</small>}
            </div>
          ))}
        </div>
      </section>

      {Object.keys(stats.byStreet).length > 0 && (
        <section className="t-list">
          <p className="section-title">By street</p>
          {['preflop', 'flop', 'turn', 'river']
            .filter((s) => stats.byStreet[s])
            .map((s) => (
              <div key={s} className="t-row">
                <span className="t-row-main">
                  <b>{s.charAt(0).toUpperCase() + s.slice(1)}</b>
                  <small>{plural(stats.byStreet[s].decisions, 'decision')}</small>
                </span>
                <b className="num">{pct(stats.byStreet[s].gtoPct)}</b>
              </div>
            ))}
        </section>
      )}

      {stats.scenarios.length > 0 && (
        <section className="t-list">
          <p className="section-title">Every spot</p>
          {[...stats.scenarios]
            .sort((a, b) => b.samples - a.samples)
            .map((s) => {
              const drill = drillFor(s.id);
              return (
                <button key={s.id} type="button" className="t-row press" disabled={!drill} onClick={() => drill && navigate({ name: 'drill', scenario: drill })}>
                  <span className="t-row-main">
                    <b>{s.title}</b>
                    <small>{plural(s.samples, 'decision')}</small>
                    <span className="meter" aria-hidden>
                      <span className="green" style={{ width: pct(s.green / s.samples, 1) }} />
                      <span className="yellow" style={{ width: pct(s.yellow / s.samples, 1) }} />
                      <span className="red" style={{ width: pct(s.red / s.samples, 1) }} />
                    </span>
                  </span>
                  <b className="num">{pct(s.score)}</b>
                </button>
              );
            })}
        </section>
      )}
    </>
  );
}

function FocusCard({ s, kind }: { s: ScenarioScore; kind: 'weak' | 'strong' }) {
  const drill = drillFor(s.id);
  return (
    <div className={`focus-card ${kind}`}>
      <span className="t-row-main">
        <b>{s.title}</b>
        <small>
          {pct(s.score)} GTO over {plural(s.samples, 'decision')}{s.evLoss > 0 ? ` · ${s.evLoss.toFixed(1)}bb lost` : ''}
        </small>
      </span>
      {drill && (
        <button type="button" className="btn btn-sm btn-dark" onClick={() => navigate({ name: 'drill', scenario: drill })}>
          Practise
        </button>
      )}
    </div>
  );
}

// ── Custom ──────────────────────────────────────────────────────────────────

function CustomIntro() {
  return (
    <div className="t-empty">
      <h2 className="h2">Any hand, solved</h2>
      <p className="muted">
        Set the players, stacks and blinds, pick the cards, and enter the action street by street. GTO shows how often to fold, call, bet or raise with
        every hand on each street, and grades the moves you entered.
      </p>
      <button type="button" className="btn btn-dark btn-xl" onClick={() => navigate({ name: 'custom' })}>
        Enter a hand
      </button>
    </div>
  );
}
