import { useApp } from '../../state/store';
import { CardText, Sheet, Spinner } from '../../ui/components';
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
  return (
    <>
      {live && <HandBlock title={`Hand #${live.number} · now`} lines={live.log} mine={myLive} />}
      {logs === null ? (
        <Spinner label="Loading the log…" />
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
function HandBlock({ title, lines, mine, share }: { title: string; lines: HandLog['lines']; mine?: string[]; share?: number }) {
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
