import { LEGENDS, RUNG_WORDS, type Legend } from '../game';
import { navigate, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { LEGEND_SCENES } from './botScenes';

/** A legend's backdrop with their face on it: the picture on their card and their profile. */
export function LegendArt({ legend, size = 64, className = 'quick-art' }: { legend: Legend; size?: number; className?: string }) {
  const s = LEGEND_SCENES[legend.id];
  return (
    <span className={className} style={{ background: `linear-gradient(180deg, ${s.bg[0]}, ${s.bg[1]})` }}>
      <span className="prop prop-a" aria-hidden>{s.props[0]}</span>
      <span className="prop prop-b" aria-hidden>{s.props[1]}</span>
      <span className="prop prop-c" aria-hidden>{s.props[2]}</span>
      <Avatar emoji={legend.emoji} size={size} />
    </span>
  );
}

/** The Play tab's Legends: bots in the style of famous players, easiest first. */
export function LegendShelf() {
  const named = useApp((s) => s.profile.name.trim().length > 0);
  return (
    <section className="quick-games legends" aria-label="Legends">
      <h3 className="section-head">Legends</h3>
      <div className="quick-row">
        {LEGENDS.map((l) => (
          <button
            key={l.id}
            type="button"
            className="quick-card press"
            aria-label={`${l.name}. ${RUNG_WORDS[l.rung - 1]}.`}
            onClick={() => (named ? navigate({ name: 'legend', id: l.id }) : navigate({ name: 'profile', then: 'bots' }))}
          >
            <LegendArt legend={l} />
            <b>{l.short}</b>
            <small>{RUNG_WORDS[l.rung - 1]}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
