import { useMemo, useRef, useState } from 'react';
import { LEGEND_NOTE, LEGENDS, MAX_SEATS } from '../game';
import { BOTS, type StyleId } from '../game/botStyles';
import { openPremium, toast, useApp } from '../state/store';
import { BackBar } from '../ui/components';
import { haptic } from '../ui/effects';
import { CrownIcon, LockIcon } from '../ui/Icons';
import { LegendFace } from './sheets/PremiumSheet';

/** The most bots at a table: every seat but yours. */
export const MAX_PICKS = MAX_SEATS - 1;

/** What each playstyle is called here, and a line on how it plays. Shown only on this screen. */
const GROUPS: { id: StyleId; title: string; blurb: string }[] = [
  { id: 'pro', title: 'Solid regulars', blurb: 'Close to perfect poker. Reads you well and adjusts. Hard to rattle.' },
  { id: 'shark', title: 'Sharks', blurb: 'A touch more aggressive, and the quickest to work you out and go after you.' },
  { id: 'tag', title: 'Tight and aggressive', blurb: 'Few hands, played hard. Bets its good hands big.' },
  { id: 'lag', title: 'Loose and aggressive', blurb: 'Lots of hands and lots of pressure. Bluffs a fair bit.' },
  { id: 'maniac', title: 'Maniacs', blurb: 'Raises everything and bluffs constantly. Hard to read, easy to trap.' },
  { id: 'rock', title: 'Rocks', blurb: 'Only plays great hands. When it bets big, believe it.' },
  { id: 'station', title: 'Calling stations', blurb: 'Calls far too much and rarely raises. Bluffing it is a bad idea.' },
  { id: 'gambler', title: 'Gamblers', blurb: 'Limps, chases every draw and loves a big pot.' },
  { id: 'trapper', title: 'Trappers', blurb: 'Quiet until it pounces. Slow-plays monsters and check-raises.' },
  { id: 'nervous', title: 'Nervous players', blurb: 'Folds to pressure, bets small and gets rattled after losing.' },
];

/**
 * Every bot there is, grouped by how it plays: tap faces to pick them (up to eight), find a name, jump between
 * playstyles, then Save to take them back to the table setup.
 */
export function BotPicker({ picked, onSave, onBack }: { picked: string[]; onSave: (names: string[]) => void; onBack: () => void }) {
  const premium = useApp((s) => s.premium);
  const [chosen, setChosen] = useState<string[]>(picked);
  const [query, setQuery] = useState('');
  const sections = useRef<Record<string, HTMLElement | null>>({});
  const q = query.trim().toLowerCase();

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, bots: BOTS.filter((b) => b.style === g.id) })).map((g) => ({
        ...g,
        shown: q ? g.bots.filter((b) => b.name.toLowerCase().includes(q)) : g.bots,
      })),
    [q],
  );

  const legends = useMemo(() => LEGENDS.filter((l) => !q || l.short.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)), [q]);

  // AI Legends are Premium: without it, a tap opens the offer, and the legend sits down once it's bought.
  const toggleLegend = (name: string) => {
    if (premium || chosen.includes(name)) return toggle(name);
    haptic('light');
    openPremium('legends', () => toggle(name));
  };

  const toggle = (name: string) => {
    if (chosen.includes(name)) {
      haptic('light');
      setChosen(chosen.filter((n) => n !== name));
    } else if (chosen.length >= MAX_PICKS) {
      haptic('error');
      toast(`That's a full table: ${MAX_PICKS} bots is the most.`, 'error');
    } else {
      haptic('light');
      setChosen([...chosen, name]);
    }
  };
  const jump = (id: string) => sections.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const faces = new Map<string, string>([...BOTS.map((b) => [b.name, b.emoji] as const), ...LEGENDS.map((l) => [l.short, l.emoji] as const)]);

  return (
    <div className="screen bot-picker">
      <BackBar title="Pick your bots" onBack={onBack} />
      <div className="picker-top">
        <div className="picker-count">
          <b aria-live="polite">
            {chosen.length} of {MAX_PICKS} picked
          </b>
          {chosen.length > 0 && (
            <button type="button" className="btn btn-link" onClick={() => setChosen([])}>
              Clear
            </button>
          )}
        </div>
        {chosen.length > 0 && (
          <div className="picker-chosen" aria-hidden>
            {chosen.map((n) => (
              <span key={n}>{faces.get(n)}</span>
            ))}
          </div>
        )}
        <input
          className="field picker-search"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={`Find a name (${BOTS.length} bots)`}
          aria-label="Find a bot by name"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <nav className="picker-jump" aria-label="Jump to a playstyle">
          <button type="button" className="chip-btn chip-gold press" onClick={() => jump('legends')}>
            AI Legends
          </button>
          {GROUPS.map((g) => (
            <button key={g.id} type="button" className="chip-btn press" onClick={() => jump(g.id)}>
              {g.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="picker-body">
        {legends.length > 0 && (
          <section className="picker-group picker-legends" ref={(el) => void (sections.current.legends = el)}>
            <header className="picker-head">
              <h2 className="h3">
                <CrownIcon width={16} height={16} aria-hidden /> AI Legends
              </h2>
              <span className="prem-pill">{premium ? 'Premium' : 'FlipUp Premium'}</span>
            </header>
            <p className="muted picker-blurb">Bots in the style of famous players, each with their own habits and table talk.</p>
            <div className="picker-grid">
              {legends.map((l) => {
                const on = chosen.includes(l.short);
                return (
                  <button key={l.id} type="button" className={`picker-bot picker-legend press${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleLegend(l.short)}>
                    <LegendFace legend={l} size={48} />
                    <span className="picker-name">{l.short}</span>
                    {on ? (
                      <span className="picker-tick" aria-hidden>
                        ✓
                      </span>
                    ) : (
                      !premium && (
                        <span className="picker-lock" aria-hidden>
                          <LockIcon width={11} height={11} />
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
            <p className="muted legend-note">{LEGEND_NOTE}</p>
          </section>
        )}
        {groups.map((g) =>
          g.shown.length === 0 ? null : (
            <section key={g.id} className="picker-group" ref={(el) => void (sections.current[g.id] = el)}>
              <header className="picker-head">
                <h2 className="h3">{g.title}</h2>
                <span className="muted num">{g.shown.length}</span>
              </header>
              <p className="muted picker-blurb">{g.blurb}</p>
              <div className="picker-grid">
                {g.shown.map((b) => {
                  const on = chosen.includes(b.name);
                  return (
                    <button
                      key={b.name}
                      type="button"
                      className={`picker-bot press${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(b.name)}
                    >
                      <span className="picker-face" aria-hidden>
                        {b.emoji}
                      </span>
                      <span className="picker-name">{b.name}</span>
                      {on && (
                        <span className="picker-tick" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ),
        )}
        {legends.length === 0 && groups.every((g) => g.shown.length === 0) && <p className="muted picker-none">No bot has a name like “{query.trim()}”.</p>}
      </div>

      <div className="screen-foot">
        <button type="button" className="btn btn-xl btn-dark" disabled={chosen.length === 0} onClick={() => onSave(chosen)}>
          {chosen.length === 0 ? 'Pick at least one bot' : `Save ${chosen.length} ${chosen.length === 1 ? 'bot' : 'bots'}`}
        </button>
      </div>
    </div>
  );
}
