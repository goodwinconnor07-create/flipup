import { REPLAY_ON } from '../train/replay';
import { useMemo } from 'react';
import { loadFriend } from '../state/friends';
import { loadStats } from '../state/persist';
import { computeStats } from '../train/stats';
import { loadDrills, loadHistory, loadSummaries, type PlayedHand } from '../state/training';
import { recordNet } from '../game';
import { CoachSays } from '../train/Coach';
import { trendLine } from '../train/coach';
import { MiniCards, Trend } from '../train/widgets';
import { navigate } from '../state/store';
import { openTwinReport } from './train/TwinReport';

/** 1st, 2nd, 3rd, 4th… */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const when = (at: number) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });


/** The last few hands you were dealt, each one a tap from its replay. */
function RecentHands({ hands }: { hands: PlayedHand[] }) {
  if (hands.length === 0 || !REPLAY_ON) return null;
  return (
    <div className="glass-card recent">
      <small className="eyebrow">Recent hands</small>
      {hands.map((h) => {
        const net = recordNet(h.record, h.heroId);
        return (
          <button key={h.key} type="button" className="recent-row hand-replay press" onClick={() => navigate({ name: 'replay', key: h.key })} aria-label={`Replay hand ${h.record.number}`}>
            <MiniCards cards={h.record.holes[h.heroId] ?? []} />
            <span>
              <b>Hand #{h.record.number}</b>
              <small>{when(h.record.at)} · replay</small>
            </span>
            {net > 0 && <b className="good">Won</b>}
          </button>
        );
      })}
    </div>
  );
}

export function InsightsTab() {
  const stats = useMemo(loadStats, []);
  const history = useMemo(loadHistory, []);
  const hands = useMemo(() => computeStats(history, loadSummaries(), loadDrills()), [history]);
  const lastHands = useMemo(() => [...history].reverse().slice(0, 5), [history]);

  if (stats.tables === 0 && lastHands.length > 0) return <RecentHands hands={lastHands} />;
  if (stats.tables === 0) {
    return (
      <div className="glass-card home-empty">
        <b>Nothing to show yet</b>
        <p>Finish a game and your results land here: where you finished, hands played and how you did.</p>
      </div>
    );
  }

  // Chips reset every game, so tables are measured by where you finished, not what you won.
  const placed = stats.games.filter((g) => g.place != null);
  const wins = placed.filter((g) => g.place === 1).length;
  const recent = [...stats.games].reverse().slice(0, 5);
  const twinGames = placed.filter((g) => g.twin && !g.friend);
  return (
    <>
      <div className="glass-card insight-hero">
        <small className="eyebrow">Lifetime</small>
        <b className="insight-net num">{stats.tables}</b>
        <span className="insight-sub">
          {stats.tables === 1 ? 'table' : 'tables'} played, {stats.hands} {stats.hands === 1 ? 'hand' : 'hands'}
        </span>
      </div>
      <div className="insight-tiles">
        <div className="glass-card tile">
          <small className="eyebrow">Tables won</small>
          <b className="num">{placed.length ? wins : '–'}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">Best finish</small>
          <b className="num">{placed.length ? ordinal(Math.min(...placed.map((g) => g.place!))) : '–'}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">Hands won</small>
          <b className="num">{hands.hands > 0 ? `${Math.round((hands.wins / hands.hands) * 100)}%` : '–'}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">GTO match</small>
          <b className="num">{hands.decisions > 0 ? `${Math.round(hands.gtoPct * 100)}%` : '–'}</b>
        </div>
      </div>
      {hands.trend.length >= 4 && (
        <div className="glass-card coach-card">
          <CoachSays lines={[trendLine(hands.trend) ?? '']} />
          <Trend points={hands.trend.map((t) => t.score)} />
        </div>
      )}
      {twinGames.length > 0 && (
        <button type="button" className="glass-card tile twin-insight press" onClick={openTwinReport}>
          <small className="eyebrow">Against your twin</small>
          <b className="num">{`${twinGames.filter((g) => g.place === 1).length} of ${twinGames.length}`}</b>
          <span className="insight-sub">{twinGames.length === 1 ? 'game won. See what it found.' : 'games won. See what it found.'}</span>
        </button>
      )}
      <RecentHands hands={lastHands} />
      {recent.length > 0 && (
        <div className="glass-card recent">
          <small className="eyebrow">Recent tables</small>
          {recent.map((g, i) => (
            <div key={`${g.at}-${i}`} className="recent-row">
              <span>
                <b>{when(g.at)}</b>
                <small>
                  {g.friend ? `${loadFriend(g.friend)?.name ?? 'A friend'}'s twin` : g.twin ? 'Your twin' : `${g.players} players`}, {g.hands} {g.hands === 1 ? 'hand' : 'hands'}
                </small>
              </span>
              {g.place != null && <b className="num">{`${ordinal(g.place)} of ${g.players}`}</b>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
