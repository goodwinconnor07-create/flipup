import { useMemo, useState } from 'react';
import { dealCard } from '../../scroll/deal';
import { loadScrollHands, type ScrollHand } from '../../scroll/save';
import { THEMES } from '../../scroll/types';
import { loadSummaries } from '../../state/training';
import { navigate } from '../../state/store';
import { CoachSays } from '../../train/Coach';
import { GRADE_WORD, scrollLines } from '../../train/coach';
import { GradePill, MiniCards, splitCards, streetName } from '../../train/widgets';
import { Stars } from '../scroll/Cards';

const when = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
  ' · ' +
  new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

type Filter = 'all' | 'missed' | 'stars';

/** The cards you've played in Scroll. A tap opens the coach's recap; a full hand can be sent for the numbers. */
export function ScrollHands() {
  const [hands] = useState(() => [...loadScrollHands()].reverse());
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const reviewed = useMemo(() => loadSummaries(), []);
  const shown = hands.filter((h) => (filter === 'missed' ? !h.outcome.passed : filter === 'stars' ? h.outcome.stars === 3 : true));

  if (hands.length === 0) {
    return (
      <div className="t-empty">
        <h2 className="h2">No cards yet</h2>
        <p className="muted">
          Every card you play in Scroll lands here, with the coach's recap. You can send a whole hand for the full numbers whenever you
          like.
        </p>
      </div>
    );
  }
  return (
    <>
      <CoachSays
        lines={[
          'Here are the cards you played. Tap one for my recap. For the full numbers on a whole hand, tap "Run the numbers" inside it.',
        ]}
      />
      <div className="chips-row" role="group" aria-label="Filter cards">
        {(
          [
            ['all', 'All cards'],
            ['missed', 'Missed'],
            ['stars', 'Three stars'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip-btn press${filter === id ? ' on' : ''}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="t-list">
        {shown.map((h) => (
          <Row
            key={h.key}
            hand={h}
            open={open === h.key}
            done={!!reviewed[h.key]}
            onToggle={() => setOpen(open === h.key ? null : h.key)}
          />
        ))}
        {shown.length === 0 && <p className="muted">Nothing here yet.</p>}
      </div>
    </>
  );
}

function Row({ hand, open, done, onToggle }: { hand: ScrollHand; open: boolean; done: boolean; onToggle: () => void }) {
  const cards = splitCards(hand.decisions[0]?.hand);
  const dealt = useMemo(() => dealCard(hand.ref), [hand.ref.id, hand.ref.seed]);
  const lines = useMemo(
    () => scrollLines(dealt.template, hand.decisions, hand.outcome, dealt.bots.length === 1 ? { style: dealt.bots[0].style } : null),
    [hand],
  );
  return (
    <div className="sh-item">
      <div className="t-row-wrap">
        <button type="button" className="t-row press" aria-expanded={open} onClick={onToggle}>
          <MiniCards cards={cards} />
          <span className="t-row-main">
            <b>{hand.title}</b>
            <small>
              {THEMES[hand.theme].title} · {when(hand.at)}
            </small>
          </span>
          <span className="sh-row-end">
            <GradePill colour={hand.outcome.passed ? 'green' : 'red'} label={hand.outcome.passed ? 'Passed' : 'Missed'} />
            <Stars n={hand.outcome.stars} />
          </span>
        </button>
      </div>
      {open && (
        <div className="sh-detail">
          <CoachSays lines={lines} quick compact />
          <div className="result-moves">
            {hand.decisions.map((d, i) => (
              <span key={i} className="result-move">
                <small>{streetName(d.street)}</small>
                <GradePill colour={d.grade} label={GRADE_WORD[d.grade]} />
              </span>
            ))}
          </div>
          {hand.record ? (
            <button type="button" className="btn btn-sm btn-dark" onClick={() => navigate({ name: 'lesson', key: hand.key })}>
              {done ? 'Open the numbers' : 'Run the numbers'}
            </button>
          ) : (
            <small className="muted">A quick spot stops at your move, so it is graded on your phone only.</small>
          )}
        </div>
      )}
    </div>
  );
}
