import { useState } from 'react';
import { LEGENDS, RUNG_WORDS } from '../../game';
import { BADGES, legendBefore, legendOpen, loadToday, PROGRESS_TITLE, todaysGoals } from '../../state/progress';
import { back, navigate } from '../../state/store';
import { BackIcon, CheckIcon } from '../../ui/Icons';
import { Avatar } from '../../ui/components';

/** Goals, the legends ladder, your badges and your records, on one page. */
export function Progress() {
  const [p] = useState(loadToday);
  const goals = todaysGoals(p);
  const earned = BADGES.filter((b) => p.badges[b.id]).length;
  const twinGames = p.rivals.twin.w + p.rivals.twin.l;
  const friends = Object.values(p.rivals.friends);
  return (
    <div className="screen train">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">{PROGRESS_TITLE}</div>
        <span className="icon-btn" aria-hidden />
      </div>
      <div className="screen-body">
        {goals.length > 0 && (
          <>
            <h2 className="section-head">Today</h2>
            <div className="glass-card prog-goals">
              {goals.map(({ def, have, done }) => (
                <div key={def.id} className={`prog-goal${done ? ' ok' : ''}`}>
                  <span className="today-tick" aria-hidden>{done && <CheckIcon width={14} height={14} />}</span>
                  <span>{def.label}</span>
                  <i className="prog-bar" aria-hidden><b style={{ width: `${Math.round((have / def.target) * 100)}%` }} /></i>
                </div>
              ))}
              <small className="muted">New goals tomorrow.</small>
            </div>
          </>
        )}

        <h2 className="section-head">The ladder</h2>
        <div className="prog-ladder">
          {LEGENDS.map((l) => {
            const open = legendOpen(p, l.id);
            const beaten = p.beaten[l.id];
            const r = p.rivals.legends[l.id];
            return (
              <button key={l.id} type="button" className={`prog-rung press${open ? '' : ' locked'}`} onClick={() => navigate({ name: 'legend', id: l.id })}>
                <Avatar emoji={open ? l.emoji : '🔒'} size={40} />
                <span className="prog-rung-text">
                  <b>{l.short}</b>
                  <small>
                    {beaten ? `Beaten${beaten.wins > 1 ? ` ${beaten.wins} times` : ''}` : open ? RUNG_WORDS[l.rung - 1] : `Beat ${legendBefore(l.id)?.short} to open`}
                    {r && r.w + r.l > 0 ? ` · ${r.w}–${r.l}` : ''}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="section-head">Badges · {earned} of {BADGES.length}</h2>
        <div className="prog-badges">
          {BADGES.map((b) => {
            const at = p.badges[b.id];
            return (
              <div key={b.id} className={`prog-badge${at ? ' on' : ''}`} title={b.text}>
                <span className="prog-badge-icon" aria-hidden>{at ? b.emoji : '🔒'}</span>
                <b>{b.name}</b>
                <small>{b.text}</small>
              </div>
            );
          })}
        </div>

        {(twinGames > 0 || friends.length > 0) && (
          <>
            <h2 className="section-head">Records</h2>
            <div className="glass-card prog-records">
              {twinGames > 0 && <p>Your twin: you've won {p.rivals.twin.w} and lost {p.rivals.twin.l}.</p>}
              {friends.length > 0 && <p>Friends' twins: {friends.reduce((a, r) => a + r.w, 0)} won, {friends.reduce((a, r) => a + r.l, 0)} lost.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
