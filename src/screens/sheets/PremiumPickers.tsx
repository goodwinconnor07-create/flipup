import { BUBBLE_STYLES, LEGEND_NOTE, LEGENDS, MAX_SEATS } from '../../game';
import { closeSheet, dispatch, openPremium, openSheet, setProfile, useApp } from '../../state/store';
import { Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { CheckIcon, LockIcon } from '../../ui/Icons';
import { BubbleChip, LegendFace } from './PremiumSheet';

/** Pick the colour of your chat bubbles. The five colours are Premium; tapping one without it opens the offer. */
export function BubbleSheet() {
  const premium = useApp((s) => s.premium);
  const mine = useApp((s) => s.profile.bubble);
  const pick = (id: string | undefined) => {
    haptic('light');
    if (id && !premium) {
      // After buying, put the colour on and come back here.
      openPremium('bubbles', () => {
        setProfile({ bubble: id });
        openSheet({ name: 'bubbles' });
      });
      return;
    }
    setProfile({ bubble: id });
  };
  const rows: { id: string | undefined; name: string; note: string }[] = [
    { id: undefined, name: 'Classic', note: 'Blue and grey, like Messages' },
    ...BUBBLE_STYLES,
  ];
  return (
    <Sheet title="Chat bubbles">
      <div className="bubble-preview" aria-hidden>
        <span className="bubble-chip-lg">
          {mine ? <BubbleChip id={mine}>Raise 150</BubbleChip> : <span className="bubble-chip bubble-blue">Raise 150</span>}
        </span>
        <span className="bubble-chip-lg">
          {mine ? <BubbleChip id={mine}>Nice hand!</BubbleChip> : <span className="bubble-chip bubble-grey">Nice hand!</span>}
        </span>
      </div>
      <p className="muted" style={{ margin: '0 0 12px' }}>
        Your moves and quick messages show in this colour for everyone at the table.
      </p>
      <div className="group">
        {rows.map((r) => {
          const on = (mine ?? undefined) === r.id;
          const locked = !!r.id && !premium;
          return (
            <button
              key={r.id ?? 'classic'}
              type="button"
              className="group-row press bubble-row"
              role="radio"
              aria-checked={on}
              onClick={() => pick(r.id)}
            >
              <span className="bubble-row-pic">
                {r.id ? <BubbleChip id={r.id}>Aa</BubbleChip> : <span className="bubble-chip bubble-blue">Aa</span>}
              </span>
              <span className="gr-text">
                {r.name}
                <small>{r.note}</small>
              </span>
              {locked ? (
                <LockIcon className="prem-lock" width={18} height={18} aria-label="Premium" />
              ) : on ? (
                <CheckIcon className="prem-on" width={20} height={20} aria-label="Selected" />
              ) : null}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn-dark" style={{ marginTop: 20 }} onClick={closeSheet}>
        Done
      </button>
    </Sheet>
  );
}

/** Seat an AI Legend at the table you're hosting. Premium. */
export function LegendsSheet() {
  const game = useApp((s) => s.game);
  const full = !game || game.players.length >= MAX_SEATS;
  return (
    <Sheet title="Add an AI Legend">
      <p className="muted" style={{ marginTop: 0 }}>
        They take a seat and play the way they're known for.
      </p>
      <div className="group">
        {LEGENDS.map((l) => {
          const there = !!game?.players.some((p) => p.legend === l.id);
          return (
            <button
              key={l.id}
              type="button"
              className="group-row press legend-row"
              disabled={there || full}
              onClick={() => {
                if (dispatch({ type: 'addBot', legend: l.id })) closeSheet();
              }}
            >
              <LegendFace legend={l} size={44} />
              <span className="gr-text">
                {l.name}
                <small>{there ? 'Already at the table' : l.blurb}</small>
              </span>
            </button>
          );
        })}
      </div>
      <p className="muted legend-note">{LEGEND_NOTE}</p>
    </Sheet>
  );
}
