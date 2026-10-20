import { useState } from 'react';
import { BOTS } from '../game/botStyles';
import { DEFAULT_SETTINGS, type Settings } from '../game';
import { loadLastBots } from '../state/persist';
import { dispatch, getState, navigate, openTable, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { sceneFor } from './botScenes';

/** A bot's backdrop: its gradient, with a few props from its world. */
function Scene({ emoji, size = 64 }: { emoji: string; size?: number }) {
  const s = sceneFor(emoji);
  return (
    <span className="quick-art" style={{ background: `linear-gradient(180deg, ${s.bg[0]}, ${s.bg[1]})` }}>
      <span className="prop prop-a" aria-hidden>{s.props[0]}</span>
      <span className="prop prop-b" aria-hidden>{s.props[1]}</span>
      <span className="prop prop-c" aria-hidden>{s.props[2]}</span>
      <Avatar emoji={emoji} size={size} />
    </span>
  );
}

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

/** Sits down against the named bots and deals (or asks for a name first). */
export async function startBots(names: string[], settings: Settings, named: boolean): Promise<void> {
  if (getState().busy) return;
  if (!named) return navigate({ name: 'profile', then: 'bots' });
  await openTable('local', { ...settings, turnSeconds: 0 }, names.length, names);
  dispatch({ type: 'start' });
}

/** A row of one-tap bot games you can swipe through: faces and names, never how they play. */
export function QuickGames({ showAgain = true }: { showAgain?: boolean }) {
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const [bots] = useState(() => sample(8));
  const [duels, table] = [bots.slice(0, 3), bots.slice(3, 8)];

  // Your last game against the bots, if there was one: the same faces on the same terms.
  const [last] = useState(loadLastBots);
  const lastBots = last ? last.bots.map((n) => BOTS.find((b) => b.name === n)).filter((b): b is Bot => !!b) : [];

  const play = (names: string[], settings: Settings = DEFAULT_SETTINGS) => startBots(names, settings, named);

  return (
    <section className="quick-games" aria-label="Quick games">
      <h3 className="section-head">Quick games</h3>
      <div className="quick-row">
        {showAgain && last && lastBots.length > 0 && (
          <button type="button" className="glass-card quick-card quick-again lift press" onClick={() => void play(lastBots.map((b) => b.name), last.settings)}>
            {lastBots.length === 1 ? (
              <Scene emoji={lastBots[0].emoji} />
            ) : (
              <span className="quick-art quick-stack" style={{ ['--h' as string]: 215 }} aria-hidden>
                {lastBots.slice(0, 5).map((b) => (
                  <Avatar key={b.name} emoji={b.emoji} size={28} />
                ))}
              </span>
            )}
            <b>Play again</b>
            <small>{lastBots.length === 1 ? `vs ${lastBots[0].name}` : `Same ${lastBots.length} bots`}</small>
          </button>
        )}
        {duels.map((b) => (
          <button key={b.name} type="button" className="glass-card quick-card lift press" onClick={() => void play([b.name])}>
            <Scene emoji={b.emoji} />
            <b>{b.name}</b>
            <small>Heads-up</small>
          </button>
        ))}
        <button type="button" className="glass-card quick-card lift press" onClick={() => void play(table.map((b) => b.name))}>
          <span className="quick-art quick-stack" style={{ ['--h' as string]: 150 }} aria-hidden>
            {table.map((b) => (
              <Avatar key={b.name} emoji={b.emoji} size={28} />
            ))}
          </span>
          <b>Full table</b>
          <small>You and 5 bots</small>
        </button>
      </div>
    </section>
  );
}
