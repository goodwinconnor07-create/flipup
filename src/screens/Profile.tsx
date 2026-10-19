import { useState } from 'react';
import { cleanName, isNameBlocked, type TableInfo } from '../game';
import { back, joinTable, openSheet, replace, setProfile, useApp } from '../state/store';
import { BackBar, NameAndPicture } from '../ui/components';

const TITLES = { host: 'Host a table', bots: 'Play the bots', join: 'Join the table', done: 'Your profile' };

/** Your name and emoji. Asked once, then remembered; also reachable from Home to change them. */
export function Profile({ then, info }: { then: 'host' | 'bots' | 'join' | 'done'; info?: TableInfo }) {
  const profile = useApp((s) => s.profile);
  const [name, setName] = useState(profile.name);
  const clean = cleanName(name);
  const ok = clean.length > 0 && !isNameBlocked(clean);

  const next = () => {
    if (!ok) return;
    setProfile({ name: clean });
    if (then === 'host') replace({ name: 'setup', mode: 'online' });
    else if (then === 'bots') replace({ name: 'setup', mode: 'local' });
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
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-xl btn-dark" disabled={!ok} onClick={next}>
          {then === 'join' ? 'Take a seat' : then === 'done' ? 'Save' : 'Next'}
        </button>
      </div>
    </div>
  );
}
