import { VARIANTS, type Variant } from '../game';
import { openSheet } from '../state/store';
import { cardArt } from '../ui/gameThemes';
import { GameIllustration } from '../ui/GameIllustrations';

/** The picture behind a game: its colours, with a scene drawn for that game on top. */
export function GameArt({ variant, className }: { variant: Variant; className?: string }) {
  const art = cardArt(variant);
  return (
    <span className={className ?? 'game-art'} style={{ background: `linear-gradient(160deg, ${art.card[0]}, ${art.card[1]})` }} aria-hidden>
      <GameIllustration variant={variant} />
    </span>
  );
}

/** Every game as a big card you swipe through: its scene in a box on top, then its name and a Play button.
 * Tapping one opens its rules and who to play it with. */
export function GameShelf() {
  return (
    <section className="game-shelf" aria-label="Games">
      <div className="game-row-scroll">
        {VARIANTS.map((v) => {
          const art = cardArt(v.id);
          return (
            <button
              key={v.id}
              type="button"
              className="game-card press"
              style={{ background: `linear-gradient(160deg, ${art.card[0]}, ${art.card[1]})` }}
              onClick={() => openSheet({ name: 'game', variant: v.id })}
              aria-label={`${v.name}. ${v.tagline}`}
            >
              <span className="game-scene">
                <GameIllustration variant={v.id} />
              </span>
              <span className="game-card-foot">
                <span className="game-card-text">
                  <b>{v.name}</b>
                  <small>{v.tagline}</small>
                </span>
                <span className="game-card-play">Play</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
