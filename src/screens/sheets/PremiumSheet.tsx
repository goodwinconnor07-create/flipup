import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BUBBLE_STYLES, CARD_PACKS, legendById, LEGENDS, type Legend } from '../../game';
import { PREMIUM_PERKS, PREMIUM_PRICE, type PremiumReason } from '../../state/premium';
import { buyPremium, closeSheet, openSheet, restorePremium, toast, useApp } from '../../state/store';
import { PlayingCard, Sheet } from '../../ui/components';
import { confetti, haptic } from '../../ui/effects';
import { CheckIcon, CloseIcon, CrownIcon } from '../../ui/Icons';
import { CONFETTI_COLORS } from '../../ui/theme';
import { LEGEND_SCENES } from '../botScenes';

/** A sample chat bubble in one of the Premium colours. */
export function BubbleChip({ id, children }: { id: string; children: string }) {
  return <span className={`bubble-chip bubble-fx fx-${id}`}>{children}</span>;
}

/** A legend's emoji in a round frame, on their backdrop colour. */
export function LegendFace({ legend, size }: { legend: Legend; size: number }) {
  const scene = LEGEND_SCENES[legend.id];
  return (
    <span
      className="legend-face"
      style={{ width: size, height: size, background: `linear-gradient(180deg, ${scene.bg[0]}, ${scene.bg[1]})` }}
      aria-hidden
    >
      <span style={{ fontSize: size * 0.6 }}>{legend.emoji}</span>
    </span>
  );
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

/** Bubble colours, emoji and legends floating round the fan of card backs. */
function Burst() {
  const legends = ['brunson', 'ivey', 'dwan'].map((id) => legendById(id)!);
  const at = (x: number, y: number, rot: number, delay: number): CSSProperties => ({
    ['--x' as string]: `${x}%`,
    ['--y' as string]: `${y}px`,
    ['--r' as string]: `${rot}deg`,
    ['--d' as string]: `${delay}ms`,
  });
  return (
    <div className="burst" aria-hidden>
      <span className="burst-item" style={at(50, 22, 0, 120)}>
        {legends[1] && <LegendFace legend={legends[1]} size={84} />}
      </span>
      <span className="burst-item" style={at(24, 62, -8, 220)}>
        {legends[0] && <LegendFace legend={legends[0]} size={58} />}
      </span>
      <span className="burst-item" style={at(76, 62, 8, 280)}>
        {legends[2] && <LegendFace legend={legends[2]} size={58} />}
      </span>
      <span className="burst-item" style={at(21, 150, -10, 340)}>
        <BubbleChip id="rainbow">Nice hand</BubbleChip>
      </span>
      <span className="burst-item" style={at(80, 168, 7, 400)}>
        <BubbleChip id="gold">All in</BubbleChip>
      </span>
      <span className="burst-item burst-emoji" style={at(9, 14, -12, 460)}>
        🦄
      </span>
      <span className="burst-item burst-emoji" style={at(89, 124, 10, 520)}>
        🐉
      </span>
      <span className="burst-item" style={at(91, 52, 9, 580)}>
        <PlayingCard back size="md" pack="holo" />
      </span>
      <span className="burst-item" style={at(9, 78, -9, 640)}>
        <PlayingCard back size="md" pack="gold" />
      </span>
    </div>
  );
}

/** The showcase cards under the fan. The one for what the player tapped comes first. */
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
    emoji: (
      <div className="show-emoji">
        {['🦄', '🐉', '🥷', '🛸', '🧛', '🪩', '🦖', '👽'].map((e) => (
          <span key={e}>{e}</span>
        ))}
        <b>Type any emoji</b>
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
    legends: (
      <div className="show-legends">
        {LEGENDS.map((l) => (
          <span key={l.id}>
            <LegendFace legend={l} size={46} />
            <small>{l.short}</small>
          </span>
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
  emoji: 'Use any emoji as your face, not just the ones in the grid.',
  legends: 'Sit the AI Legends down at your table.',
};

/** FlipUp Premium: opens when someone taps a Premium extra, or from Profile. One payment of $9. */
export function PremiumSheet({ reason, then }: { reason?: PremiumReason; then?: () => void }) {
  const owned = useApp((s) => s.premium);
  const [phase, setPhase] = useState<'offer' | 'paying' | 'done'>('offer');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const buy = async () => {
    if (phase !== 'offer') return;
    haptic('medium');
    setPhase('paying');
    const ok = await buyPremium();
    if (!alive.current) return;
    if (!ok) {
      setPhase('offer');
      return toast("The payment didn't go through. You haven't been charged.", 'error');
    }
    setPhase('done');
    haptic('success');
    confetti(CONFETTI_COLORS.gold, undefined, 140);
  };

  const restore = async () => {
    haptic('light');
    const ok = await restorePremium();
    if (!alive.current) return;
    if (ok) {
      setPhase('done');
      haptic('success');
    } else toast('No earlier purchase found on this account.');
  };

  // Done with the offer: close it, then carry on with what the player was doing.
  const carryOn = () => {
    closeSheet();
    then?.();
  };

  const has = owned || phase === 'done';

  return (
    <Sheet className="sheet-premium" label="FlipUp Premium">
      <button type="button" className="prem-close press" aria-label="Close" onClick={closeSheet}>
        <CloseIcon width={18} height={18} />
      </button>

      <div className="prem-hero">
        <span className="prem-rays" aria-hidden />
        <span className="prem-stars" aria-hidden />
        <Burst />
        <CardFan />
      </div>

      <div className="prem-body">
        <span className="prem-badge">
          <CrownIcon width={14} height={14} /> FlipUp Premium
        </span>
        <h1 className="prem-title">{has ? (phase === 'done' ? "It's yours!" : "You're Premium") : LEAD[reason ?? 'none']}</h1>
        <p className="prem-sub">
          {has
            ? phase === 'done'
              ? 'Everything is unlocked. Thank you for backing FlipUp.'
              : 'All of this is unlocked on your account.'
            : 'Four upgrades for the table, yours for good.'}
        </p>

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
            <button type="button" className="prem-cta" disabled={phase === 'paying'} onClick={() => void buy()}>
              {phase === 'paying' ? (
                <>
                  <span className="prem-spin" aria-hidden /> Unlocking…
                </>
              ) : (
                <>
                  Get FlipUp Premium <b>{PREMIUM_PRICE}</b>
                </>
              )}
            </button>
            <p className="prem-fine">One-time payment of {PREMIUM_PRICE}. Not a subscription.</p>
            <button type="button" className="prem-link" disabled={phase === 'paying'} onClick={() => void restore()}>
              Restore purchase
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
