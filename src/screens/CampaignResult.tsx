import { useEffect } from 'react';
import { cashBuyIn, FORMATS, stakeById, venueById, type Game } from '../game';
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
  const tag = game.campaign;
  const venue = tag?.kind === 'sng' ? venueById(tag.venue) : undefined;
  const stake = tag?.kind === 'cash' ? stakeById(tag.venue) : undefined;
  const won = last?.place === 1;
  const paid = !!last && !last.refunded && last.back > 0;
  const online = !!game.code;

  useEffect(() => {
    if (!last || last.refunded) return;
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

  if (!tag || (!venue && !stake)) return null;
  const name = venue?.name ?? `${n0(stake!.smallBlind)}/${n0(stake!.bigBlind)} cash game`;
  const format = venue ? FORMATS[venue.format] : undefined;
  // Another go is a bots-only table on this phone; a table with friends is opened again from the Campaign tab.
  const again = online ? 0 : venue ? (c.chips >= venue.buyIn ? venue.buyIn : 0) : cashBuyIn(c, stake!);
  const emoji = last?.refunded ? '↩️' : stake ? '🪫' : won ? '🏆' : paid ? '🥈' : '💸';
  const title = last?.refunded
    ? 'Called off'
    : stake
      ? `Out of chips at the ${name}`
      : won
        ? `You won ${name}!`
        : last?.place
          ? `${ordinal(last.place)} place`
          : 'Tournament over';
  const line = last?.refunded
    ? 'It never got going, so your buy-in is back in your bankroll.'
    : stake
      ? 'The table took this one. Sit down again or try other stakes.'
      : won
        ? `${n0(last?.back ?? 0)} goes into your bankroll.`
        : paid
          ? `So close. ${n0(last?.back ?? 0)} for ${ordinal(last?.place ?? 2)} place.`
          : format && format.split.length > 1
            ? `Only the top ${format.split.length} get paid. Have another go.`
            : 'Only the winner gets paid. Have another go.';

  return (
    <div className="screen-body camp-result">
      <span className={`camp-result-emoji${won ? ' won' : ''}`} aria-hidden>
        {emoji}
      </span>
      <h1>{title}</h1>
      <p className="muted">{line}</p>
      {last && venue && !last.refunded && (
        <div className="camp-result-sum">
          <div>
            <small>Buy-in</small>
            <b className="num">{n0(last.paid)}</b>
          </div>
          <div className={paid ? 'up' : ''}>
            <small>{last.prize ? `Prize pool ${n0(last.prize)}` : 'Prize'}</small>
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
              startCampaign(tag.kind, tag.venue);
            }}
          >
            {venue ? `Play again for ${n0(again)}` : `Sit down again with ${n0(again)}`}
          </button>
        )}
        <button type="button" className={`btn ${again > 0 ? 'btn-ghost' : 'btn-xl btn-green'}`} onClick={closeTable}>
          Back to Campaign
        </button>
      </div>
    </div>
  );
}
