import { useState } from 'react';
import { BOTS } from '../game/botStyles';
import { DEFAULT_SETTINGS, type Settings } from '../game';
import { loadLastBots } from '../state/persist';
import { dispatch, getState, navigate, openTable, useApp } from '../state/store';
import { Avatar } from '../ui/components';

type Bot = (typeof BOTS)[number];

/** A steady soft colour per bot for its tile. */
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

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
              <span className="quick-art" style={{ ['--h' as string]: hue(lastBots[0].name) }}>
                <Avatar emoji={lastBots[0].emoji} size={64} />
              </span>
            ) : (
              <span className="quick-art quick-stack" style={{ ['--h' as string]: 215 }} aria-hidden>
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
            <span className="quick-art" style={{ ['--h' as string]: hue(b.name) }}>
              <Avatar emoji={b.emoji} size={64} />
            </span>
            <b>{b.name}</b>
            <small>Heads-up</small>
          </button>
        ))}
        <button type="button" className="glass-card quick-card lift press" onClick={() => void play(table.map((b) => b.name))}>
          <span className="quick-art quick-stack" style={{ ['--h' as string]: 150 }} aria-hidden>
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
