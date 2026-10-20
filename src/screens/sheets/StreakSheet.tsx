import { useState } from 'react';
import { loadStreakInfo } from '../../state/persist';
import { Emoji, Sheet } from '../../ui/components';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The daily streak up close: when it started, the best one, and the last week. */
export function StreakSheet() {
  const [info] = useState(loadStreakInfo);
  const started = info.start?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <Sheet title="Daily streak">
      <div className="stack">
        <div className="streak-hero">
          <Emoji emoji="🔥" size={48} />
          <b>{info.days}</b>
          <span className="muted">{info.days === 1 ? 'day in a row' : 'days in a row'}</span>
        </div>
        <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
          {info.days === 0
            ? 'Play a hand to start a streak.'
            : info.today
              ? "You've played today. Come back tomorrow to keep it going."
              : 'Play a hand today to keep your streak alive.'}
        </p>
        <div className="streak-week" aria-label="The last seven days">
          {info.week.map((d, i) => (
            <span key={i} className={`streak-day${d.played ? ' played' : ''}${d.today ? ' today' : ''}`}>
              <i aria-label={d.played ? 'Played' : 'Not played'}>{d.played && <Emoji emoji="🔥" size={16} />}</i>
              <b>{d.label}</b>
            </span>
          ))}
        </div>
        <div className="group plain">
          {started && (
            <div className="group-row">
              <span className="gr-text">Started</span>
              <b>{started}</b>
            </div>
          )}
          <div className="group-row">
            <span className="gr-text">Longest streak</span>
            <b>{plural(info.best, 'day')}</b>
          </div>
          <div className="group-row">
            <span className="gr-text">Days played</span>
            <b>{info.total}</b>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
