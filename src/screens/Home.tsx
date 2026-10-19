import { navigate, openSheet, useApp } from '../state/store';
import { Avatar, PlayingCard } from '../ui/components';
import { colourWipe } from '../ui/effects';
import { ArrowIcon } from '../ui/Icons';

export function Home() {
  const game = useApp((s) => s.game);
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const active = session && (session.mode === 'online' || (game && game.status !== 'ended'));
  const named = profile.name.trim().length > 0;

  // No name yet: ask for one first, then carry on.
  const go = (then: 'host' | 'bots' | 'join') => {
    if (then === 'join') return navigate({ name: 'join' });
    if (!named) return navigate({ name: 'profile', then });
    navigate({ name: 'setup', mode: then === 'host' ? 'online' : 'local' });
  };

  return (
    <div className="screen home">
      <div className="home-head">
        <h1 className="logo">
          Flip<span>Up</span>
        </h1>
        <button
          type="button"
          className="me-chip press"
          aria-label={named ? `Your profile: ${profile.name}` : 'Set up your profile'}
          onClick={() => navigate({ name: 'profile', then: 'done' })}
        >
          <Avatar emoji={profile.emoji} size={32} />
          <span>{named ? profile.name : 'You'}</span>
        </button>
      </div>
      <div className="screen-body home-body">
        <div className="home-art" aria-hidden>
          <PlayingCard card="As" size="xl" className="home-card home-card-1" />
          <PlayingCard card="Kh" size="xl" className="home-card home-card-2" />
        </div>
        <div className="home-hero">
          <h2 className="hero">Poker night, on your phones.</h2>
          <p className="muted">No-limit Texas Hold'em. Friends join with a code; bots fill the empty seats.</p>
        </div>
        {active && (
          <button type="button" className="home-row press" onClick={() => navigate({ name: 'table' })}>
            <ArrowIcon width={22} height={22} />
            <span className="home-row-text">
              <b>Back to your table</b>
              <small>{session.mode === 'online' ? `Code ${session.code}` : 'You vs the bots'}</small>
            </span>
          </button>
        )}
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-dark btn-xl" onClick={(e) => colourWipe(e, () => go('host'))}>
          Host a table
        </button>
        <div className="home-links">
          <button type="button" className="btn btn-outline" onClick={() => go('join')}>
            Join with a code
          </button>
          <button type="button" className="btn btn-outline" onClick={() => go('bots')}>
            Play the bots
          </button>
        </div>
        <button type="button" className="btn btn-link" onClick={() => openSheet({ name: 'rankings' })}>
          Hand rankings
        </button>
      </div>
    </div>
  );
}
