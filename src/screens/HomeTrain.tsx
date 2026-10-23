import { useMemo } from 'react';
import { navigate, type TrainSection } from '../state/store';
import { loadDrills, loadHistory, loadSummaries } from '../state/training';
import { CoachSays } from '../train/Coach';
import { greeting } from '../train/coach';
import { computeStats } from '../train/stats';
import { BookIcon, ChartIcon, ListIcon, PencilIcon, ScrollIcon, TrophyIcon } from '../ui/Icons';

const TILES: { id: TrainSection; title: string; hint: string; Icon: typeof ListIcon }[] = [
  { id: 'review', title: 'Review hands', hint: 'Graded by GTO', Icon: ListIcon },
  { id: 'scroll', title: 'Study bank', hint: 'Hands you saved', Icon: ScrollIcon },
  { id: 'insights', title: 'Insights', hint: 'Tables and hands', Icon: TrophyIcon },
  { id: 'library', title: 'Poker library', hint: 'Spot by spot', Icon: BookIcon },
  { id: 'stats', title: 'Your stats', hint: 'Strengths and leaks', Icon: ChartIcon },
  { id: 'custom', title: 'Custom hand', hint: 'See GTO for any hand', Icon: PencilIcon },
];

/** A ring that fills to the share of decisions that matched GTO. */
function Ring({ value }: { value: number | null }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <svg className="ring" viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="40" r={R} className="ring-track" />
      <circle
        cx="40"
        cy="40"
        r={R}
        className="ring-fill"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - (value ?? 0))}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="46" textAnchor="middle" className="ring-text">
        {value === null ? '–' : `${Math.round(value * 100)}%`}
      </text>
    </svg>
  );
}

export function TrainTab() {
  const { stats, toReview } = useMemo(() => {
    const history = loadHistory();
    const reviews = loadSummaries();
    return {
      stats: computeStats(history, reviews, loadDrills()),
      toReview: history.filter((h) => !reviews[h.key]).length,
    };
  }, []);
  const go = (section: TrainSection) => navigate({ name: 'train', section });

  return (
    <>
      <div className="glass-card coach-card">
        <CoachSays
          lines={[greeting({ toReview, decisions: stats.decisions, gtoPct: stats.gtoPct, weakest: stats.weaknesses[0] ?? null })]}
        />
      </div>
      <button type="button" className="glass-card train-hero press" onClick={() => go(toReview > 0 ? 'review' : 'library')}>
        <Ring value={stats.decisions > 0 ? stats.gtoPct : null} />
        <span className="train-hero-text">
          <small className="eyebrow">{toReview > 0 ? 'Up next' : 'Keep sharp'}</small>
          <b>{toReview > 0 ? `${toReview} ${toReview === 1 ? 'hand' : 'hands'} to review` : 'Practise a spot'}</b>
          <span>{stats.decisions > 0 ? 'Of your decisions matched GTO' : 'Your GTO match shows up after a review'}</span>
        </span>
      </button>
      <div className="train-tiles">
        {TILES.map(({ id, title, hint, Icon }) => (
          <button key={id} type="button" className="glass-card tile train-tile press" onClick={() => go(id)}>
            <Icon width={26} height={26} />
            <b>{title}</b>
            <small>{hint}</small>
            {id === 'review' && toReview > 0 && <i className="tile-badge">{toReview}</i>}
          </button>
        ))}
      </div>
    </>
  );
}
