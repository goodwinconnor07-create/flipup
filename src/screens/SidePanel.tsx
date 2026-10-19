import { useEffect } from 'react';
import { refreshLogs, useApp } from '../state/store';
import { StandingsList } from './Final';
import { HandLogList } from './sheets/LogSheet';

/** The desktop table's right-hand side: standings, and the hand log that fills in as you play. */
export function SidePanel() {
  const game = useApp((s) => s.game);
  // Fetch the log when the table opens and each time a hand starts or finishes (not on every move).
  const key = game?.hand ? `${game.hand.number}-${game.hand.result ? 'done' : 'live'}` : 'none';
  useEffect(() => refreshLogs(), [key]);
  if (!game) return null;
  return (
    <aside className="desk-side" aria-label="Standings and hand log">
      <section className="desk-card">
        <p className="section-title">Standings</p>
        <StandingsList game={game} />
      </section>
      <section className="desk-card desk-log">
        <p className="section-title">Hand log</p>
        <div className="desk-log-scroll">
          <HandLogList />
        </div>
      </section>
    </aside>
  );
}
