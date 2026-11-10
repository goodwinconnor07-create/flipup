// The Stats tab's Poker page, after Flighty's Passport: a deep blue passport of your numbers, a gold card for your
// table wins, light cards for your best hand and the game you play most, the Premium strip, and the games you play
// as a list. Every card is still (no drifting glows): the page is about the numbers. Counted on this phone.
import { router } from 'expo-router';
import { Platform, Text, useWindowDimensions, View } from 'react-native';

import { variantInfo, type Variant } from '@/engine';
import { usePokerRecord, type PokerRecord } from '@/state/record';
import { usePremium } from '@/state/premium';
import { spacing, useColors, useScheme } from '@/theme';
import { FREE_VARIANTS, VARIANTS } from '@/engine';

import { GamePicture, GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';
import { ListHeader, ListRow } from '../tab-list';
import { PlayingCard } from '../table/playing-card';

const n = (v: number) => v.toLocaleString('en-US');
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const ordinal = (p: number) => (p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`);

/** Flighty sets the passport's labels in a DIN-like face; iOS ships DIN Alternate. The web build uses the system font. */
const DIN = Platform.select({ ios: 'DINAlternate-Bold', default: undefined });
const RADIUS = 22;
/** Flighty's passport blue, from deep navy at the top right into a brighter blue at the bottom left. */
const PASSPORT = ['#0d1244', '#13246b', '#1e3f93'] as const;
/** The table wins card: Flighty's deep red delays card, in FlipUp's gold (wins are gold). */
const WINS = ['#a8670c', '#7c4806', '#4f2c03'] as const;

export function PokerStats({ shareCard, onShare }: { shareCard: React.ReactNode; onShare: () => void }) {
  const record = usePokerRecord();
  const premium = usePremium();
  return (
    <View style={{ gap: spacing.xs }}>
      {shareCard}
      <Passport record={record} onShare={onShare} />
      {record.games.length > 0 && <TableWins record={record} />}
      {record.best && <BestHand best={record.best} />}
      <MostPlayed record={record} />
      {!premium && <PremiumStrip />}
      <GamesYouPlay record={record} />
    </View>
  );
}

function ShareIcon({ onPress, label, color = '#ffffff' }: { onPress: () => void; label: string; color?: string }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} haptics={false} onPress={onPress} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -6, marginTop: -4 }}>
      <Icon name="square.and.arrow.up" size={21} color={color} weight="regular" />
    </PressableScale>
  );
}

/** Flighty's passport: small spaced capitals in DIN, big bold numbers, two rows of stats. */
function Passport({ record, onShare }: { record: PokerRecord; onShare: () => void }) {
  const wins = record.games.filter((g) => g.place === 1).length;
  return (
    <LivingCard still colors={PASSPORT} radius={RADIUS} style={{ padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: DIN, fontSize: 21, letterSpacing: 0.6, color: '#ffffff', fontWeight: DIN ? undefined : '600' }}>
            ALL-TIME FLIPUP PASSPORT
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="suit.spade.fill" size={12} color="rgba(255,255,255,0.7)" />
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: DIN, fontSize: 14, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' }}>
              POKER • PÓQUER • POKER
            </Text>
          </View>
        </View>
        <ShareIcon label="Share your poker stats" onPress={onShare} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat label="Hands" value={n(record.hands)} note={`${n(record.won)} won`} big grow={4} />
        <Stat label="Biggest pot" value={n(record.biggestPot)} note="chips in one hand" big grow={6} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat label="Win rate" value={`${pct(record.won, record.hands)}%`} grow={4} />
        <Stat label="Games" value={n(record.games.length)} grow={3} />
        <Stat label="Wins" value={n(wins)} grow={3} />
      </View>
    </LivingCard>
  );
}

function Stat({ label, value, note, big, grow }: { label: string; value: string; note?: string; big?: boolean; grow: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`} style={{ flex: grow, gap: 2, paddingRight: spacing.xs }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: DIN, fontSize: 15, letterSpacing: 0.6, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: big ? 40 : 27, lineHeight: big ? 46 : 33, fontWeight: '700', letterSpacing: big ? -0.6 : -0.2, color: '#ffffff', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      {note ? (
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: DIN, fontSize: 16, color: 'rgba(255,255,255,0.72)' }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Flighty's "2 hours lost from delays", for wins: a huge number, a line, and a coloured line under it. */
function TableWins({ record }: { record: PokerRecord }) {
  const wins = record.games.filter((g) => g.place === 1).length;
  const podium = record.games.filter((g) => g.place <= 3).length;
  return (
    <LivingCard still colors={WINS} radius={RADIUS} style={{ padding: spacing.md, paddingBottom: spacing.lg, gap: 2 }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 64, lineHeight: 72, fontWeight: '700', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
        {n(wins)}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 22, lineHeight: 28, fontWeight: '600', color: '#ffffff' }}>
        {wins === 1 ? 'table won' : 'tables won'}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 23, color: '#f7cf7a' }}>
        Top three in {podium} of {n(record.games.length)} {record.games.length === 1 ? 'game' : 'games'}
      </Text>
    </LivingCard>
  );
}

/** The light card (Flighty's most flown aircraft): a heading, a big name, a line, and a picture. */
function LightCard({ heading, name, line, children, button }: { heading: string; name: string; line: string; children?: React.ReactNode; button?: { label: string; onPress: () => void } }) {
  const dark = useScheme() === 'dark';
  const ink = dark ? '#dfe6ff' : '#1d2f6f';
  const colors = dark ? (['#1c2142', '#1a2547', '#18304f'] as const) : (['#e6e3f8', '#d3daf6', '#bcd6f4'] as const);
  return (
    <LivingCard still shadow="soft" colors={colors} radius={RADIUS} style={{ padding: spacing.md, gap: 2, borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 22, lineHeight: 28, fontWeight: '600', color: ink }}>
        {heading}
      </Text>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 40, lineHeight: 48, fontWeight: '500', color: ink }}>
        {name}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 20, lineHeight: 25, color: ink, opacity: 0.6 }}>
        {line}
      </Text>
      {children ? <View style={{ paddingTop: spacing.md }}>{children}</View> : null}
      {button ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={button.label}
          onPress={() => {
            haptic.tap();
            button.onPress();
          }}
          outerStyle={{ marginTop: spacing.md }}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 12, borderCurve: 'continuous', backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(40,70,160,0.14)' }}
        >
          <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 17, fontWeight: '500', color: ink }}>
            {button.label}
          </Text>
          <Icon name="chevron.right" size={15} color={ink} />
        </PressableScale>
      ) : null}
    </LivingCard>
  );
}

function BestHand({ best }: { best: NonNullable<PokerRecord['best']> }) {
  // The detail reads "Full house, kings full of sevens": the first part is the name, the rest the line under it.
  const [name, ...rest] = best.name.split(', ');
  const more = rest.join(', ');
  const game = variantInfo(best.variant).name;
  return (
    <LightCard heading="Best hand" name={name} line={more ? `${more.charAt(0).toUpperCase()}${more.slice(1)} · ${game}` : game}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {best.cards.map((c) => (
          <PlayingCard key={c} card={c} size="md" width={54} />
        ))}
      </View>
    </LightCard>
  );
}

function mostPlayed(record: PokerRecord): { variant: Variant; games: number; best: number } | null {
  const by = new Map<Variant, { games: number; best: number }>();
  for (const g of record.games) {
    const r = by.get(g.variant) ?? { games: 0, best: 99 };
    by.set(g.variant, { games: r.games + 1, best: Math.min(r.best, g.place) });
  }
  const top = [...by.entries()].sort((a, b) => b[1].games - a[1].games)[0];
  return top ? { variant: top[0], ...top[1] } : null;
}

function MostPlayed({ record }: { record: PokerRecord }) {
  const { width } = useWindowDimensions();
  const top = mostPlayed(record);
  if (!top) return null;
  const w = Math.min(width, 560) - spacing.md * 4;
  return (
    <LightCard
      heading="Most played game"
      name={variantInfo(top.variant).name}
      line={`${top.games} ${top.games === 1 ? 'game' : 'games'} · best ${ordinal(top.best)}`}
      button={{ label: 'Play It Again', onPress: () => router.push(`/game/${top.variant}`) }}
    >
      <GamePicture variant={top.variant} width={w} height={Math.round(w * 0.42)} rounded={14} />
    </LightCard>
  );
}

const PREMIUM_GAMES = VARIANTS.length - FREE_VARIANTS;

/** Flighty's PRO strip, in Premium's gold: an outlined row with a badge, a title, a chevron and a line. */
function PremiumStrip() {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`FlipUp Premium. ${PREMIUM_GAMES} more games and card packs`}
      onPress={() => {
        haptic.tap();
        router.push('/premium');
      }}
      outerStyle={{ marginTop: spacing.lg }}
      style={{ gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.goldBg }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.gold }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.6, color: '#3b2300' }}>
            PREMIUM
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontSize: 20, fontWeight: '600', color: colors.goldInk }}>
          {PREMIUM_GAMES} More Games
        </Text>
        <Icon name="chevron.right" size={15} color={colors.goldInk} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, color: colors.goldInk }}>
        Plus card packs. One payment, yours to keep.
      </Text>
    </PressableScale>
  );
}

/** Flighty's Past Flights, by game: each game you play, how often, and your best finish. */
function GamesYouPlay({ record }: { record: PokerRecord }) {
  const colors = useColors();
  if (!record.games.length) return null;
  const by = new Map<Variant, { games: number; wins: number; best: number }>();
  for (const g of record.games) {
    const r = by.get(g.variant) ?? { games: 0, wins: 0, best: 99 };
    by.set(g.variant, { games: r.games + 1, wins: r.wins + (g.place === 1 ? 1 : 0), best: Math.min(r.best, g.place) });
  }
  const rows = [...by.entries()].sort((a, b) => b[1].games - a[1].games);
  return (
    <View style={{ paddingTop: spacing.lg, paddingHorizontal: 0 }}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.label }}>
        Games You Play
      </Text>
      <ListHeader title="All-Time" count={`${record.games.length} ${record.games.length === 1 ? 'game' : 'games'}`} />
      {rows.map(([v, r], i) => (
        <ListRow
          key={v}
          leading={<GameThumb variant={v} size={44} />}
          eyebrow={`${r.games} ${r.games === 1 ? 'game' : 'games'} · best ${ordinal(r.best)}`}
          when={r.wins ? `${r.wins} ${r.wins === 1 ? 'win' : 'wins'}` : undefined}
          title={variantInfo(v).name}
          separator={i < rows.length - 1}
          label={`${variantInfo(v).name}: ${r.games} games, ${r.wins} won. Play it`}
          onPress={() => router.push(`/game/${v}`)}
        />
      ))}
    </View>
  );
}
