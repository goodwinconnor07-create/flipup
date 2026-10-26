import { useEffect, useState } from 'react';
import { useRevalidate } from '../../ui/useRevalidate';
import { bestTwin, FRIENDS_CHANGED, loadFriends, refreshStale, type Friend } from '../../state/friends';
import { loadShare, startSharing } from '../../state/share';
import { back, navigate, openSheet, toast } from '../../state/store';
import { CoachSays } from '../../train/Coach';
import { Avatar } from '../../ui/components';
import { BackIcon, ChevronIcon, PlusIcon } from '../../ui/Icons';


/** What we know about a friend's twin, in a line under their name. */
export function friendLine(f: Friend): string {
  const twin = bestTwin(f);
  if (!twin) return 'Nothing learned yet';
  const where = twin.source === 'shared' ? 'Their twin' : 'Seen at tables';
  return `${where} · ${twin.hands} ${twin.hands === 1 ? 'hand' : 'hands'}${twin.ready ? '' : ' · still learning'}${f.gone && twin.source === 'shared' ? ' · code stopped working' : ''}`;
}

/** Friends' AI twins: the ones you've added (or met at tables), and the way to share yours. */
export function Friends() {
  const [friends, setFriends] = useState(loadFriends);
  const [share, setShare] = useState(loadShare);
  const [busy, setBusy] = useState(false);

  // Shows the saved friends at once, then looks at everyone again (when this opens, when you come back to the app
  // and when the connection returns), so their twins are up to date.
  useRevalidate(() => refreshStale().then(() => setFriends(loadFriends())));
  useEffect(() => {
    const reload = () => setFriends(loadFriends());
    window.addEventListener(FRIENDS_CHANGED, reload);
    return () => window.removeEventListener(FRIENDS_CHANGED, reload);
  }, []);

  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setShare(await startSharing());
      toast('Friends with your code can now play your twin.');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't share your twin.", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen train">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">Friends' twins</div>
        <button type="button" className="icon-btn press" aria-label="Add a friend's twin" onClick={() => openSheet({ name: 'addTwin' })}>
          <PlusIcon />
        </button>
      </div>
      <div className="screen-body">
        <CoachSays
          quick
          lines={
            friends.length > 0
              ? ['Pick a friend to scout, then play their twin.']
              : ["Add a friend's twin with their code, or play online with friends who share theirs. They'll show up here."]
          }
        />
        <button type="button" className="btn btn-xl btn-blue" onClick={() => openSheet({ name: 'addTwin' })}>
          Add a friend's twin
        </button>
        {friends.length > 0 && (
          <div className="group">
            {friends.map((f) => (
              <button key={f.code} type="button" className="group-row press friend-row" onClick={() => navigate({ name: 'scout', code: f.code })}>
                <span className="gr-face">
                  <Avatar emoji={f.emoji} size={36} />
                </span>
                <span className="gr-text">
                  {f.name}
                  <small>{friendLine(f)}</small>
                </span>
                <ChevronIcon className="gr-chev" width={16} height={16} />
              </button>
            ))}
          </div>
        )}
        <div className="glass-card friends-share">
          <small className="eyebrow">Your twin</small>
          {share ? (
            <>
              <b>{`Shared with code ${share.code}`}</b>
              <span className="insight-sub">Friends add it under Add a friend's twin.</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => openSheet({ name: 'shareTwin' })}>
                Show the code
              </button>
            </>
          ) : (
            <>
              <b>Let friends play yours too</b>
              <span className="insight-sub">They get a copy of how you play: your habits, never your cards. You can turn it off any time.</span>
              <button type="button" className="btn btn-sm btn-blue" disabled={busy} onClick={() => void turnOn()}>
                {busy ? 'Turning on…' : 'Turn on sharing'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
