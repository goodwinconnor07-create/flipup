import { useState } from 'react';
import { cashMax, FORMATS, goalDone, goals, isOpen, STAKES, topDraw, VENUES } from '../../game';
import { useCampaign } from '../../state/campaign';
import { openCampaignForFriends, useApp } from '../../state/store';
import { Sheet } from '../../ui/components';
import { ChevronIcon, LockIcon } from '../../ui/Icons';
import { blinds, GoalRow, short } from '../HomeCampaign';

/** Every goal in one list: ready to collect first, then the ones on the way, then the ones already collected. */
export function CampaignGoalsSheet() {
  const c = useCampaign();
  const all = goals(c);
  const ready = all.filter((g) => goalDone(g) && !c.claimed.includes(g.id));
  const going = all.filter((g) => !goalDone(g));
  const collected = all.filter((g) => c.claimed.includes(g.id));
  const earned = collected.reduce((a, g) => a + g.reward, 0);
  return (
    <Sheet title="Goals">
      <p className="muted" style={{ marginTop: 0 }}>
        {collected.length} of {all.length} collected{earned ? `, worth ${short(earned)} chips so far` : ''}. Each goal pays once.
      </p>
      {[
        { title: 'Ready to collect', list: ready },
        { title: 'On the way', list: going },
        { title: 'Collected', list: collected },
      ]
        .filter((part) => part.list.length > 0)
        .map((part) => (
          <section key={part.title} className="goal-part">
            <p className="menu-section">{part.title}</p>
            <div className="goals">
              {part.list.map((g) => (
                <GoalRow key={g.id} g={g} c={c} />
              ))}
            </div>
          </section>
        ))}
    </Sheet>
  );
}

/** Pick a campaign table to open online. Friends join with the code, and everyone pays from their own bankroll. */
export function CampaignFriendsSheet() {
  const c = useCampaign();
  const busy = useApp((s) => !!s.busy);
  const [kind, setKind] = useState<'sng' | 'cash'>('sng');
  const seated = !!c.seat;
  return (
    <Sheet title="Play with friends">
      <p className="muted" style={{ marginTop: 0 }}>
        Open a campaign table and share its code. Everyone pays the buy-in from their own bankroll, and empty seats fill with bots when you deal.
      </p>
      <div className="segmented" role="tablist" style={{ marginBottom: 16 }}>
        <button type="button" role="tab" aria-selected={kind === 'sng'} className={kind === 'sng' ? 'on' : ''} onClick={() => setKind('sng')}>
          Tournament
        </button>
        <button type="button" role="tab" aria-selected={kind === 'cash'} className={kind === 'cash' ? 'on' : ''} onClick={() => setKind('cash')}>
          Cash game
        </button>
      </div>
      <div className="settings-list">
        {kind === 'sng'
          ? VENUES.map((v) => {
              const f = FORMATS[v.format];
              const open = isOpen(c, v);
              const ok = open && !seated && c.chips >= v.buyIn;
              return (
                <button key={v.id} type="button" className="group-row press" disabled={!ok || busy} onClick={() => void openCampaignForFriends('sng', v.id)}>
                  <span className="gr-icon friend-pick-emoji" aria-hidden>
                    {v.emoji}
                  </span>
                  <span className="gr-text">
                    {v.name}
                    <small>
                      {f.name} · buy-in {short(v.buyIn)} · prize up to {short(v.buyIn * topDraw(f))}
                    </small>
                  </span>
                  {open ? <ChevronIcon className="gr-chev" width={18} height={18} /> : <LockIcon className="gr-chev" width={18} height={18} />}
                </button>
              );
            })
          : // Every stake you can cover in full, and the next one up.
            STAKES.slice(0, Math.max(2, STAKES.filter((s) => c.chips >= cashMax(s)).length + 1)).map((s) => {
              const open = isOpen(c, s);
              const ok = open && !seated && c.chips >= cashMax(s);
              return (
                <button key={s.id} type="button" className="group-row press" disabled={!ok || busy} onClick={() => void openCampaignForFriends('cash', s.id)}>
                  <span className="gr-icon friend-pick-emoji" aria-hidden>
                    🃏
                  </span>
                  <span className="gr-text">
                    {blinds(s)} cash game
                    <small>Everyone sits with {short(cashMax(s))}</small>
                  </span>
                  {open ? <ChevronIcon className="gr-chev" width={18} height={18} /> : <LockIcon className="gr-chev" width={18} height={18} />}
                </button>
              );
            })}
      </div>
      {seated && <p className="muted">Finish the campaign table you’re at first.</p>}
    </Sheet>
  );
}
