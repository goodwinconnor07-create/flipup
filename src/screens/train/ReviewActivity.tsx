import { useEffect, useMemo, useRef } from 'react';
import type { HandHistory } from '../../gto/types';
import { formatClock, formatLeft, isFirstAtSize, planSeconds, planSteps, recordTiming, useReviewClock } from '../../train/progress';

/**
 * What the coach is doing while it reviews, line by line, with the time so far and a guess at the time left.
 * `done` is how many hands the service has finished (a fraction is fine); the steps inside a hand are paced estimates.
 */
export function ReviewActivity({ hands, done, title }: { hands: HandHistory[]; done: number; title: string }) {
  const { elapsed, handElapsed, finished } = useReviewClock(done, hands.length);
  const plans = useMemo(() => hands.map(planSteps), [hands]);
  const current = Math.min(finished, hands.length - 1);
  const steps = plans[current];

  // Teach the estimator: when a hand finishes, remember how long it took.
  const lastNoted = useRef(0);
  const handStart = useRef(Date.now());
  useEffect(() => {
    if (finished > lastNoted.current) {
      for (let i = lastNoted.current; i < finished; i++) {
        if (i === finished - 1) recordTiming(hands[i], (Date.now() - handStart.current) / 1000);
      }
      lastNoted.current = finished;
      handStart.current = Date.now();
    }
  }, [finished, hands]);

  const handTotal = planSeconds(steps);
  // Which step we're on: by the clock, but never on the last one until the service says the hand is done.
  let active = steps.length - 1;
  let acc = 0;
  for (let i = 0; i < steps.length - 1; i++) {
    acc += steps[i].seconds;
    if (handElapsed < acc) {
      active = i;
      break;
    }
  }
  const overrun = handElapsed > handTotal * 1.25 && handElapsed > handTotal + 6;
  const leftThisHand = Math.max(overrun ? 5 : 2, handTotal - handElapsed);
  const leftOthers = plans.slice(current + 1).reduce((a, p) => a + planSeconds(p), 0);
  const left = leftThisHand + leftOthers;
  const within = Math.min(0.97, handElapsed / Math.max(1, handTotal));
  const fraction = Math.min(0.99, (finished + within) / hands.length);
  const first = isFirstAtSize(hands[current]);

  return (
    <section className="activity" role="status" aria-live="polite" aria-label={title}>
      <header className="activity-head">
        <span className="spinner" aria-hidden />
        <b>{title}</b>
        <span className="activity-clock num">{formatClock(elapsed)}</span>
      </header>
      <div className="activity-bar" aria-hidden>
        <span style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <p className="activity-eta">
        {overrun ? 'Taking longer than usual. ' : ''}
        {hands.length > 1 && `Hand ${Math.min(current + 1, hands.length)} of ${hands.length} · `}
        {formatLeft(left)} left
      </p>
      <ol className="activity-steps">
        {steps.map((s, i) => {
          const state = i < active ? 'done' : i === active ? 'now' : 'next';
          return (
            <li key={s.id} className={`step ${state}`}>
              <span className="step-mark" aria-hidden>
                {state === 'done' ? '✓' : state === 'now' ? '›' : '·'}
              </span>
              <span className="step-text">
                {s.label}
                {state === 'now' && s.detail && <small>{s.detail}</small>}
              </span>
            </li>
          );
        })}
      </ol>
      {hands.length > 1 && (
        <p className="activity-more">
          {finished > 0 ? `${finished} hand${finished === 1 ? '' : 's'} done` : 'Starting'} · {Math.max(0, hands.length - current - 1)} waiting
        </p>
      )}
      {first && active <= 1 && <p className="activity-note">The step times are estimates from the shape of the hand. The hand count is exact.</p>}
    </section>
  );
}
