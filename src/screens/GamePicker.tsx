// Choosing which game a table plays: a row in the table settings that opens a grid of every variant, and the
// rules sheet a player can open from the table.

import { useState } from 'react';
import { variantInfo, VARIANTS, type Settings, type Variant } from '../game';
import { Sheet } from '../ui/components';
import { ChevronIcon } from '../ui/Icons';

/** Ghost Hold'em plays best deep: picking it gives everyone at least this many big blinds. */
const GHOST_DEPTH = 500;
const GHOST_STACKS = [5000, 10000];

/** The "Game" row: what the table plays, and a tap to pick another. */
export function GameRow({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const info = variantInfo(settings.variant);
  const pick = (variant: Variant) => {
    let next: Settings = { ...settings, variant };
    // Deep stacks for the ghost, so a pot it keeps doesn't wipe anyone out.
    if (variant === 'ghost' && settings.startingStack < settings.bigBlind * GHOST_DEPTH) {
      const stack = GHOST_STACKS.find((s) => s >= settings.bigBlind * GHOST_DEPTH) ?? GHOST_STACKS[GHOST_STACKS.length - 1];
      next = { ...next, startingStack: stack, ...(settings.bigBlind * GHOST_DEPTH > stack ? { smallBlind: 10, bigBlind: 20 } : {}) };
    }
    onChange(next);
    setOpen(false);
  };
  return (
    <>
      <div className="choice">
        <p className="section-title">Game</p>
        <button type="button" className="game-row press" onClick={() => setOpen(true)}>
          <span className="game-emoji" aria-hidden>
            {info.emoji}
          </span>
          <span className="gr-text">
            {info.name}
            <small>{info.tagline}</small>
          </span>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
      </div>
      {open && (
        <Sheet title="Choose a game" onClose={() => setOpen(false)}>
          <div className="game-grid">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`game-tile press${v.id === info.id ? ' on' : ''}`}
                aria-pressed={v.id === info.id}
                onClick={() => pick(v.id)}
              >
                <span className="game-tile-emoji" aria-hidden>
                  {v.emoji}
                </span>
                <b>{v.name}</b>
                <small>{v.tagline}</small>
              </button>
            ))}
          </div>
          <p className="muted game-more">More games are on the way.</p>
        </Sheet>
      )}
    </>
  );
}

/** How the table's game plays, from the badge on the table. */
export function RulesSheet({ variant, onClose }: { variant: Variant | undefined; onClose: () => void }) {
  const info = variantInfo(variant);
  return (
    <Sheet title={`${info.emoji} ${info.name}`} onClose={onClose}>
      <ul className="game-rules">
        {info.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </Sheet>
  );
}
