import { useState } from 'react';
import { variantInfo, recordNet } from '../game';
import { BADGES, loadProgress } from '../state/progress';
import { loadStats } from '../state/persist';
import { loadHistory } from '../state/training';
import { navigate } from '../state/store';
import { chips } from '../ui/components';
import { ChevronIcon } from '../ui/Icons';

const PLACES = ['1st', '2nd', '3rd'];
const placeWord = (n: number) => PLACES[n - 1] ?? `${n}th`;

function when(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** The History tab: how your tables went, the Hold'em hands you can still watch back, and your badges. */
export function HistoryTab() {
  const [stats] = useState(loadStats);
  const [hands] = useState(() => loadHistory().slice(-12).reverse());
  const [progress] = useState(loadProgress);
  const games = [...stats.games].reverse().slice(0, 12);
  const wins = stats.games.filter((g) => g.place === 1).length;
  const earned = BADGES.filter((b) => progress.badges[b.id]).length;
  return (
    <>
      <div className="hist-totals" aria-label="Totals">
        <div className="hist-total">
          <b className="num">{stats.tables}</b>
          <small>tables</small>
        </div>
        <div className="hist-total">
          <b className="num">{wins}</b>
          <small>wins</small>
        </div>
        <div className="hist-total">
          <b className="num">{stats.hands}</b>
          <small>hands</small>
        </div>
      </div>

      <h3 className="section-head">Recent tables</h3>
      {games.length === 0 ? (
        <p className="muted">Finish a table and it shows up here.</p>
      ) : (
        <div className="hist-list">
          {games.map((g) => {
            const info = variantInfo(g.variant as never);
            return (
              <div key={g.at} className="hist-row">
                <span className="hist-emoji" aria-hidden>
                  {info.emoji}
                </span>
                <span className="hist-text">
                  <b>{info.name}</b>
                  <small>
                    {g.place ? `${placeWord(g.place)} of ${g.players}` : `${g.players} players`} · {g.hands} {g.hands === 1 ? 'hand' : 'hands'} · {when(g.at)}
                  </small>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {hands.length > 0 && (
        <>
          <h3 className="section-head">Hands to watch back</h3>
          <div className="hist-list">
            {hands.map((h) => {
              const net = recordNet(h.record, h.heroId);
              return (
                <button key={h.key} type="button" className="hist-row press" onClick={() => navigate({ name: 'replay', key: h.key })} aria-label={`Replay hand ${h.record.number}`}>
                  <span className="hist-emoji" aria-hidden>
                    🃏
                  </span>
                  <span className="hist-text">
                    <b>Hand {h.record.number}</b>
                    <small>
                      {net > 0 ? `Won ${chips(net)}` : net < 0 ? `Lost ${chips(-net)}` : 'Broke even'} · {when(h.record.at)}
                    </small>
                  </span>
                  <ChevronIcon width={16} height={16} aria-hidden />
                </button>
              );
            })}
          </div>
          <p className="muted">Hands are kept for a day. Only Texas Hold'em hands can be watched back.</p>
        </>
      )}

      <h3 className="section-head">
        Badges · {earned} of {BADGES.length}
      </h3>
      <div className="hist-badges">
        {BADGES.map((b) => (
          <div key={b.id} className={`hist-badge${progress.badges[b.id] ? '' : ' locked'}`} title={b.text}>
            <span aria-hidden>{b.emoji}</span>
            {b.name}
          </div>
        ))}
      </div>
    </>
  );
}
