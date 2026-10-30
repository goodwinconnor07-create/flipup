import { bubbleById, BUBBLE_STYLES, CARD_PACKS, LEGEND_NOTE, LEGENDS, MAX_SEATS, packById } from '../../game';
import { useCampaign } from '../../state/campaign';
import { closeSheet, dispatch, openPremium, openSheet, setProfile, useApp } from '../../state/store';
import { PlayingCard, Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { CheckIcon, LockIcon } from '../../ui/Icons';
import { BubbleChip, LegendFace } from './PremiumSheet';

/** Pick the colour of your chat bubbles. The five colours are Premium; tapping one without it opens the offer. */
export function BubbleSheet() {
  const premium = useApp((s) => s.premium);
  const mine = useApp((s) => s.profile.bubble);
  const pick = (id: string | undefined) => {
    haptic('light');
    if (id && !premium && !bubbleById(id)?.free) {
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
          const locked = !!r.id && !premium && !bubbleById(r.id)?.free;
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

/** Pick the back of your cards. Five packs are Premium (tapping one without it opens the offer); the campaign's trophy backs are won at their venues. */
export function PackSheet() {
  const premium = useApp((s) => s.premium);
  const mine = useApp((s) => s.profile.cardPack);
  const c = useCampaign();
  const pick = (id: string | undefined) => {
    haptic('light');
    const pack = id ? packById(id) : undefined;
    if (id && !pack?.venue && !premium) {
      // After buying, put the pack on and come back here.
      openPremium('packs', () => {
        setProfile({ cardPack: id });
        openSheet({ name: 'packs' });
      });
      return;
    }
    setProfile({ cardPack: id });
  };
  const premiumRows: { id: string | undefined; name: string; note: string; venue?: string }[] = [{ id: undefined, name: 'Classic', note: 'The plain dark back' }, ...CARD_PACKS.filter((p) => !p.venue)];
  const trophies = CARD_PACKS.filter((p) => p.venue);
  const row = (r: { id: string | undefined; name: string; note: string; venue?: string }) => {
    const on = (mine ?? undefined) === r.id;
    const won = !!r.venue && c.stats.wonAt.includes(r.venue);
    const locked = r.venue ? !won : !!r.id && !premium;
    return (
      <button key={r.id ?? 'classic'} type="button" className="group-row press pack-row" role="radio" aria-checked={on} onClick={() => pick(r.id)}>
        <span className={`pack-row-pic${r.venue && !won ? ' pack-unwon' : ''}`}>
          <PlayingCard back size="md" pack={r.id} />
        </span>
        <span className="gr-text">
          {r.name}
          <small>{r.venue && won ? 'Won in the campaign' : r.note}</small>
        </span>
        {locked ? (
          <LockIcon className="prem-lock" width={18} height={18} aria-label={r.venue ? 'Not won yet' : 'Premium'} />
        ) : on ? (
          <CheckIcon className="prem-on" width={20} height={20} aria-label="Selected" />
        ) : null}
      </button>
    );
  };
  return (
    <Sheet title="Card packs">
      <div className="pack-preview" aria-hidden>
        <PlayingCard back size="lg" pack={mine} className="tilt-l" />
        <PlayingCard back size="lg" pack={mine} className="tilt-r" />
      </div>
      <p className="muted" style={{ margin: '0 0 12px' }}>
        You see it when your cards turn over. Everyone at an online table sees it on the back of your cards.
      </p>
      <div className="group">{premiumRows.map(row)}</div>
      <p className="menu-section">Campaign trophies</p>
      <div className="group">{trophies.map(row)}</div>
      <button type="button" className="btn btn-dark" style={{ marginTop: 20 }} onClick={closeSheet}>
        Done
      </button>
    </Sheet>
  );
}
