import { useMemo } from 'react';
import { legendById, legendProfile, LEGEND_NOTE, LEGENDS, RUNG_WORDS } from '../../game';
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
  if (!legend) return null;
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
        <button type="button" className="btn btn-xl btn-blue twin-again" onClick={() => startLegend(legend.id)}>
          {`Play ${legend.short}`}
        </button>
        <p className="muted legend-note">{LEGEND_NOTE}</p>
      </div>
    </div>
  );
}
