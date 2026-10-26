import { useState } from 'react';
import { TWIN_READY } from '../game';
import { loadFriends } from '../state/friends';
import { loadProgress } from '../state/progress';
import { navigate, openSheet, startTwin, useApp } from '../state/store';
import { twinStatus } from '../state/twin';
import { MirrorArt } from './CardArt';

/** The Play tab's AI twins: a copy of you to learn from, and (soon) copies of your friends to beat. */
export function TwinTiles() {
  const emoji = useApp((s) => s.profile.emoji);
  const [twin] = useState(twinStatus);
  const [friends] = useState(() => loadFriends().length);
  const [score] = useState(() => loadProgress().rivals.twin);
  const left = Math.max(0, TWIN_READY - twin.hands);
  const pct = Math.round(twin.confidence * 100);
  const played = score.w + score.l > 0;
  const lead = score.w > score.l ? `You lead ${score.w}–${score.l}` : score.w < score.l ? `It leads ${score.l}–${score.w}` : `Level at ${score.w}–${score.l}`;
  const line = twin.ready ? (played ? lead : twin.confidence >= 1 ? 'It knows your game.' : `Still learning you · ${pct}%`) : `Play ${left} more ${left === 1 ? 'hand' : 'hands'} to meet it.`;
  // Locked: the bar shows how close it is to ready. Ready: how well it knows you.
  const fill = twin.ready ? twin.confidence : twin.hands / TWIN_READY;

  const friendsLine = friends > 0 ? `${friends} ${friends === 1 ? 'friend' : 'friends'} added.` : "Add a friend's twin.";

  return (
    <section className="twins" aria-label="AI twins">
      <h3 className="section-head">AI twins</h3>
      <div className="twin-row">
        <button
          type="button"
          className={`twin-card twin-you press${twin.ready ? '' : ' locked'}`}
          aria-label={`Your twin. ${line}`}
          onClick={() => (twin.ready ? startTwin() : openSheet({ name: 'twin' }))}
        >
          <MirrorArt faces={[emoji]} />
          <span className="twin-text">
            <b>Your twin</b>
            <small>{twin.ready ? 'Beat a copy of you.' : 'A copy of you.'}</small>
          </span>
          <span className="twin-meter" role="img" aria-label={line}>
            <i style={{ width: `${Math.max(4, Math.round(fill * 100))}%` }} />
          </span>
          <small className="twin-line">{line}</small>
        </button>
        <button
          type="button"
          className="twin-card twin-friends press"
          aria-label={`Friends' twins. ${friendsLine}`}
          onClick={() => navigate({ name: 'friends' })}
        >
          <MirrorArt faces={['🥳', '😄']} scout />
          <span className="twin-text">
            <b>Friends' twins</b>
            <small>Scout a friend.</small>
          </span>
          <small className="twin-line">{friendsLine}</small>
        </button>
      </div>
    </section>
  );
}

/** What the "Your twin" sheet's button does: on to a game against bots, where the twin learns. */
export function playBotsToTeach(named: boolean): void {
  navigate(named ? { name: 'setup', mode: 'local' } : { name: 'profile', then: 'bots' });
}
