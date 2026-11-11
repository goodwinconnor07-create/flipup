// What FlipUp Premium gives you, as one list: the Premium page's grid, the detail sheet (`premium-perk`) and the
// reasons a locked thing opens the page with (`?reason=`) all read it.
import type { IconName } from '@/components/icon';
import { BOTS, CARD_PACKS, FREE_BOT_NAMES, FREE_VARIANTS, VARIANTS } from '@/engine';

export type PerkId = 'games' | 'range' | 'bots' | 'ultra' | 'replay' | 'share' | 'gold' | 'packs';

export interface Perk {
  id: PerkId;
  icon: IconName;
  title: string;
  /** Under the title on the grid: a few words. */
  short: string;
  /** The detail sheet's line. */
  about: string;
}

const games = VARIANTS.length - FREE_VARIANTS;
const packs = CARD_PACKS.filter((p) => !p.venue).length;

export const PERKS: Perk[] = [
  { id: 'range', icon: 'chart.line.uptrend.xyaxis', title: 'Every range hand', short: 'Free: 1 quiz a day', about: 'Free gets one set of five hands a day. Premium opens every hand, as many sets as you like, and practice on the spots you miss.' },
  { id: 'bots', icon: 'person.3.fill', title: `${BOTS.length - FREE_BOT_NAMES.length}+ more bots`, short: `Free: ${FREE_BOT_NAMES.length} bots`, about: `Free tables use the original ${FREE_BOT_NAMES.length} bots, one of each style. Premium opens the whole roster, every style and every name.` },
  { id: 'games', icon: 'suit.spade.fill', title: `${games} more games`, short: 'Host every mini game', about: 'Host Pineapple, Ghost, Pittsburgh, Imposter and the rest. Friends join them free.' },
  { id: 'replay', icon: 'film.stack.fill', title: 'Replay', short: 'Save and rewatch hands', about: 'Tap Save hand at any table, bots or online, and watch it back move by move from your hand bank.' },
  { id: 'share', icon: 'square.and.arrow.up', title: 'Share cards', short: '4 more designs', about: 'Turn your best hands, games and stats into a picture: Felt, Gold Foil, Receipt and Poster.' },
  { id: 'gold', icon: 'signature', title: 'Gold name', short: 'Stand out online', about: 'Your name shows in gold to everyone at an online table. Turn it off in Settings any time.' },
  { id: 'packs', icon: 'paintpalette.fill', title: `${packs} card backs`, short: 'Everyone sees them', about: 'Gold Rush, Neon Grid, Holo, Galaxy and more on the back of your cards, for the whole table.' },
];

export const perkById = (id: string | undefined): Perk | undefined => PERKS.find((p) => p.id === id);

/** What a locked tap opens the page with, and the perk it puts first. */
export type Reason = 'game' | 'training' | 'bots' | 'pack' | 'ultra' | 'replay' | 'share' | 'gold';
export const REASON_PERK: Record<Reason, PerkId> = { game: 'games', training: 'range', bots: 'bots', pack: 'packs', ultra: 'ultra', replay: 'replay', share: 'share', gold: 'gold' };
export const isReason = (v: unknown): v is Reason => typeof v === 'string' && v in REASON_PERK;
