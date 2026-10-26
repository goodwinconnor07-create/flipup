import { useEffect, useRef, useState } from 'react';
import { net, standings, type Game } from '../game';
import { closeTable, dispatch, openLog, startTwin, useApp } from '../state/store';
import { shareText } from './sheets/InviteSheet';
import { Avatar, chips } from '../ui/components';
import { openTwinReport } from './train/TwinReport';
import { confetti, CONFETTI, haptic, reducedMotion } from '../ui/effects';
import { playSound } from '../ui/sound';

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

/** 3rd, then 2nd, then the winner, like the golf app's podium. A tap skips ahead. */
export function Final({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const rows = standings(game);
  const top = rows[0];
  const iWon = top?.deviceId === deviceId;
  const me = game.players.find((p) => p.deviceId === deviceId);
  const host = game.hostDeviceId === deviceId;
  const hostName = game.players.find((p) => p.deviceId === game.hostDeviceId)?.name ?? 'the host';
  const asked = !!me && !!game.again?.includes(me.id);
  const waiting = (game.again ?? []).filter((id) => game.players.some((p) => p.id === id)).length;
  const podium = rows.length >= 2;
  const first = rows.length >= 3 ? 0 : 1;
  const [step, setStep] = useState(() => (!podium || reducedMotion() ? 3 : first));
  // The reveal builds: a drum roll for 3rd, a higher one for 2nd, then the winner and the fanfare.
  const sounded = useRef(-1);
  useEffect(() => {
    if (!podium || sounded.current >= step) return;
    sounded.current = step;
    playSound(step === 0 ? 'build0' : step === 1 ? 'build1' : step === 2 ? 'build2' : 'victory');
  }, [step, podium]);
  useEffect(() => {
    if (step >= 3) return;
    const t = setTimeout(
      () => {
        haptic(step === 2 ? 'heavy' : 'medium');
        setStep((x) => x + 1);
      },
      step === 0 ? 500 : step === 2 ? 1300 : 1000,
    );
    return () => clearTimeout(t);
  }, [step]);
  useEffect(() => {
    if (step < 3) return;
    haptic('success');
    confetti(iWon ? CONFETTI.win : CONFETTI.party, { x: innerWidth / 2, y: innerHeight * 0.25 }, 150);
  }, [step, iWon]);

  const headline = !top ? 'Table closed' : iWon ? 'You win!' : `${top.name} wins!`;
  return (
    <>
      <div className="screen-body final-body" onClick={step < 3 ? () => setStep(3) : undefined}>
        <h1 className="h1 center" aria-live="polite">
          {step >= 3 ? headline : step === 2 ? 'In 2nd…' : 'And in 3rd…'}
        </h1>
        {step >= 3 && top && (
          <p className="h3 muted center" style={{ margin: '-8px 0 0' }}>
            {signed(net(top))} chips{game.hand ? ` after ${game.hand.number} hand${game.hand.number === 1 ? '' : 's'}` : ''}
          </p>
        )}
        {podium && (
          // Read in place order; laid out 2-1-3 like a real podium.
          <ol className="podium">
            {rows.slice(0, 3).map((p, i) => {
              const shown = step >= 3 - i;
              return (
                <li key={p.id} className={`podium-step podium-${i + 1}${shown ? ' shown' : ''}`}>
                  {shown ? (
                    <>
                      {i === 0 && <span className="podium-crown">👑</span>}
                      <Avatar emoji={p.emoji} size={i === 0 ? 72 : 56} className="pop" />
                      <span className="podium-name">{p.deviceId === deviceId ? 'You' : p.name}</span>
                      <span className={`podium-score num ${net(p) > 0 ? 'good' : net(p) < 0 ? 'bad' : ''}`}>{signed(net(p))}</span>
                    </>
                  ) : (
                    <span className="podium-q">?</span>
                  )}
                  <span className="podium-block">{i + 1}</span>
                </li>
              );
            })}
          </ol>
        )}
        {step >= 3 && (
          <>
            <p className="section-title">Final standings</p>
            <StandingsList game={game} />
          </>
        )}
      </div>
      <div className="screen-foot">
        {me && step >= 3 && (
          <>
            {host ? (
              <button type="button" className="btn btn-xl btn-blue" onClick={() => (game.twinGame ? startTwin() : dispatch({ type: 'playAgain' }))}>
                Play again{waiting > 0 ? ` · ${waiting} waiting` : ''}
              </button>
            ) : asked ? (
              <button type="button" className="btn btn-xl btn-ghost" onClick={() => dispatch({ type: 'playAgain', off: true })}>
                Waiting for {hostName} to start… (tap to cancel)
              </button>
            ) : (
              <button type="button" className="btn btn-xl btn-blue" onClick={() => dispatch({ type: 'playAgain' })}>
                Play again
              </button>
            )}
          </>
        )}
        {game.twinGame && step >= 3 && (
          <button type="button" className="btn btn-xl btn-ghost" onClick={openTwinReport}>
            What your twin found
          </button>
        )}
        <button type="button" className={`btn btn-xl ${me && step >= 3 ? 'btn-ghost' : 'btn-dark'}`} onClick={closeTable}>
          Done
        </button>
        {me && step >= 3 && (
          <button
            type="button"
            className="btn btn-link"
            onClick={() => {
              const place = rows.findIndex((p) => p.id === me.id) + 1;
              const hands = game.hand ? ` over ${game.hand.number} hand${game.hand.number === 1 ? '' : 's'}` : '';
              const line = iWon ? 'I won' : `I finished ${place}${['th', 'st', 'nd', 'rd'][place % 100 > 10 && place % 100 < 14 ? 0 : Math.min(place % 10, 4) % 4]}`;
              void shareText('GTODuel result', `${line} at GTODuel: ${signed(net(me))} chips${hands}.`, 'Result copied');
            }}
          >
            Share result
          </button>
        )}
        <button type="button" className="btn btn-link" onClick={openLog}>
          Hand log
        </button>
      </div>
    </>
  );
}
