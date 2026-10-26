import { useMemo } from 'react';
import { navigate, type TrainSection } from '../state/store';
import { loadDrills, loadHistory, loadSummaries, type PlayedHand, type ReviewSummary } from '../state/training';
import { CoachSays } from '../train/Coach';
import { greeting } from '../train/coach';
import { drillFor } from '../train/scenarios';
import { computeStats } from '../train/stats';
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

// The coach types its greeting once per visit to the app, not every time the tab opens.
let greeted = false;

/** The Review tab: the coach's one next step, how your play matches GTO, and your own hands. */
export function ReviewTab() {
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
  const weakest = stats.weaknesses[0] ?? null;
  const drill = weakest ? drillFor(weakest.id) : null;
  const action: { label: string; run: () => void } | null =
    toReview > 0
      ? { label: lastGame.waiting > 0 ? 'Review last game' : 'Review hands', run: () => go('review') }
      : drill
        ? { label: `Practise ${weakest!.title.toLowerCase()}`, run: () => navigate({ name: 'drill', scenario: drill }) }
        : null;
  // The coach names the count; the row only shows one when it's a different number.
  const said = lastGame.waiting > 0 ? lastGame.waiting : toReview;
  const quick = greeted;
  greeted = true;

  return (
    <>
      <CoachSays
        quick={quick}
        lines={[greeting({ toReview, lastGame: lastGame.waiting, decisions: stats.decisions, gtoPct: stats.gtoPct, weakest })]}
      >
        {action && (
          <button type="button" className="btn btn-sm btn-blue coach-cta" onClick={action.run}>
            {action.label}
          </button>
        )}
      </CoachSays>
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
          <span className="gr-icon" style={{ background: 'var(--violet)' }}>
            <TrophyIcon />
          </span>
          <span className="gr-text">Goals and badges</span>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
        {twinGames && (
          <button type="button" className="group-row press" onClick={openTwinReport}>
            <span className="gr-icon" style={{ background: 'var(--indigo)' }}>
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
