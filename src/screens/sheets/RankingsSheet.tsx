import { Sheet, PlayingCard } from '../../ui/components';
import { RANKINGS } from '../../design/handRankings';


export function RankingsSheet() {
  return (
    <Sheet title="Hand rankings">
      <p className="muted" style={{ marginTop: 0 }}>
        Best at the top. You make the best five-card hand from your two cards and the five on the board.
      </p>
      <ol className="rankings">
        {RANKINGS.map((r, i) => (
          <li key={r.name} className="ranking">
            <span className="ranking-head">
              <b>
                {i + 1}. {r.name}
              </b>
              <small className="muted">{r.note}</small>
            </span>
            <span className="ranking-cards">
              {r.cards.split(' ').map((c) => (
                <PlayingCard key={c} card={c} size="sm" />
              ))}
            </span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
