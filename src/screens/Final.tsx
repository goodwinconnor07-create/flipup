import { useEffect } from 'react';
import { net, standings, type Game } from '../game';
import { closeTable, useApp } from '../state/store';
import { Avatar, chips } from '../ui/components';
import { confetti, CONFETTI } from '../ui/effects';

export function signed(n: number): string {
  return n > 0 ? `+${chips(n)}` : n < 0 ? `−${chips(-n)}` : '0';
}

/** Who's up and who's down. */
export function StandingsList({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  return (
    <ol className="standings">
      {standings(game).map((p, i) => {
        const n = net(p);
        return (
          <li key={p.id} className={`standing${p.deviceId === deviceId ? ' you' : ''}`}>
            <span className="standing-rank">{i + 1}</span>
            <Avatar emoji={p.emoji} size={40} />
            <span className="standing-name">
              <b>{p.name}</b>
              <small className="muted">{chips(p.stack)} chips</small>
            </span>
            <b className={`standing-net num ${n > 0 ? 'good' : n < 0 ? 'bad' : ''}`}>{signed(n)}</b>
          </li>
        );
      })}
    </ol>
  );
}

export function Final({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const top = standings(game)[0];
  const iWon = top?.deviceId === deviceId;
  useEffect(() => {
    confetti(iWon ? CONFETTI.win : CONFETTI.party);
  }, [iWon]);
  return (
    <>
      <div className="screen-body">
        <div className="final-hero center">
          {top && <Avatar emoji={top.emoji} size={120} className="pop final-pic" />}
          <h1 className="h1">{top ? (iWon ? 'You won the night!' : `${top.name} won the night`) : 'Table closed'}</h1>
          {top && <p className="muted">{signed(net(top))} chips</p>}
        </div>
        <p className="section-title">Final standings</p>
        <StandingsList game={game} />
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-xl btn-dark" onClick={closeTable}>
          Done
        </button>
      </div>
    </>
  );
}
