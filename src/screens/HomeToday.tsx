import { useState } from 'react';
import { loadToday, todaysGoals } from '../state/progress';
import { navigate } from '../state/store';
import { CheckIcon, ChevronIcon } from '../ui/Icons';

/** The Play tab's Today card: three small goals for the day. They reset overnight and never take anything away. */
export function TodayCard() {
  const [goals] = useState(() => todaysGoals(loadToday()));
  const done = goals.filter((g) => g.done).length;
  return (
    <section className="today" aria-label="Today's goals">
      <h3 className="section-head">Today</h3>
      <button type="button" className="today-card press" onClick={() => navigate({ name: 'progress' })} aria-label={`Today's goals, ${done} of ${goals.length} done. Open goals and badges`}>
        <ul>
          {goals.map(({ def, have, done: ok }) => (
            <li key={def.id} className={ok ? 'ok' : ''}>
              <span className="today-tick" aria-hidden>{ok && <CheckIcon width={14} height={14} />}</span>
              <span className="today-label">{def.label}</span>
              {def.target > 1 && !ok && <small className="num">{have}/{def.target}</small>}
            </li>
          ))}
        </ul>
        <ChevronIcon width={18} height={18} />
      </button>
    </section>
  );
}
