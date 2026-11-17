// What FlipUp Premium gives you, as one list: the Premium page's grid, the detail sheet (`premium-perk`) and the
// reasons a locked thing opens the page with (`?reason=`) all read it.
import type { IconName } from '@/components/icon';
import { SHARE_DESIGNS } from '@/components/share/designs';
import { CARD_PACKS, FREE_BOT_NAMES, FREE_VARIANTS, MAX_LAB_BOTS, VARIANTS } from '@/engine';

export type PerkId = 'games' | 'range' | 'botlab' | 'share' | 'gold' | 'packs';

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
const packs = CARD_PACKS.length;
/** The share card designs Premium adds, by name: "Felt, Gold Foil, ... and Broadcast". */
const designs = SHARE_DESIGNS.filter((d) => d.premium).map((d) => d.name);
const designList = designs.length > 1 ? `${designs.slice(0, -1).join(', ')} and ${designs[designs.length - 1]}` : designs.join('');

export const PERKS: Perk[] = [
  { id: 'range', icon: 'chart.line.uptrend.xyaxis', title: 'Every range hand', short: 'Free: 1 hand a day', about: 'Free gets one hand a day. Premium opens every hand: Endless, as many sets as you like, and Gaps, practice on the spots you miss.' },
  // Bot Lab took the roster's place in the list (the owner, 17 Nov 2026); every other bot is still Premium and said here.
  { id: 'botlab', icon: 'flask.fill', title: 'Bot Lab', short: 'Make your own bots', about: `Make up to ${MAX_LAB_BOTS} bots of your own: a name, a face and dials for how they play and talk. Seat them at any table you host. Premium also opens every other bot (free tables get the original ${FREE_BOT_NAMES.length}).` },
  { id: 'games', icon: 'suit.spade.fill', title: `${games} more games`, short: 'Host every mini game', about: 'Host Pineapple, Ghost, Pittsburgh and the rest. Friends join them free.' },
  { id: 'share', icon: 'square.and.arrow.up', title: 'Share cards', short: `${designs.length} more designs`, about: `Turn your best hands, games and stats into a picture: ${designList}.` },
  { id: 'gold', icon: 'signature', title: 'Gold name', short: 'Stand out online', about: 'Your name shows in gold to everyone at an online table. Turn it off in Settings any time.' },
  { id: 'packs', icon: 'paintpalette.fill', title: `${packs} card backs`, short: 'Everyone sees them', about: 'Gold Rush, Neon Grid, Holo, Galaxy and more on the back of your cards, for the whole table.' },
];

export const perkById = (id: string | undefined): Perk | undefined => PERKS.find((p) => p.id === id);

/** What a locked tap opens the page with, and the perk it puts first. */
export type Reason = 'game' | 'training' | 'bots' | 'botlab' | 'pack' | 'share' | 'gold';
export const REASON_PERK: Record<Reason, PerkId> = { game: 'games', training: 'range', bots: 'botlab', botlab: 'botlab', pack: 'packs', share: 'share', gold: 'gold' };
export const isReason = (v: unknown): v is Reason => typeof v === 'string' && v in REASON_PERK;
