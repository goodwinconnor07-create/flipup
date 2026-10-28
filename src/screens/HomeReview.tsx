import { useMemo } from 'react';
import { navigate, type TrainSection } from '../state/store';
import { loadDrills, loadHistory, loadSummaries, type PlayedHand, type ReviewSummary } from '../state/training';
import { computeStats } from '../train/stats';
import { PROGRESS_TITLE } from '../state/progress';
import { loadTwinGames } from '../state/twinGames';
import { BookmarkIcon, ChartIcon, ChevronIcon, ListIcon, SparkIcon, TrophyIcon } from '../ui/Icons';
import { openTwinReport } from './train/TwinReport';

/** The hands from the table you played most recently, and how many of them the coach hasn't seen. */
export function lastGameHands(history: PlayedHand[], reviews: Record<string, ReviewSummary>): { total: number; waiting: number } {
  const last = history[history.length - 1];
  if (!last) return { total: 0, waiting: 0 };
  const table = last.key.slice(0, last.key.lastIndexOf('#'));
  const hands = history.filter((h) => h.key.startsWith(`${table}#`));
  return { total: hands.length, waiting: hands.filter((h) => !reviews[h.key]).length };
}

const ROWS: { id: TrainSection; title: string; Icon: typeof ListIcon; colour: string }[] = [
  { id: 'review', title: 'Review hands', Icon: ListIcon, colour: 'var(--blue)' },
  { id: 'stats', title: 'Your stats', Icon: ChartIcon, colour: 'var(--green)' },
  { id: 'insights', title: 'Insights', Icon: TrophyIcon, colour: 'var(--gold)' },
  { id: 'scroll', title: 'Study bank', Icon: BookmarkIcon, colour: 'var(--red)' },
];

/** A ring that fills to the share of decisions that matched GTO. */
function Ring({ value }: { value: number }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <svg className="ring" viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="40" r={R} className="ring-track" />
      <circle cx="40" cy="40" r={R} className="ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - value)} transform="rotate(-90 40 40)" />
      <text x="40" y="46" textAnchor="middle" className="ring-text">
        {`${Math.round(value * 100)}%`}
      </text>
    </svg>
  );
}

/** Your own hands, checked against GTO: the match ring and the review, stats and insights rows. It sits at the bottom of Learn. */
export function YourPlay() {
  const { stats, toReview, lastGame } = useMemo(() => {
    const history = loadHistory();
    const reviews = loadSummaries();
    return {
      stats: computeStats(history, reviews, loadDrills()),
      toReview: history.filter((h) => !reviews[h.key]).length,
      lastGame: lastGameHands(history, reviews),
    };
  }, []);
  const twinGames = useMemo(() => loadTwinGames().some((g) => !g.friend && g.hands.length > 0), []);
  const go = (section: TrainSection) => navigate({ name: 'train', section });
  // The coach names the count; the row only shows one when it's a different number.
  const said = lastGame.waiting > 0 ? lastGame.waiting : toReview;

  return (
    <>
      <p className="section-title">Your hands</p>
      {stats.decisions > 0 && (
        <button type="button" className="glass-card train-hero press" onClick={() => go('stats')}>
          <Ring value={stats.gtoPct} />
          <span className="train-hero-text">
            <small className="eyebrow">Your GTO match</small>
            <b>{`${Math.round(stats.gtoPct * 100)}% of your moves`}</b>
            <span>
              Across {stats.decisions} graded {stats.decisions === 1 ? 'move' : 'moves'}
            </span>
          </span>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
      )}
      <div className="group">
        {ROWS.map(({ id, title, Icon, colour }) => (
          <button key={id} type="button" className="group-row press" onClick={() => go(id)}>
            <span className="gr-icon" style={{ background: colour }}>
              <Icon />
            </span>
            <span className="gr-text">{title}</span>
            {id === 'review' && toReview > 0 && toReview !== said && <small className="gr-count num">{toReview}</small>}
            <ChevronIcon className="gr-chev" width={16} height={16} />
          </button>
        ))}
        <button type="button" className="group-row press" onClick={() => navigate({ name: 'progress' })}>
          <span className="gr-icon gr-icon-yellow">
            <TrophyIcon />
          </span>
          <span className="gr-text">{PROGRESS_TITLE}</span>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
        {twinGames && (
          <button type="button" className="group-row press" onClick={openTwinReport}>
            <span className="gr-icon" style={{ background: 'var(--pink)' }}>
              <SparkIcon />
            </span>
            <span className="gr-text">Your twin</span>
            <ChevronIcon className="gr-chev" width={16} height={16} />
          </button>
        )}
      </div>
    </>
  );
}
