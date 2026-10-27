import { VARIANTS, type Variant } from '../game';
import { openSheet } from '../state/store';
import { cardArt } from '../ui/gameThemes';

/** The picture behind a game: its colours, with the emoji that belong to it floating about. */
export function GameArt({ variant, className }: { variant: Variant; className?: string }) {
  const art = cardArt(variant);
  return (
    <span className={className ?? 'game-art'} style={{ background: `linear-gradient(160deg, ${art.card[0]}, ${art.card[1]})` }} aria-hidden>
      <span className="prop prop-a">{art.props[0]}</span>
      <span className="prop prop-b">{art.props[1]}</span>
      <span className="prop prop-c">{art.props[2]}</span>
    </span>
  );
}

/** Every game as a big card you swipe through. Tapping one opens its rules and who to play it with. */
export function GameShelf() {
  return (
    <section className="game-shelf" aria-label="Games">
      <div className="game-row-scroll">
        {VARIANTS.map((v) => (
          <button key={v.id} type="button" className="game-card press" onClick={() => openSheet({ name: 'game', variant: v.id })} aria-label={`${v.name}. ${v.tagline}`}>
            <GameArt variant={v.id} />
            <span className="game-card-emoji" aria-hidden>
              {v.emoji}
            </span>
            <span className="game-card-text">
              <b>{v.name}</b>
              <small>{v.tagline}</small>
            </span>
            <span className="game-card-play">Play</span>
          </button>
        ))}
      </div>
    </section>
  );
}
