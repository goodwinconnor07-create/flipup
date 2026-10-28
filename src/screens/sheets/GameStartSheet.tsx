import { variantInfo, type Variant } from '../../game';
import { closeSheet, navigate, useApp } from '../../state/store';
import { Sheet } from '../../ui/components';
import { cardArt } from '../../ui/gameThemes';
import { GameArt } from '../HomeGames';

/** A game's rules and the two ways to start it: with friends on their phones, or against bots on this one. */
export function GameStartSheet({ variant }: { variant: Variant }) {
  const info = variantInfo(variant);
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const go = (then: 'host' | 'bots') => {
    closeSheet();
    if (!named) return navigate({ name: 'profile', then, variant });
    navigate({ name: 'setup', mode: then === 'host' ? 'online' : 'local', variant });
  };
  return (
    <Sheet>
      <div className="game-start">
        <div className="game-start-head">
          <GameArt variant={variant} className="game-start-art" />
        </div>
        <h2 className="game-start-title">{info.name}</h2>
        <p className="game-start-mood">{cardArt(variant).mood}</p>
        <div className="game-start-go">
          <button type="button" className="btn btn-xl btn-blue" onClick={() => go('host')}>
            Play with friends
          </button>
          <button type="button" className="btn btn-xl btn-green" onClick={() => go('bots')}>
            Play with bots
          </button>
        </div>
        <h3 className="section-head game-start-how">How it plays</h3>
        <ul className="game-rules">
          {info.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="muted game-start-note">
          {variant === 'imposter' ? "Needs three or more players, so it's best with friends." : variant === 'holdem' ? 'Bots here play full-strength Hold\'em.' : "Bots play this the best they can, but it's most fun with friends."}
        </p>
      </div>
    </Sheet>
  );
}
