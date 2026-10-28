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

/** How many games sit on the shelf; the rest open from the "More game modes" card. */
export const SHELF_GAMES = 4;

/** Every game as a big card you swipe through: its scene in a box on top, then its name and a Play button.
 * Tapping one opens its rules and who to play it with. */
export function GameShelf() {
  const more = VARIANTS.slice(SHELF_GAMES);
  return (
    <section className="game-shelf" aria-label="Games">
      <div className="game-row-scroll">
        {VARIANTS.slice(0, SHELF_GAMES).map((v) => {
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
        <button type="button" className="game-card game-more-card press" onClick={() => openSheet({ name: 'more' })} aria-label={`More game modes. ${more.length} more ways to play.`}>
          <span className="game-scene game-more-scene">
            <span className="game-more-grid">
              {more.slice(0, 6).map((v) => {
                const art = cardArt(v.id);
                return (
                  <i key={v.id} style={{ background: `linear-gradient(160deg, ${art.card[0]}, ${art.card[1]})` }}>
                    {v.emoji}
                  </i>
                );
              })}
            </span>
          </span>
          <span className="game-card-foot">
            <span className="game-card-text">
              <b>More game modes</b>
              <small>{more.length} more ways to play, from ghosts to dice.</small>
            </span>
            <span className="game-card-play">See all</span>
          </span>
        </button>
      </div>
    </section>
  );
}
