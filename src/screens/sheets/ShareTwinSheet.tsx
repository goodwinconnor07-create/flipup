import { useState } from 'react';
import { openSheet } from '../../state/store';
import { loadShare } from '../../state/share';
import { Sheet } from '../../ui/components';
import { CopyIcon, ShareIcon } from '../../ui/Icons';
import { copy, CodeTiles, shareText } from './InviteSheet';

/** The code friends type in (Play → Friends' twins → Add a friend's twin) to play and scout your twin. */
export function ShareTwinSheet() {
  const [share] = useState(loadShare);
  if (!share) return null;
  const text = `Play against a copy of me on FlipUp. In Friends' twins, add my twin code: ${share.code}`;
  return (
    <Sheet title="Your twin code" onClose={() => openSheet({ name: 'prefs' })}>
      <div className="stack center">
        <CodeTiles code={share.code} label="Twin code" />
        <p className="muted" style={{ margin: 0 }}>
          A friend adds this under Play, Friends' twins. They can play a copy of you and see how you play: your habits, never your cards. Turn the switch off in Settings to take it down.
        </p>
        <button type="button" className="btn btn-blue" onClick={() => void shareText("Play my AI twin", text, 'Message copied')}>
          <ShareIcon width={24} height={24} /> Share the code
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void copy(share.code, 'Code copied')}>
          <CopyIcon width={22} height={22} /> Copy the code
        </button>
      </div>
    </Sheet>
  );
}
