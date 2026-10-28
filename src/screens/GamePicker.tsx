// Choosing which game a table plays: a row in the table settings that opens a grid of every variant, and the
// rules sheet a player can open from the table.

import { BLIND_LEVELS, variantInfo, VARIANTS, type Settings, type Variant } from '../game';
import { closeSheet, openSheet } from '../state/store';
import { Sheet } from '../ui/components';
import { CheckIcon, ChevronIcon } from '../ui/Icons';
import { GameIllustration, GameThumb } from '../ui/GameIllustrations';
import { cardArt } from '../ui/gameThemes';

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
  const info = variantInfo(settings.variant);
  return (
    <div className="choice">
      <p className="section-title">Game</p>
      <button
        type="button"
        className="game-row press"
        onClick={() => openSheet({ name: 'pick', current: info.id, onPick: (variant) => onChange(withVariant(settings, variant)) })}
      >
        <GameThumb variant={info.id} size={48} />
        <span className="gr-text">
          {info.name}
          <small>{info.tagline}</small>
        </span>
        <ChevronIcon className="gr-chev" width={16} height={16} />
      </button>
    </div>
  );
}

/** Every game as a card to pick from. */
export function PickSheet({ current, onPick }: { current: Variant; onPick: (variant: Variant) => void }) {
  return (
    <Sheet title="Choose a game">
      <div className="pick-list">
        {VARIANTS.map((v) => {
          const art = cardArt(v.id);
          return (
            <button
              key={v.id}
              type="button"
              className={`pick-card press${v.id === current ? ' on' : ''}`}
              style={{ background: `linear-gradient(160deg, ${art.card[0]}, ${art.card[1]})` }}
              aria-pressed={v.id === current}
              onClick={() => {
                onPick(v.id);
                closeSheet();
              }}
            >
              <span className="pick-scene game-live">
                <GameIllustration variant={v.id} />
              </span>
              <span className="pick-text">
                <b>{v.name}</b>
                <small>{v.tagline}</small>
              </span>
              {v.id === current && (
                <span className="pick-on" aria-hidden>
                  <CheckIcon width={18} height={18} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="muted game-more">More games are on the way.</p>
    </Sheet>
  );
}

/** How the table's game plays, from the badge on the table. */
export function RulesSheet({ variant }: { variant: Variant | undefined }) {
  const info = variantInfo(variant);
  return (
    <Sheet title={`${info.emoji} ${info.name}`}>
      <ul className="game-rules">
        {info.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </Sheet>
  );
}
