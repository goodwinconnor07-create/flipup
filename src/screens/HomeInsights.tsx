import { useMemo } from 'react';
import { loadStats, type GameResult } from '../state/persist';
import { computeStats } from '../train/stats';
import { loadDrills, loadHistory, loadSummaries } from '../state/training';
import { signed } from './Final';

const tone = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : '');

/** How each table went, running total from left to right. */
function Line({ games }: { games: GameResult[] }) {
  const points = useMemo(() => {
    let total = 0;
    return [0, ...games.map((g) => (total += g.net))];
  }, [games]);
  const W = 300;
  const H = 96;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * W;
  const y = (v: number) => H - 8 - ((v - lo) / span) * (H - 16);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg className={`spark ${tone(last)}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chips won or lost, table by table" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="spark-zero" />
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="url(#spark-fill)" className="spark-area" />
      <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const when = (at: number) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function InsightsTab() {
  const stats = useMemo(loadStats, []);
  const hands = useMemo(() => computeStats(loadHistory(), loadSummaries(), loadDrills()), []);

  if (stats.tables === 0) {
    return (
      <div className="glass-card home-empty">
        <b>Nothing to show yet</b>
        <p>Finish a game and your results land here: chips won and lost, hands played and how you did.</p>
      </div>
    );
  }

  const best = stats.games.length ? Math.max(...stats.games.map((g) => g.net)) : 0;
  const recent = [...stats.games].reverse().slice(0, 5);
  return (
    <>
      <div className="glass-card insight-hero">
        <small className="eyebrow">Lifetime</small>
        <b className={`insight-net num ${tone(stats.net)}`}>{signed(stats.net)}</b>
        <span className="insight-sub">chips over {stats.tables} {stats.tables === 1 ? 'table' : 'tables'}</span>
        {stats.games.length > 1 && <Line games={stats.games} />}
      </div>
      <div className="insight-tiles">
        <div className="glass-card tile">
          <small className="eyebrow">Hands</small>
          <b className="num">{stats.hands}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">Best table</small>
          <b className={`num ${tone(best)}`}>{stats.games.length ? signed(best) : '–'}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">Win rate</small>
          <b className="num">{hands.hands > 0 ? `${Math.round((hands.wins / hands.hands) * 100)}%` : '–'}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">GTO match</small>
          <b className="num">{hands.decisions > 0 ? `${Math.round(hands.gtoPct * 100)}%` : '–'}</b>
        </div>
      </div>
      {recent.length > 0 && (
        <div className="glass-card recent">
          <small className="eyebrow">Recent tables</small>
          {recent.map((g, i) => (
            <div key={`${g.at}-${i}`} className="recent-row">
              <span>
                <b>{when(g.at)}</b>
                <small>
                  {g.players} players, {g.hands} {g.hands === 1 ? 'hand' : 'hands'}
                </small>
              </span>
              <b className={`num ${tone(g.net)}`}>{signed(g.net)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
