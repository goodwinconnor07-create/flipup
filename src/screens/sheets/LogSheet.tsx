import { navigate, useApp } from '../../state/store';
import { addHand, handKey } from '../../state/training';
import { CardText, Sheet, Spinner } from '../../ui/components';
import { cardsText, type HandLog } from '../../game';

/** Every hand at this table, newest first, move by move (like Poker Now's log). */
export function LogSheet() {
  const logs = useApp((s) => s.logs);
  const game = useApp((s) => s.game);
  const deviceId = useApp((s) => s.deviceId);
  const me = game?.players.find((p) => p.deviceId === deviceId);
  const live = game?.hand && !game.hand.result ? game.hand : null;
  const myLive = live?.seats.find((s) => s.playerId === me?.id)?.cards ?? [];

  return (
    <Sheet title="Hand log">
      {live && <HandBlock title={`Hand #${live.number} · now`} lines={live.log} mine={myLive} />}
      {logs === null ? (
        <Spinner label="Loading the log…" />
      ) : logs.length === 0 && !live ? (
        <p className="muted">No hands played yet.</p>
      ) : (
        [...logs]
          .reverse()
          .map((l) => (
            <HandBlock
              key={l.number}
              title={`Hand #${l.number}`}
              lines={l.lines}
              mine={me ? l.holes[me.id] : undefined}
              onReview={me && l.record && l.record.holes[me.id]?.length === 2 ? () => review(l, me.id) : undefined}
            />
          ))
      )}
    </Sheet>
  );
}

/** Saves the hand to this phone's training history (if it isn't already) and opens its review. */
function review(l: HandLog, heroId: string) {
  if (!l.record) return;
  const key = handKey(l.record.tableId, l.record.number);
  addHand({ key, heroId, record: l.record });
  navigate({ name: 'lesson', key });
}

function HandBlock({ title, lines, mine, onReview }: { title: string; lines: HandLog['lines']; mine?: string[]; onReview?: () => void }) {
  return (
    <section className="log-hand">
      <div className="log-head">
        <h3 className="log-title">{title}</h3>
        {onReview && (
          <button type="button" className="btn btn-sm btn-outline" onClick={onReview}>
            GTO review
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
