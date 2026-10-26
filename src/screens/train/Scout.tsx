import { useEffect, useMemo, useState } from 'react';
import { back, confirm, navigate, startFriendTwin, toast } from '../../state/store';
import { bestTwin, loadFriend, refreshFriend, removeFriend } from '../../state/friends';
import { loadTwinGames } from '../../state/twinGames';
import { CoachSays } from '../../train/Coach';
import { scoutLines } from '../../train/coach';
import { confidenceWord, scout } from '../../train/scout';
import { Avatar } from '../../ui/components';
import { BackIcon } from '../../ui/Icons';
import { friendLine } from './Friends';

/** Scouting a friend's twin: how they play, what to do about it, and a game against their twin. */
export function Scout({ code }: { code: string }) {
  const [friend, setFriend] = useState(() => loadFriend(code));
  useEffect(() => {
    void refreshFriend(code)
      .then(() => setFriend(loadFriend(code)))
      .catch(() => undefined);
  }, [code]);
  const twin = useMemo(() => (friend ? bestTwin(friend) : null), [friend]);
  const notes = useMemo(() => (twin?.ready ? scout(twin.profile) : []), [twin]);
  const played = useMemo(() => loadTwinGames().some((g) => g.friend === code && g.hands.length > 0), [code]);

  if (!friend) {
    return (
      <div className="screen train">
        <div className="topbar">
          <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
            <BackIcon />
          </button>
          <div className="topbar-title h3">Friend</div>
          <span className="icon-btn" aria-hidden />
        </div>
        <div className="screen-body">
          <CoachSays quick lines={["I can't find that friend any more."]} />
        </div>
      </div>
    );
  }

  return (
    <div className="screen train">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">{`${friend.name}'s twin`}</div>
        <span className="icon-btn" aria-hidden />
      </div>
      <div className="screen-body">
        <div className="glass-card scout-head">
          <Avatar emoji={friend.emoji} size={56} />
          <span>
            <b>{friend.name}</b>
            <small>{friendLine(friend)}</small>
          </span>
        </div>
        <CoachSays quick lines={scoutLines(friend.name, twin, notes.length, confidenceWord(twin?.hands ?? 0))} />
        {notes.map((n) => (
          <div key={n.id} className="glass-card coach-card twin-habit">
            <CoachSays quick compact lines={[n.say, `Plan: ${n.plan}`]} />
            <details className="coach-numbers">
              <summary>Show me the numbers</summary>
              <p>{n.numbers}</p>
            </details>
          </div>
        ))}
        <button type="button" className="btn btn-xl btn-blue twin-again" disabled={!twin?.ready} onClick={() => startFriendTwin(code)}>
          {twin?.ready ? `Play ${friend.name}'s twin` : 'Not ready to play yet'}
        </button>
        {played && (
          <button type="button" className="btn btn-xl btn-ghost" onClick={() => navigate({ name: 'twinReport', friend: code })}>
            How my last game went
          </button>
        )}
        <button
          type="button"
          className="btn btn-link"
          onClick={() =>
            confirm({
              title: `Remove ${friend.name}?`,
              body: "Their twin goes from this phone. It comes back if you add their code again.",
              confirm: 'Remove',
              danger: true,
              onConfirm: () => {
                removeFriend(code);
                toast(`${friend.name} removed.`);
                back();
              },
            })
          }
        >
          Remove {friend.name}
        </button>
      </div>
    </div>
  );
}
