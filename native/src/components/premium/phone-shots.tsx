// The Premium page's pictures, after the App Store's screenshots (the owner, 17 Nov 2026): each perk shown on an
// iPhone, the way the store listing shows the app. The phone is drawn (a black titanium frame, the Dynamic Island,
// a 9:41 status bar), and its screen is the app itself: a real screenshot where we have one (How to Play's), or
// the app's own pieces laid out at the iPhone 17 Pro's 402 points and scaled to the frame, so it's the app's type,
// panels and colours, not a drawing of them. Nothing on these screens can be tapped.
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { DialSlider } from '@/components/bot-lab/dial-slider';
import { Face } from '@/components/bot-lab/face';
import { GameThumb } from '@/components/game-picture';
import { FloatTable } from '@/components/setup/float-table';
import { CoachLine, ReviewCard } from '@/components/replay/review';
import { PlayingCard } from '@/components/table/playing-card';
import type { ReviewedMove } from '@/state/hand-review';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS, FREE_VARIANTS, LAB_DIALS, labPersona, VARIANTS, type LabDials } from '@/engine';
import { brand, gradient, ROUNDED, spacing } from '@/theme';

import { PANEL_RADIUS } from '../grouped-list';
import { Icon } from '../icon';
import type { PerkId } from './perks';

/** The screen the pictures are laid out on: an iPhone 17 Pro, in points. */
const SCREEN_W = 402;
const SCREEN_H = 874;
/** The app's dark blue page, still (the moving one stays on the real page around the phone). */
const PAGE = 'linear-gradient(180deg, #0d2160 0%, #081433 45%, #050b1f 100%)';
const PANEL = 'rgba(255,255,255,0.085)';
const EDGE = 'rgba(255,255,255,0.1)';

/** A drawn iPhone `width` wide with `screen` on it; `show` is how much of its height is drawn (the rest is cut off below). */
export function PhoneFrame({ width, show = 1, children }: { width: number; show?: number; children: ReactNode }) {
  const bezel = Math.round(width * 0.034);
  const inner = width - bezel * 2;
  const k = inner / SCREEN_W;
  const outerR = width * 0.155;
  const innerR = outerR - bezel;
  const height = (SCREEN_H * k + bezel * 2) * show;
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <View style={{ width, height: SCREEN_H * k + bezel * 2, borderRadius: outerR, borderCurve: 'continuous', padding: bezel, backgroundColor: '#0b0b0e', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', boxShadow: '0 24px 50px rgba(0,0,0,0.55)' }}>
        <View style={{ flex: 1, borderRadius: innerR, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#000000' }}>
          <View pointerEvents="none" style={{ width: SCREEN_W, height: SCREEN_H, transform: [{ scale: k }], transformOrigin: 'top left' }}>
            {children}
          </View>
          {/* The Dynamic Island, over whatever the screen shows. */}
          <View style={{ position: 'absolute', top: 11 * k, alignSelf: 'center', width: 124 * k, height: 36 * k, borderRadius: 18 * k, backgroundColor: '#000000' }} />
        </View>
      </View>
    </View>
  );
}

/** The screen for each perk. */
export function PerkScreen({ id }: { id: PerkId }) {
  switch (id) {
    case 'games':
      return <GamesScreen />;
    case 'review':
      return <ReviewScreen />;
    case 'botlab':
      return <BotLabScreen />;
    case 'range':
      return <RangeScreen />;
    case 'gold':
      return <GoldScreen />;
    case 'packs':
      return <PacksScreen />;
  }
}

/** The app's page with its status bar and a title row like `NavRow`. */
function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={[{ width: SCREEN_W, height: SCREEN_H, paddingHorizontal: spacing.md }, gradient(PAGE)]}>
      <StatusBar />
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Icon name="chevron.left" size={22} weight="semibold" color={brand.violetDark} />
        <Text style={{ fontSize: 17, color: brand.violetDark, marginLeft: 4 }}>Back</Text>
        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#ffffff' }}>{title}</Text>
        </View>
      </View>
      <View style={{ gap: spacing.lg }}>{children}</View>
    </View>
  );
}

function StatusBar() {
  return (
    <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 6 }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: '#ffffff', width: 60, textAlign: 'center' }}>9:41</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 }}>
          {[4, 6, 8, 10].map((h) => (
            <View key={h} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: '#ffffff' }} />
          ))}
        </View>
        <View style={{ width: 25, height: 12, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 1.5 }}>
          <View style={{ flex: 1, borderRadius: 2, backgroundColor: '#ffffff' }} />
        </View>
      </View>
    </View>
  );
}

function Heading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: ROUNDED, fontSize: 22, fontWeight: '800', color: '#ffffff' }}>{title}</Text>
      {detail && <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{detail}</Text>}
    </View>
  );
}

function Panel({ children, pad = spacing.sm }: { children: ReactNode; pad?: number }) {
  return <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: PANEL, borderWidth: 1, borderColor: EDGE, padding: pad }}>{children}</View>;
}

const noop = () => undefined;

/** Bot Lab's editor with a bot being made: its face, its name, what kind of player it is, and its dials. */
const SAMPLE_DIALS: LabDials = { hands: 3, aggression: 8, bluffing: 7, calling: 4, skill: 9, temper: 2, speed: 6, chat: 7, tone: 'trash' };
function BotLabScreen() {
  return (
    <Page title="New bot">
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Face emoji="🦅" size={104} />
        <Text style={{ fontFamily: ROUNDED, fontSize: 34, fontWeight: '800', color: '#ffffff' }}>Hawk</Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{labPersona(SAMPLE_DIALS)}</Text>
      </View>
      <Heading title="How it plays" />
      <Panel pad={spacing.md}>
        <View style={{ gap: spacing.md }}>
          {LAB_DIALS.slice(0, 4).map((d) => (
            <DialSlider key={d.id} dial={d} value={SAMPLE_DIALS[d.id]} onChange={noop} />
          ))}
        </View>
      </Panel>
    </Page>
  );
}

/** The online lobby, your name in gold among the people who joined. */
function GoldScreen() {
  return (
    <Page title="Lobby">
      <Panel pad={spacing.md}>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>Game code</Text>
        <Text style={{ fontFamily: ROUNDED, fontSize: 44, fontWeight: '800', color: '#ffffff', letterSpacing: 2 }}>ACES42</Text>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
          {['Copy', 'QR', 'Share'].map((t) => (
            <Text key={t} style={{ fontSize: 17, fontWeight: '600', color: brand.violetDark }}>
              {t}
            </Text>
          ))}
        </View>
      </Panel>
      <Heading title="Players" detail="4 people" />
      <Panel>
        <FloatTable
          seats={[
            { key: 'you', emoji: '😎', name: 'You', you: true, gold: true },
            { key: 'sam', emoji: '🦊', name: 'Sam', person: true },
            { key: 'ria', emoji: '🐼', name: 'Ria', person: true },
            { key: 'jo', emoji: '🐯', name: 'Jo', person: true },
          ]}
          canRemove={false}
          onHold={noop}
          onGone={noop}
        />
      </Panel>
    </Page>
  );
}

/** Every game Premium adds, together: the game modes page with each one's picture and name, nothing locked. */
function GamesScreen() {
  const games = VARIANTS.slice(FREE_VARIANTS);
  const size = Math.floor((SCREEN_W - spacing.md * 2 - spacing.sm * 2) / 3);
  return (
    <Page title="Game modes">
      <Heading title="Every game, unlocked" detail={`${games.length} games`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, rowGap: spacing.md }}>
        {games.map((g) => (
          <View key={g.id} style={{ width: size, alignItems: 'center', gap: 6 }}>
            <GameThumb variant={g.id} size={size} rounded={size * 0.24} />
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>
              {g.name}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

/** A range hand answered: the board, your cards, the plays, and the verdict. */
function RangeScreen() {
  return (
    <Page title="Daily hand">
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>RIVER · CHECKED TO YOU</Text>
        <Text style={{ fontFamily: ROUNDED, fontSize: 28, fontWeight: '800', color: '#ffffff' }}>Your move</Text>
      </View>
      <View style={[{ height: 170, borderRadius: 85, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 6, borderColor: '#0a1636' }, gradient('radial-gradient(circle at 50% 40%, #2b5fd9 0%, #163a9e 70%, #0d2668 100%)')]}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {(['Kh', 'Td', '7c', '4s', '2h'] as const).map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Pot 18 bb</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <PlayingCard card="Ks" size="xl" />
        <PlayingCard card="Qd" size="xl" />
      </View>
      <View style={{ borderRadius: 22, padding: spacing.md, gap: 6, backgroundColor: 'rgba(245,183,0,0.16)', borderWidth: 1, borderColor: 'rgba(245,183,0,0.5)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="checkmark.circle.fill" size={22} color={brand.gold} />
          <Text style={{ fontFamily: ROUNDED, fontSize: 22, fontWeight: '800', color: brand.gold }}>Best play: Bet ¾</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>Top pair is ahead of every hand that calls.</Text>
      </View>
    </Page>
  );
}

/** A sample hand's review at a bots table, from the replay's own pieces: the board, the line on a river fold, and the Review card. */
const SAMPLE_REVIEW: ReviewedMove[] = [
  { step: 3, street: 'preflop', move: 'raise', kind: 'exact', toCall: 10, pot: 15, price: null, equity: 0.64, callBb: null, holding: 'Ah 9h', title: '64% to win', line: 'Against their cards you had 64% to win, with 15 in the pot.' },
  { step: 6, street: 'flop', move: 'call', kind: 'exact', toCall: 40, pot: 100, price: 0.29, equity: 0.41, callBb: 1.7, holding: 'Pair of nines', title: '41% to win · needed 29%', line: 'Against their cards you had 41% to win, and the call needed 29% (40 into 60). On average, calling won 1.7 bb against those cards.' },
  { step: 9, street: 'river', move: 'fold', kind: 'exact', toCall: 60, pot: 180, price: 0.25, equity: 1, callBb: 18, holding: 'Pair of nines', title: '100% to win · needed 25%', line: 'Against their cards you had 100% to win, and the call needed 25% (60 into 120). On average, calling won 18 bb against those cards.' },
];
function ReviewScreen() {
  return (
    <Page title="Hand 14">
      <View style={[{ height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#0a1636' }, gradient('radial-gradient(circle at 50% 40%, #2b5fd9 0%, #163a9e 70%, #0d2668 100%)')]}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {(['Qh', '9c', '4d', '8s', '2h'] as const).map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </View>
      </View>
      <CoachLine move={SAMPLE_REVIEW[2]} still />
      <ReviewCard moves={SAMPLE_REVIEW} step={9} onJump={noop} />
    </Page>
  );
}

/** Card backs, as the Card backs sheet lists them. */
function PacksScreen() {
  const packs = CARD_PACKS.slice(0, 6);
  const tile = (SCREEN_W - spacing.md * 2 - spacing.sm) / 2;
  return (
    <Page title="Card backs">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {packs.map((p, i) => (
          <View key={p.id} style={{ width: tile, padding: spacing.sm, gap: 6, borderRadius: 20, backgroundColor: PANEL, borderWidth: i === 0 ? 3 : 1, borderColor: i === 0 ? brand.violetDark : EDGE }}>
            <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
              <PlayingCard back pack={p.id} width={64} />
            </View>
            <ThemedText variant="headline" numberOfLines={1}>
              {p.name}
            </ThemedText>
          </View>
        ))}
      </View>
    </Page>
  );
}
