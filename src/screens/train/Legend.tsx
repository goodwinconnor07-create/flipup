import { useMemo, useState } from 'react';
import { legendById, legendProfile, LEGEND_NOTE, LEGENDS, RUNG_WORDS } from '../../game';
import { legendBefore, legendOpen, loadProgress } from '../../state/progress';
import { back, startLegend } from '../../state/store';
import { CoachSays } from '../../train/Coach';
import { scout } from '../../train/scout';
import { BackIcon } from '../../ui/Icons';
import { LegendArt } from '../HomeLegends';

/** A legend's profile: how they play in plain words, what to do about it, and a heads-up game against them. */
export function Legend({ id }: { id: string }) {
  const legend = legendById(id);
  // Their numbers through the same scouting a friend's twin gets.
  const notes = useMemo(() => (legend ? scout(legendProfile(legend), 3, 0.1) : []), [legend]);
  const [progress] = useState(loadProgress);
  if (!legend) return null;
  const open = legendOpen(progress, legend.id);
  const before = legendBefore(legend.id);
  const record = progress.rivals.legends[legend.id];
  const beaten = progress.beaten[legend.id];
  return (
    <div className="screen train">
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
        <CoachSays quick lines={[legend.blurb]} />
        <div className="glass-card legend-signature">
          <small className="eyebrow">Known for</small>
          <ul>
            {legend.signature.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <h2 className="section-head">How to beat them</h2>
        {notes.length === 0 && <CoachSays quick lines={["There's no habit to aim at. Keep your game simple, bet your good hands and pick your spots."]} />}
        {notes.map((n) => (
          <div key={n.id} className="glass-card coach-card twin-habit">
            <CoachSays quick compact lines={[n.say, `Plan: ${n.plan}`]} />
            <details className="coach-numbers">
              <summary>Show me the numbers</summary>
              <p>{n.numbers}</p>
            </details>
          </div>
        ))}
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
