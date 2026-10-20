import { useState } from 'react';
import { BOTS } from '../game/botStyles';
import { DEFAULT_SETTINGS, type Settings } from '../game';
import { loadLastBots } from '../state/persist';
import { dispatch, navigate, openTable, useApp } from '../state/store';
import { Avatar } from '../ui/components';

type Bot = (typeof BOTS)[number];

function sample(n: number): Bot[] {
  const pool = [...BOTS];
  const out: Bot[] = [];
  while (out.length < n && pool.length) {
    const [b] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    if (!out.some((o) => o.emoji === b.emoji)) out.push(b);
  }
  return out;
}

/** A row of one-tap bot games you can swipe through: faces and names, never how they play. */
export function QuickGames() {
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const busy = useApp((s) => s.busy);
  const [bots] = useState(() => sample(8));
  const [duels, table] = [bots.slice(0, 3), bots.slice(3, 8)];

  // Your last game against the bots, if there was one: the same faces on the same terms.
  const [last] = useState(loadLastBots);
  const lastBots = last ? last.bots.map((n) => BOTS.find((b) => b.name === n)).filter((b): b is Bot => !!b) : [];

  const play = async (names: string[], settings: Settings = DEFAULT_SETTINGS) => {
    if (busy) return;
    if (!named) return navigate({ name: 'profile', then: 'bots' });
    await openTable('local', { ...settings, turnSeconds: 0 }, names.length, names);
    dispatch({ type: 'start' });
  };

  return (
    <section className="quick-games" aria-label="Quick games">
      <small className="eyebrow">Quick games</small>
      <div className="quick-row">
        {last && lastBots.length > 0 && (
          <button type="button" className="glass-card quick-card quick-again lift press" onClick={() => void play(lastBots.map((b) => b.name), last.settings)}>
            {lastBots.length === 1 ? (
              <Avatar emoji={lastBots[0].emoji} size={64} />
            ) : (
              <span className="quick-stack" aria-hidden>
                {lastBots.slice(0, 5).map((b) => (
                  <Avatar key={b.name} emoji={b.emoji} size={34} />
                ))}
              </span>
            )}
            <b>Play again</b>
            <small>{lastBots.length === 1 ? `vs ${lastBots[0].name}` : `Same ${lastBots.length} bots`}</small>
          </button>
        )}
        {duels.map((b) => (
          <button key={b.name} type="button" className="glass-card quick-card lift press" onClick={() => void play([b.name])}>
            <Avatar emoji={b.emoji} size={64} />
            <b>{b.name}</b>
            <small>Heads-up</small>
          </button>
        ))}
        <button type="button" className="glass-card quick-card lift press" onClick={() => void play(table.map((b) => b.name))}>
          <span className="quick-stack" aria-hidden>
            {table.map((b) => (
              <Avatar key={b.name} emoji={b.emoji} size={34} />
            ))}
          </span>
          <b>Full table</b>
          <small>You and 5 bots</small>
        </button>
      </div>
    </section>
  );
}
