import { useState } from 'react';
import { legendById, LEGEND_NOTE, LEGENDS, RUNG_WORDS } from '../game';
import { legendBefore, legendOpen, loadProgress } from '../state/progress';
import { back, startLegend } from '../state/store';
import { BackIcon } from '../ui/Icons';
import { LegendArt } from './HomeLegends';

/** A legend's profile: who they are, what they're known for, and a heads-up game against them. */
export function Legend({ id }: { id: string }) {
  const legend = legendById(id);
  const [progress] = useState(loadProgress);
  if (!legend) return null;
  const open = legendOpen(progress, legend.id);
  const before = legendBefore(legend.id);
  const record = progress.rivals.legends[legend.id];
  const beaten = progress.beaten[legend.id];
  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">{legend.name}</div>
        <span className="icon-btn" aria-hidden />
      </div>
      <div className="screen-body">
        <div className="legend-head">
          <LegendArt legend={legend} size={72} className="legend-art" />
          <div className="legend-pips" role="img" aria-label={`${RUNG_WORDS[legend.rung - 1]}, ${legend.rung} of ${LEGENDS.length}`}>
            {LEGENDS.map((l) => (
              <i key={l.id} className={l.rung <= legend.rung ? 'on' : ''} />
            ))}
            <span>{RUNG_WORDS[legend.rung - 1]}</span>
          </div>
        </div>
        <p className="legend-blurb">{legend.blurb}</p>
        <div className="glass-card legend-signature">
          <small className="eyebrow">Known for</small>
          <ul>
            {legend.signature.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        {record && record.w + record.l > 0 && (
          <p className="legend-record">
            {beaten ? `You've beaten ${legend.short}${beaten.wins > 1 ? ` ${beaten.wins} times` : ''}.` : `You haven't beaten ${legend.short} yet.`} Record {record.w}–{record.l}.
          </p>
        )}
        {open ? (
          <button type="button" className="btn btn-xl btn-blue twin-again" onClick={() => startLegend(legend.id)}>
            {beaten ? `Rematch ${legend.short}` : `Play ${legend.short}`}
          </button>
        ) : (
          <button type="button" className="btn btn-xl btn-ghost twin-again" disabled>
            {`🔒 Beat ${before?.short} to play ${legend.short}`}
          </button>
        )}
        <p className="muted legend-note">{LEGEND_NOTE}</p>
      </div>
    </div>
  );
}
