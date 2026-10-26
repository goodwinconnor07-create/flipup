import { useState } from 'react';
import { TWIN_READY } from '../../game';
import { closeSheet, useApp } from '../../state/store';
import { twinStatus } from '../../state/twin';
import { Sheet } from '../../ui/components';
import { MirrorArt } from '../CardArt';
import { playBotsToTeach } from '../HomeTwins';

/** Shown when you tap "Your twin" before it knows you: what it is, how far along it is, and a way to teach it. */
export function TwinSheet() {
  const emoji = useApp((s) => s.profile.emoji);
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const [twin] = useState(twinStatus);
  const left = Math.max(0, TWIN_READY - twin.hands);
  return (
    <Sheet title="Your AI twin">
      <div className="twin-sheet">
        <div className="twin-sheet-art twin-you">
          <MirrorArt faces={[emoji]} />
        </div>
        <p>
          Your twin is a copy of you. It learns from every hand you play, against bots or friends, and then plays the way you do: your habits, and your mistakes.
        </p>
        <p className="muted">
          It needs {TWIN_READY} hands before it's worth playing. {left > 0 ? `You're at ${twin.hands}.` : 'You\'re there.'}
        </p>
        <span className="twin-meter big" role="img" aria-label={`${twin.hands} of ${TWIN_READY} hands`}>
          <i style={{ width: `${Math.max(4, Math.min(100, Math.round((twin.hands / TWIN_READY) * 100)))}%` }} />
        </span>
        <div className="stack">
          <button
            type="button"
            className="btn btn-xl btn-blue"
            onClick={() => {
              closeSheet();
              playBotsToTeach(named);
            }}
          >
            Play with Bots
          </button>
          <button type="button" className="btn btn-ghost" onClick={closeSheet}>
            Not now
          </button>
        </div>
      </div>
    </Sheet>
  );
}
