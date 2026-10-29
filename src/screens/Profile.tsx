import { useState } from 'react';
import { loadStreak } from '../state/persist';
import { cleanName, isNameBlocked, type TableInfo, type Variant } from '../game';
import { PREMIUM_PRICE } from '../state/premium';
import { back, joinTable, openPremium, openSheet, replace, setProfile, useApp } from '../state/store';
import { BackBar, NameAndPicture } from '../ui/components';
import { ChevronIcon, CrownIcon, GearIcon } from '../ui/Icons';

const TITLES = { host: 'Host a table', bots: 'Play the bots', join: 'Join the table', done: 'Your profile' };

/** Your name and emoji. Asked once, then remembered; also reachable from Home to change them. */
export function Profile({ then, info, variant }: { then: 'host' | 'bots' | 'join' | 'done'; info?: TableInfo; variant?: Variant }) {
  const profile = useApp((s) => s.profile);
  const premium = useApp((s) => s.premium);
  const [name, setName] = useState(profile.name);
  const [streak] = useState(loadStreak);
  const clean = cleanName(name);
  const ok = clean.length > 0 && !isNameBlocked(clean);

  const next = () => {
    if (!ok) return;
    setProfile({ name: clean });
    if (then === 'host') replace({ name: 'setup', mode: 'online', variant });
    else if (then === 'bots') replace({ name: 'setup', mode: 'local', variant });
    else if (then === 'join' && info) joinTable(info.code);
    else back();
  };

  return (
    <div className="screen">
      <BackBar title={TITLES[then]} />
      <div className="screen-body">
        <div>
          <h1 className="h1">{then === 'done' ? 'You' : "What's your name?"}</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Tap the emoji to pick a different one. Everyone at the table sees it.
          </p>
        </div>
        <div className="profile-middle">
          <NameAndPicture name={name} emoji={profile.emoji} onName={setName} onPicture={() => openSheet({ name: 'emoji' })} onDone={next} />
        </div>
        {then === 'done' && (
          <div className="group">
            <button type="button" className="group-row press" onClick={() => openSheet({ name: 'streak' })}>
              <span className="gr-icon" style={{ background: 'linear-gradient(160deg, var(--gold-hi), var(--party-orange))' }}>
                <span aria-hidden>🔥</span>
              </span>
              <span className="gr-text">
                Streak
                <small>{streak.today ? 'You played today.' : 'Play a hand today to keep it.'}</small>
              </span>
              <span className="gr-count num">{streak.days} {streak.days === 1 ? 'day' : 'days'}</span>
              <ChevronIcon className="gr-chev" width={16} height={16} />
            </button>
            <button type="button" className="group-row press" onClick={() => openSheet({ name: 'prefs' })}>
              <span className="gr-icon" style={{ background: 'var(--slate-hi)' }}>
                <GearIcon />
              </span>
              <span className="gr-text">Settings</span>
              <ChevronIcon className="gr-chev" width={16} height={16} />
            </button>
          </div>
        )}
        {then === 'done' && (
          <button type="button" className="prem-card press" onClick={() => openPremium()}>
            <span className="prem-card-icon" aria-hidden>
              <CrownIcon />
            </span>
            <span className="gr-text">
              FlipUp Premium
              <small>{premium ? "Unlocked. Thank you for backing FlipUp." : 'Card packs, bubble colours, any emoji, AI Legends'}</small>
            </span>
            {premium ? <span className="prem-pill on">Yours</span> : <span className="prem-pill">{PREMIUM_PRICE}</span>}
            <ChevronIcon className="gr-chev" width={16} height={16} />
          </button>
        )}
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-xl btn-dark" disabled={!ok} onClick={next}>
          {then === 'join' ? 'Take a seat' : then === 'done' ? 'Save' : 'Next'}
        </button>
      </div>
    </div>
  );
}
