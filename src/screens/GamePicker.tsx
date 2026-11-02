// Choosing which game a table plays: a row in the table settings that opens a grid of every variant, and the
// rules sheet a player can open from the table.

import { variantInfo, VARIANTS, withVariant, type Settings, type Variant } from '../game';
import { closeSheet, openSheet } from '../state/store';
import { Sheet } from '../ui/components';
import { CheckIcon, ChevronIcon } from '../ui/Icons';
import { GameIllustration, GameThumb } from '../ui/GameIllustrations';
import { cardArt } from '../ui/gameThemes';

/** The "Game" row: what the table plays, and a tap to pick another. */
export function GameRow({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const info = variantInfo(settings.variant);
  return (
    <div className="choice">
      <p className="set-title">Game</p>
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
