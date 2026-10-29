import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BUBBLE_STYLES, LEGENDS, type Legend } from '../../game';
import { PREMIUM_PERKS, PREMIUM_PRICE, type PremiumReason } from '../../state/premium';
import { buyPremium, closeSheet, openSheet, restorePremium, toast, useApp } from '../../state/store';
import { Sheet } from '../../ui/components';
import { confetti, haptic } from '../../ui/effects';
import { CheckIcon, CloseIcon, CrownIcon } from '../../ui/Icons';
import { hasPortrait, LegendPortrait } from '../../ui/LegendPortraits';
import { CONFETTI_COLORS } from '../../ui/theme';
import { LEGEND_SCENES } from '../botScenes';

/** A sample chat bubble in one of the Premium colours. */
export function BubbleChip({ id, children }: { id: string; children: string }) {
  return <span className={`bubble-chip bubble-fx fx-${id}`}>{children}</span>;
}

/** A legend's portrait in a round frame. */
export function LegendFace({ legend, size }: { legend: Legend; size: number }) {
  const scene = LEGEND_SCENES[legend.id];
  return (
    <span
      className="legend-face"
      style={{ width: size, height: size, background: `linear-gradient(180deg, ${scene.bg[0]}, ${scene.bg[1]})` }}
      aria-hidden
    >
      {hasPortrait(legend.id) ? (
        <LegendPortrait id={legend.id} className="legend-portrait" />
      ) : (
        <span style={{ fontSize: size * 0.6 }}>{legend.emoji}</span>
      )}
    </span>
  );
}

/** The treasure chest: a gold glow behind it, the lid opens, coins show. `open` plays the opening. */
function Chest({ open }: { open: boolean }) {
  return (
    <div className={`chest${open ? ' open' : ''}`} aria-hidden>
      <span className="chest-glow" />
      <svg viewBox="0 0 160 130" className="chest-art" focusable="false">
        <defs>
          <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--prem-wood-hi)" />
            <stop offset="1" stopColor="var(--prem-wood-lo)" />
          </linearGradient>
          <linearGradient id="chestGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--prem-gold-1)" />
            <stop offset="0.5" stopColor="var(--prem-gold-2)" />
            <stop offset="1" stopColor="var(--prem-gold-3)" />
          </linearGradient>
        </defs>
        {/* Gold piled inside, lit from above. */}
        <ellipse cx="80" cy="64" rx="56" ry="14" fill="url(#chestGold)" />
        <circle cx="52" cy="58" r="8" fill="url(#chestGold)" stroke="var(--prem-gold-4)" strokeWidth="1.5" />
        <circle cx="72" cy="52" r="9" fill="url(#chestGold)" stroke="var(--prem-gold-4)" strokeWidth="1.5" />
        <circle cx="96" cy="54" r="9" fill="url(#chestGold)" stroke="var(--prem-gold-4)" strokeWidth="1.5" />
        <circle cx="114" cy="60" r="7" fill="url(#chestGold)" stroke="var(--prem-gold-4)" strokeWidth="1.5" />
        {/* The lid swings up on its back edge. */}
        <g className="chest-lid">
          <path
            d="M24 66c0-22 24-36 56-36s56 14 56 36H24Z"
            fill="url(#chestWood)"
            stroke="var(--prem-wood-line)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M24 66h112v8H24z" fill="url(#chestGold)" />
          <path d="M60 33v33M100 33v33" stroke="url(#chestGold)" strokeWidth="7" />
        </g>
        {/* The body. */}
        <path
          d="M22 70h116v44a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8V70Z"
          fill="url(#chestWood)"
          stroke="var(--prem-wood-line)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M22 70h116v10H22z" fill="url(#chestGold)" />
        <path d="M58 80v42M102 80v42" stroke="url(#chestGold)" strokeWidth="7" />
        <rect x="68" y="76" width="24" height="26" rx="6" fill="url(#chestGold)" stroke="var(--prem-gold-4)" strokeWidth="2.5" />
        <circle cx="80" cy="87" r="3.5" fill="var(--prem-wood-line)" />
        <path d="M80 89v8" stroke="var(--prem-wood-line)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Everything the chest throws out: bubble colours, emoji and legends, floating where they land. */
function Burst() {
  const legends = LEGENDS.filter((l) => hasPortrait(l.id)).slice(0, 3);
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
      <span className="burst-item burst-emoji" style={at(87, 118, 10, 520)}>
        🐉
      </span>
      <span className="burst-item burst-emoji" style={at(92, 58, 6, 580)}>
        🪩
      </span>
      <span className="burst-item burst-emoji" style={at(8, 106, -6, 640)}>
        👾
      </span>
    </div>
  );
}

/** The three showcase cards under the chest. The one for what the player tapped comes first. */
function Showcase({ reason }: { reason?: PremiumReason }) {
  const cards: Record<PremiumReason, ReactNode> = {
    bubbles: (
      <div className="show-bubbles">
        {BUBBLE_STYLES.map((b) => (
          <BubbleChip key={b.id} id={b.id}>
            {b.name}
          </BubbleChip>
        ))}
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
        <Chest open />
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
            : 'Three upgrades for the table, yours for good.'}
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
