// Choosing which game a table plays: a row in the table settings that opens a grid of every variant, and the
// rules sheet a player can open from the table.

import { useState } from 'react';
import { BLIND_LEVELS, variantInfo, VARIANTS, type Settings, type Variant } from '../game';
import { Sheet } from '../ui/components';
import { ChevronIcon } from '../ui/Icons';
import { GameArt } from './HomeGames';
import { GameThumb } from '../ui/GameIllustrations';

/** Ghost Hold'em plays best deep: picking it gives everyone at least this many big blinds. */
const GHOST_DEPTH = 500;
const GHOST_STACKS = [5000, 10000];

/** The settings a game plays best with: Ghost wants deep stacks, Imposter bigger blinds. */
export function withVariant(settings: Settings, variant: Variant): Settings {
  let next: Settings = { ...settings, variant };
  // Deep stacks for the ghost, so a pot it keeps doesn't wipe anyone out.
  if (variant === 'ghost' && settings.startingStack < settings.bigBlind * GHOST_DEPTH) {
    const stack = GHOST_STACKS.find((s) => s >= settings.bigBlind * GHOST_DEPTH) ?? GHOST_STACKS[GHOST_STACKS.length - 1];
    next = { ...next, startingStack: stack, ...(settings.bigBlind * GHOST_DEPTH > stack ? { smallBlind: 10, bigBlind: 20 } : {}) };
  }
  // Imposter plays for bigger blinds (about 50 big blinds deep), so every hand matters.
  if (variant === 'imposter' && settings.bigBlind < next.startingStack / 50) {
    const [smallBlind, bigBlind] = [...BLIND_LEVELS].reverse().find(([, bb]) => bb <= next.startingStack / 50) ?? [settings.smallBlind, settings.bigBlind];
    next = { ...next, smallBlind, bigBlind };
  }
  return next;
}

/** The "Game" row: what the table plays, and a tap to pick another. */
export function GameRow({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const info = variantInfo(settings.variant);
  const pick = (variant: Variant) => {
    onChange(withVariant(settings, variant));
    setOpen(false);
  };
  return (
    <>
      <div className="choice">
        <p className="section-title">Game</p>
        <button type="button" className="game-row press" onClick={() => setOpen(true)}>
          <GameThumb variant={info.id} size={48} />
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
                <GameArt variant={v.id} className="game-tile-art" />
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
