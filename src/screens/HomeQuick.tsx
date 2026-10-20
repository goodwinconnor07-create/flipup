import { useState } from 'react';
import { BOTS } from '../game/botStyles';
import { DEFAULT_SETTINGS } from '../game';
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

  const play = async (names: string[]) => {
    if (busy) return;
    if (!named) return navigate({ name: 'profile', then: 'bots' });
    await openTable('local', { ...DEFAULT_SETTINGS, turnSeconds: 0 }, names.length, names);
    dispatch({ type: 'start' });
  };

  return (
    <section className="quick-games" aria-label="Quick games">
      <small className="eyebrow">Quick games</small>
      <div className="quick-row">
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
