import { useState, type ReactNode } from 'react';
import { LEGENDS, RUNG_WORDS, type Legend } from '../game';
import { legendBefore, legendOpen, loadProgress } from '../state/progress';
import { navigate, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { LEGEND_SCENES } from './botScenes';
import { hasPortrait, LegendPortrait } from '../ui/LegendPortraits';

/** A legend's picture: their drawn portrait (or, without one, their backdrop and emoji). Used on their card and profile. */
export function LegendArt({ legend, size = 64, className = 'quick-art', children }: { legend: Legend; size?: number; className?: string; children?: ReactNode }) {
  const s = LEGEND_SCENES[legend.id];
  if (hasPortrait(legend.id)) {
    return (
      <span className={`${className} portrait`} style={{ background: s.bg[1] }}>
        <LegendPortrait id={legend.id} className="legend-portrait" />
        {children}
      </span>
    );
  }
  return (
    <span className={className} style={{ background: `linear-gradient(180deg, ${s.bg[0]}, ${s.bg[1]})` }}>
      <span className="prop prop-a" aria-hidden>{s.props[0]}</span>
      <span className="prop prop-b" aria-hidden>{s.props[1]}</span>
      <span className="prop prop-c" aria-hidden>{s.props[2]}</span>
      <Avatar emoji={legend.emoji} size={size} />
      {children}
    </span>
  );
}

/** The Play tab's Legends: bots in the style of famous players, easiest first. */
export function LegendShelf() {
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const [progress] = useState(loadProgress);
  return (
    <section className="quick-games legends" aria-label="AI Legends">
      <h3 className="section-head">AI Legends</h3>
      <div className="quick-row">
        {LEGENDS.map((l) => {
          const open = legendOpen(progress, l.id);
          const beaten = !!progress.beaten[l.id];
          const before = legendBefore(l.id)?.short;
          return (
          <button
            key={l.id}
            type="button"
            className={`quick-card press${open ? '' : ' locked'}`}
            aria-label={`${l.name}. ${open ? (beaten ? 'Beaten.' : RUNG_WORDS[l.rung - 1] + '.') : `Locked. Beat ${before} first.`}`}
            onClick={() => (named ? navigate({ name: 'legend', id: l.id }) : navigate({ name: 'profile', then: 'bots' }))}
          >
            <LegendArt legend={l} className={open ? undefined : 'quick-art legend-locked'}>
              {!open && <span className="legend-lock" aria-hidden>{`Beat ${before} to unlock`}</span>}
            </LegendArt>
            <b>{l.short}</b>
            <small>{open ? (beaten ? 'Beaten ✓' : RUNG_WORDS[l.rung - 1]) : '🔒 Locked'}</small>
          </button>
          );
        })}
      </div>
    </section>
  );
}
