import { type CSSProperties, type ReactNode } from 'react';
import { BUBBLE_STYLES, CARD_PACKS } from '../../game';
import { PREMIUM_ON_SALE, PREMIUM_PERKS, PREMIUM_PRICE, type PremiumReason } from '../../state/premium';
import { closeSheet, openSheet, useApp } from '../../state/store';
import { PlayingCard, Sheet } from '../../ui/components';
import { CheckIcon, CloseIcon, CrownIcon } from '../../ui/Icons';

/** A sample chat bubble in one of the Premium colours. */
export function BubbleChip({ id, children }: { id: string; children: string }) {
  return <span className={`bubble-chip bubble-fx fx-${id}`}>{children}</span>;
}

/** Every Premium card back fanned out in an arc that sways, each card bobbing in turn, with a gold glow behind. */
function CardFan() {
  const packs = CARD_PACKS.filter((p) => !p.venue);
  const mid = (packs.length - 1) / 2;
  return (
    <div className="card-fan" aria-hidden>
      <span className="card-fan-glow" />
      <div className="card-fan-arc">
        {packs.map((p, i) => (
          <span key={p.id} className="card-fan-slot" style={{ ['--a' as string]: `${(i - mid) * 5.5}deg`, ['--d' as string]: `${i * 140}ms` } as CSSProperties}>
            <PlayingCard back size="md" pack={p.id} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** What Premium unlocks, as a plain list under the fan. The one the player tapped comes first. */
function Showcase({ reason }: { reason?: PremiumReason }) {
  const cards: Record<PremiumReason, ReactNode> = {
    bubbles: (
      <div className="show-bubbles">
        {/* A taste of them: the card would overflow with all eleven. */}
        {BUBBLE_STYLES.filter((b) => !b.free)
          .slice(0, 6)
          .map((b) => (
            <BubbleChip key={b.id} id={b.id}>
              {b.name}
            </BubbleChip>
          ))}
        <span className="show-more">+{BUBBLE_STYLES.filter((b) => !b.free).length - 6} more</span>
      </div>
    ),
    packs: (
      <div className="show-packs">
        {CARD_PACKS.filter((p) => !p.venue)
          .slice(0, 5)
          .map((p) => (
            <PlayingCard key={p.id} back size="md" pack={p.id} />
          ))}
      </div>
    ),
  };
  const order = [...PREMIUM_PERKS].sort((a, b) => (a.id === reason ? -1 : b.id === reason ? 1 : 0));
  return (
    <div className="showcase" role="list">
      {order.map((perk) => (
        <article key={perk.id} role="listitem" className={`show-card${perk.id === reason ? ' pick' : ''}`}>
          {cards[perk.id]}
          <h3>{perk.title}</h3>
          <p>{perk.line}</p>
        </article>
      ))}
    </div>
  );
}

const LEAD: Record<PremiumReason | 'none', string> = {
  none: 'Make every table yours.',
  bubbles: 'Colour your bubbles. Everyone at the table sees them.',
  packs: 'Deal with a card back that shines.',
};

/** FlipUp Premium: opens when someone taps a Premium extra, or from Profile. One payment of $9. */
export function PremiumSheet({ reason, then }: { reason?: PremiumReason; then?: () => void }) {
  const has = useApp((s) => s.premium);

  // Done with the offer: close it, then carry on with what the player was doing.
  const carryOn = () => {
    closeSheet();
    then?.();
  };

  return (
    <Sheet className="sheet-premium" label="FlipUp Premium">
      <button type="button" className="prem-close press" aria-label="Close" onClick={closeSheet}>
        <CloseIcon width={18} height={18} />
      </button>

      <div className="prem-hero">
        <CardFan />
      </div>

      <div className="prem-body">
        <span className="prem-badge">
          <CrownIcon width={14} height={14} /> FlipUp Premium
        </span>
        <h1 className="prem-title">{has ? "You're Premium" : LEAD[reason ?? 'none']}</h1>
        <p className="prem-sub">{has ? 'All of this is unlocked on your account.' : 'Upgrades for the table, yours for good.'}</p>

        <Showcase reason={reason} />

        <ul className="prem-checks">
          {['Pay once, keep it forever', 'No subscription and no renewals', 'Works on every table you play'].map((t) => (
            <li key={t}>
              <span className="prem-tick" aria-hidden>
                <CheckIcon width={13} height={13} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="prem-dock">
        {has ? (
          <>
            <button type="button" className="prem-cta" onClick={carryOn}>
              {then ? 'Carry on' : 'Done'}
            </button>
            <button type="button" className="prem-link" onClick={() => openSheet({ name: 'bubbles' })}>
              Choose your bubble colour
            </button>
          </>
        ) : (
          <>
            <button type="button" className="prem-cta" disabled={!PREMIUM_ON_SALE}>
              {PREMIUM_ON_SALE ? (
                <>
                  Get FlipUp Premium <b>{PREMIUM_PRICE}</b>
                </>
              ) : (
                'Coming soon on the web'
              )}
            </button>
            <p className="prem-fine">One-time payment of {PREMIUM_PRICE}. Not a subscription.</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
