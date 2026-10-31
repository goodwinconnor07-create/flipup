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

/** Every game on one screen: Texas Hold'em as a wide card, then the mini games two to a row, each with its scene,
 * name and a one-line pitch. Tapping one opens its rules and who to play it with. */
export function GameShelf() {
  const [main, ...rest] = VARIANTS;
  const art = cardArt(main.id);
  return (
    <section className="game-shelf" aria-label="Games">
      <button
        type="button"
        className="game-card game-card-main press"
        style={{ background: `linear-gradient(160deg, ${art.card[0]}, ${art.card[1]})` }}
        onClick={() => openSheet({ name: 'game', variant: main.id })}
        aria-label={`${main.name}. ${main.tagline}`}
      >
        <span className="game-scene">
          <GameIllustration variant={main.id} />
        </span>
        <span className="game-card-foot">
          <span className="game-card-text">
            <b>{main.name}</b>
            <small>{main.tagline}</small>
          </span>
          <span className="game-card-play">Play</span>
        </span>
      </button>
      <div className="game-grid">
        {rest.map((v) => {
          const a = cardArt(v.id);
          return (
            <button
              key={v.id}
              type="button"
              className="game-tile press"
              style={{ background: `linear-gradient(160deg, ${a.card[0]}, ${a.card[1]})` }}
              onClick={() => openSheet({ name: 'game', variant: v.id })}
              aria-label={`${v.name}. ${v.tagline}`}
            >
              <span className="game-tile-scene">
                <GameIllustration variant={v.id} />
              </span>
              <b>{v.name}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}
