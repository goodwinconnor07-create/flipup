import { useApp } from '../../state/store';
import { CardText, Sheet, Skeleton, useDelayed } from '../../ui/components';
import { cardsText, handLogText, type HandLog } from '../../game';
import { ShareIcon } from '../../ui/Icons';
import { shareText } from './InviteSheet';

/** Every hand at this table, newest first, move by move (like Poker Now's log). Used in the sheet and the desktop side panel. */
export function HandLogList() {
  const logs = useApp((s) => s.logs);
  const game = useApp((s) => s.game);
  const deviceId = useApp((s) => s.deviceId);
  const me = game?.players.find((p) => p.deviceId === deviceId);
  const live = game?.hand && !game.hand.result ? game.hand : null;
  const myLive = live?.seats.find((s) => s.playerId === me?.id)?.cards ?? [];
  const slow = useDelayed(logs === null);
  return (
    <>
      {live && <HandBlock title={`Hand #${live.number} · now`} lines={live.log} mine={myLive} />}
      {logs === null ? (
        slow && <HandBlock loading />
      ) : logs.length === 0 && !live ? (
        <p className="muted">No hands played yet.</p>
      ) : (
        [...logs]
          .reverse()
          .map((l) => <HandBlock key={l.number} title={`Hand #${l.number}`} lines={l.lines} mine={me ? l.holes[me.id] : undefined} share={l.number} />)
      )}
    </>
  );
}

export function LogSheet() {
  return (
    <Sheet title="Hand log">
      <HandLogList />
    </Sheet>
  );
}

/** `share` is the hand's number once it's finished: a button then sends it to a chat. */
function HandBlock({ title, lines = [], mine, share, loading }: { title?: string; lines?: HandLog['lines']; mine?: string[]; share?: number; loading?: boolean }) {
  if (loading) {
    // The placeholder is the same block with grey lines where the text will go.
    return (
      <section className="log-hand" aria-busy="true">
        <span className="sr-only" role="status">
          Loading the log…
        </span>
        <div className="log-head">
          <h3 className="log-title" aria-hidden>
            <Skeleton width="35%" />
          </h3>
        </div>
        {[80, 65, 90, 55].map((w, i) => (
          <p key={i} className="log-line" aria-hidden>
            <Skeleton width={`${w}%`} />
          </p>
        ))}
      </section>
    );
  }
  return (
    <section className="log-hand">
      <div className="log-head">
        <h3 className="log-title">{title}</h3>
        {share !== undefined && (
          <button
            type="button"
            className="log-share press"
            aria-label={`Share hand #${share}`}
            onClick={() => void shareText(`GTODuel hand #${share}`, handLogText(share, lines, mine), 'Hand copied')}
          >
            <ShareIcon width={18} height={18} />
          </button>
        )}
      </div>
      {mine && mine.length === 2 && (
        <p className="log-line log-mine">
          <CardText text={`Your hand: ${cardsText(mine)}`} />
        </p>
      )}
      {lines.slice(1).map((line, i) => (
        <p
          key={i}
          className={`log-line${/^(Flop|Turn|River|Board):/.test(line) ? ' log-street' : ''}${/ wins /.test(line) ? ' log-win' : ''}`}
        >
          <CardText text={line} />
        </p>
      ))}
    </section>
  );
}
