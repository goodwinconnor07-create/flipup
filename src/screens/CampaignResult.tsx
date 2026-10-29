import { useEffect } from 'react';
import { cashBuyIn, sngPrize, venueById, type Game } from '../game';
import { useCampaign } from '../state/campaign';
import { closeTable, startCampaign } from '../state/store';
import { Count } from '../ui/components';
import { confetti, haptic } from '../ui/effects';
import { playSound } from '../ui/sound';

const n0 = (n: number) => n.toLocaleString('en-US');
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

/** A finished campaign table: where you came, what it paid, and the way to the next one. */
export function CampaignResult({ game }: { game: Game }) {
  const c = useCampaign();
  const last = c.last?.gameId === game.id ? c.last : null;
  const v = venueById(game.campaign?.venue);
  const won = last?.place === 1;
  const paid = !!last && last.back > 0;

  useEffect(() => {
    if (!last) return;
    if (won) {
      haptic('success');
      playSound('victory');
      confetti(undefined, undefined, 160);
    } else if (paid) {
      playSound('win');
      confetti(undefined, undefined, 70);
    }
    // Once, when the page opens.
  }, []);

  if (!v) return null;
  const kind = game.campaign?.kind ?? 'sng';
  const again = kind === 'sng' ? (c.chips >= v.sng ? v.sng : 0) : cashBuyIn(c, v);
  const emoji = kind === 'cash' ? '🪫' : won ? '🏆' : paid ? '🥈' : '💸';
  const title =
    kind === 'cash' ? `Out of chips at ${v.name}` : won ? `You won ${v.name}!` : last?.place ? `${ordinal(last.place)} place` : 'Tournament over';
  const line =
    kind === 'cash'
      ? 'The bots took this one. Sit down again or try another table.'
      : won
        ? `Five bots down. ${n0(sngPrize(v, 1))} goes into your bankroll.`
        : paid
          ? `So close. ${n0(sngPrize(v, 2))} for 2nd place.`
          : 'Only 1st and 2nd get paid. Have another go.';

  return (
    <div className="screen-body camp-result">
      <span className={`camp-result-emoji${won ? ' won' : ''}`} aria-hidden>
        {emoji}
      </span>
      <h1>{title}</h1>
      <p className="muted">{line}</p>
      {last && kind === 'sng' && (
        <div className="camp-result-sum">
          <div>
            <small>Buy-in</small>
            <b className="num">{n0(last.paid)}</b>
          </div>
          <div className={paid ? 'up' : ''}>
            <small>Prize</small>
            <b className="num">{paid ? `+${n0(last.back)}` : '0'}</b>
          </div>
        </div>
      )}
      <div className="camp-result-bank">
        <small>Bankroll</small>
        <b className="num">
          <Count value={c.chips} />
        </b>
      </div>
      <div className="stack">
        {again > 0 && (
          <button
            type="button"
            className="btn btn-xl btn-green"
            onClick={() => {
              closeTable();
              startCampaign(kind, v.id);
            }}
          >
            {kind === 'sng' ? `Play again for ${n0(again)}` : `Sit down again with ${n0(again)}`}
          </button>
        )}
        <button type="button" className={`btn ${again > 0 ? 'btn-ghost' : 'btn-xl btn-green'}`} onClick={closeTable}>
          Back to Campaign
        </button>
      </div>
    </div>
  );
}
