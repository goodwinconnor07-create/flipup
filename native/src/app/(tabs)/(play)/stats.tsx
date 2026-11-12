import { router, Stack } from 'expo-router';
import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { ScrollView, Share, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { PassportCard } from '@/components/home/passport';
import { Icon } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { GameThumb } from '@/components/game-picture';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { AccuracyBars, BigNumber, ChipsLine, Heading, Meter, n, Pair, Panel, pct, signed, Tile, TileHead, WeekDots } from '@/components/stats/stat-parts';
import { streakInfo, variantInfo, type Card as PlayCard, type Variant } from '@/engine';
import { rangeStats, runOf, useRangeHistory } from '@/state/range-history';
import { usePokerRecord, type PokerRecord } from '@/state/record';
import { startExtremes, startWords, STYLE_AFTER, styleOf, type MoreStats, type StartLine } from '@/state/record-stats';
import { useReplays } from '@/state/replays';
import { brand, cardColors, ROUNDED, spacing, useColors, useShadows } from '@/theme';

const place = (p: number) => (p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`);

/**
 * Your stats, the way Flighty's Passport shows a year of flying: one big all-time card, then a group each (owner,
 * 12 Nov 2026): your style, chips (the line over your last 100 hands), all-ins and luck, streaks, your cards, training,
 * and the games you play. Tiles sit two to a row at equal sizes (`components/stats/stat-parts.tsx`). Everything here
 * is counted on this phone (`flipup.record`, the new groups in `record.more` from `state/record-stats.ts`).
 */
export default function StatsScreen() {
  const record = usePokerRecord();
  const colors = useColors();
  const more = record.more;
  const fresh = more.tracked === 0 && record.hands > 0;
  return (
    <>
      <Stack.Screen options={{ title: 'Your stats', headerLargeTitleEnabled: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}>
        {record.hands === 0 ? <NoHandsYet /> : <PassportCard full />}
        {fresh && (
          <ThemedText variant="footnote" tone="secondaryLabel" style={{ textAlign: 'center', paddingTop: spacing.xs }}>
            The new stats count from your next hand. Play a few and they fill in.
          </ThemedText>
        )}

        <StyleSection more={more} />
        <ChipsSection more={more} />
        <LuckSection more={more} />
        <StreakSection more={more} />
        <CardsSection record={record} />
        <TrainingSection more={more} />

        {record.hands > 0 && <GamesYouPlay record={record} />}

        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.md, color: colors.tertiaryLabel }}>
          Counted on this phone. Play chips only.
        </ThemedText>
      </ScrollView>
    </>
  );
}

/** Your poker personality, with how many hands you play and how hard you play them. */
function StyleSection({ more }: { more: MoreStats }) {
  const style = styleOf(more);
  const left = Math.max(0, STYLE_AFTER - more.tracked);
  return (
    <>
      <Heading title="Your style" />
      <Card colors={cardColors.violet} label="Your poker personality" onShare={style ? () => share(`My poker personality on FlipUp: ${style.name} ${style.emoji}`) : undefined}>
        {style ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 44, lineHeight: 52 }} accessible={false}>
                {style.emoji}
              </Text>
              <View style={{ flex: 1 }}>
                <Big>{style.name}</Big>
              </View>
            </View>
            <Faint>{style.line}</Faint>
            <View style={{ gap: spacing.md, paddingTop: spacing.xs }}>
              <Meter label="Hands you play" value={style.loose} shown={pct(style.loose)} left="Tight" right="Loose" />
              <Meter label="Aggression" value={style.aggression} shown={pct(style.aggression)} left="Passive" right="Wild" />
            </View>
          </>
        ) : (
          <>
            <Big>{left === STYLE_AFTER ? 'Play to find out' : `${left} ${left === 1 ? 'hand' : 'hands'} to go`}</Big>
            <Faint>After {STYLE_AFTER} hands you’ll see what kind of player you are: how many hands you play and how hard you play them.</Faint>
            <View style={{ paddingTop: spacing.xs }}>
              <Meter label="Hands so far" value={more.tracked / STYLE_AFTER} shown={`${more.tracked} of ${STYLE_AFTER}`} left="Start" right="Your style" />
            </View>
          </>
        )}
      </Card>
    </>
  );
}

/** The chips line over your last 100 hands, then what you've won, lost and come back from. */
function ChipsSection({ more }: { more: MoreStats }) {
  const c = more.comeback;
  return (
    <>
      <Heading title="Chips" />
      {more.nets.length > 0 && <ChipsLine nets={more.nets} />}
      <Pair>
        <Tile icon="dollarsign.circle.fill" tint="gold" label="Chips won" value={more.tracked ? n(more.chipsWon) : null} note="From every pot you took" />
        <Tile icon="chart.line.uptrend.xyaxis" label="Overall" value={more.tracked ? signed(more.net) : null} note="Chips won minus chips lost" />
      </Pair>
      <Pair>
        <Tile icon="arrow.down.right" tint="grey" label="Biggest pot lost" value={more.biggestLoss ? n(more.biggestLoss) : more.tracked ? '0' : null} note="The most you lost in one hand" />
        <Tile icon="arrow.uturn.up" tint="gold" label="Biggest comeback" value={c ? pct(c.low / c.start) : null} note={c ? `Won after dropping to ${n(c.low)} of ${n(c.start)}` : 'Win a table after being way down'} />
      </Pair>
    </>
  );
}

/** All-ins, and the times the cards still to come turned it round. */
function LuckSection({ more }: { more: MoreStats }) {
  const any = more.tracked > 0;
  return (
    <>
      <Heading title="All-ins and luck" />
      <Pair>
        <Tile icon="bolt.fill" label="All-in record" value={more.allIns ? `${more.allInWon}–${more.allInLost}` : any ? '0–0' : null} note={more.allIns ? `${n(more.allIns)} all-ins · ${pct(more.allInWon / more.allIns)} won` : 'Won and lost when you went all in'} />
        <Tile icon="heart.slash.fill" tint="grey" label="Bad beats" value={any ? n(more.badBeats) : null} note={more.worstBeat !== null ? `Worst: lost with ${pct(more.worstBeat)} to win` : 'Ahead all in, and still lost'} />
      </Pair>
      <Pair>
        <Tile icon="sparkles" tint="gold" label="Suckouts" value={any ? n(more.suckouts) : null} note={more.bestSuckout !== null ? `Luckiest: won with ${pct(more.bestSuckout)} to win` : 'Behind all in, and still won'} />
        <Tile icon="snowflake" tint="grey" label="Coolers" value={any ? n(more.coolers) : null} note="Lost with a full house or better" />
      </Pair>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
        Bad beats and suckouts count all-ins where every hand was face up, with your chance to win when the money went in.
      </ThemedText>
    </>
  );
}

/** Days in a row with a hand played, and your best and worst runs of hands. */
function StreakSection({ more }: { more: MoreStats }) {
  const info = streakInfo(more.days, new Date());
  const any = more.tracked > 0;
  return (
    <>
      <Heading title="Streaks" />
      <Panel label={`Daily streak: ${info.days} days. Record ${info.best} days.`}>
        <TileHead icon="flame.fill" tint="gold" label="Daily streak" />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
            <BigNumber size={34}>{n(info.days)}</BigNumber>
            <ThemedText variant="subhead" tone="tertiaryLabel">
              {info.days === 1 ? 'day' : 'days'}
            </ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText variant="footnote" tone="tertiaryLabel">
              Record
            </ThemedText>
            <ThemedText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
              {n(info.best)} {info.best === 1 ? 'day' : 'days'}
            </ThemedText>
          </View>
        </View>
        <ThemedText variant="footnote" tone="tertiaryLabel">
          {info.days === 0 ? 'Play a hand today to start one.' : info.today ? 'You’ve played today. See you tomorrow.' : 'Play a hand today to keep it going.'}
        </ThemedText>
        <View style={{ paddingTop: spacing.xs }}>
          <WeekDots week={info.week} />
        </View>
      </Panel>
      <Pair>
        <Tile icon="trophy.fill" tint="gold" label="Winning streak" value={any ? n(more.bestWinRun) : null} note={`Pots won in a row${more.winRun > 1 ? ` · on ${more.winRun} now` : ''}`} />
        <Tile icon="sun.max.fill" tint="grey" label="Longest dry spell" value={any ? n(more.bestDryRun) : null} note={`Hands without a pot${more.dryRun > 1 ? ` · ${more.dryRun} now` : ''}`} />
      </Pair>
    </>
  );
}

/** The starting hands that have won and lost you the most, then your best hand. */
function CardsSection({ record }: { record: PokerRecord }) {
  const { lucky, nemesis } = startExtremes(record.more);
  const hand = ([name, s]: [string, StartLine]) => ({ value: signed(s.net), note: `${startWords(name)} · ${s.n} hands`, cards: s.cards });
  const l = lucky && hand(lucky);
  const m = nemesis && hand(nemesis);
  return (
    <>
      <Heading title="Your cards" />
      <Pair>
        <Tile icon="star.fill" tint="gold" label="Lucky hand" value={l?.value ?? null} note={l?.note ?? 'The starting hand that wins you the most'}>
          <MiniCards cards={l?.cards} />
        </Tile>
        <Tile icon="exclamationmark.triangle.fill" tint="grey" label="Nemesis hand" value={m?.value ?? null} note={m?.note ?? 'The starting hand that costs you the most'}>
          <MiniCards cards={m?.cards} />
        </Tile>
      </Pair>
      {record.best && (
        <Card colors={cardColors.violet} label="Best hand" onShare={() => share(`My best hand on FlipUp: ${record.best?.name}.`)}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {record.best.cards.map((c) => (
              <PlayingCard key={c} card={c} size="md" width={52} />
            ))}
          </View>
          <Big>{record.best.name}</Big>
          <Faint>{variantInfo(record.best.variant).name}, at a showdown</Faint>
        </Card>
      )}
    </>
  );
}

/** Two small cards over a tile's number, or two face-down ones while there's no hand to show. */
function MiniCards({ cards }: { cards?: PlayCard[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xxs, paddingBottom: spacing.xxs }}>
      {cards?.length === 2 ? cards.map((c) => <PlayingCard key={c} card={c} size="sm" width={34} />) : [0, 1].map((i) => <PlayingCard key={i} back size="sm" width={34} />)}
    </View>
  );
}

/** Range training: how often you find the best play, how that's moving, your run of best plays and hands replayed. */
function TrainingSection({ more }: { more: MoreStats }) {
  const history = useRangeHistory();
  const replays = useReplays();
  const stats = rangeStats(history);
  const run = runOf(history);
  const change = stats.recent !== null && stats.before !== null ? Math.round((stats.recent - stats.before) * 100) : null;
  return (
    <>
      <Heading title="Training" />
      <Panel label={stats.total ? `Range training: ${pct(stats.rate)} best plays over ${stats.total} hands` : 'Range training: no hands yet'}>
        <TileHead icon="scope" tint="blue" label="Range training accuracy" />
        {stats.total ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                <BigNumber size={34}>{pct(stats.rate)}</BigNumber>
                <ThemedText variant="subhead" tone="tertiaryLabel">
                  best plays
                </ThemedText>
              </View>
              {change !== null && (
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText variant="footnote" tone="tertiaryLabel">
                    Last 20 hands
                  </ThemedText>
                  <ThemedText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                    {change > 0 ? `Up ${change}%` : change < 0 ? `Down ${-change}%` : 'Level'}
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={{ paddingTop: spacing.xs }}>
              <AccuracyBars trend={stats.trend} />
            </View>
            <ThemedText variant="footnote" tone="tertiaryLabel">
              Each bar is 10 hands, newest on the right · {n(stats.total)} answered
            </ThemedText>
          </>
        ) : (
          <ThemedText variant="callout" tone="secondaryLabel">
            Answer hands in Train and your accuracy shows up here, 10 hands to a bar.
          </ThemedText>
        )}
      </Panel>
      <Pair>
        <Tile icon="flame.fill" tint="gold" label="Training streak" value={stats.total ? n(run) : null} note={`Best plays in a row · record ${n(stats.longest)}`} />
        <Tile icon="play.rectangle.fill" label="Hands replayed" value={n(more.watched)} note={`${n(replays.length)} saved ${replays.length === 1 ? 'hand' : 'hands'}`} />
      </Pair>
    </>
  );
}

/** Before your first hand: no grid of zeros, just what will be here and the way to get it. */
function NoHandsYet() {
  const panel = usePanel();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: 'center', borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge }}>
      <Icon name="chart.bar.xaxis" size={34} color={brand.violet} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title3" style={{ fontFamily: ROUNDED, fontWeight: '800', textAlign: 'center' }}>
          No hands yet
        </ThemedText>
        <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
          Play a few hands and your win rate, biggest pot and best hand show up here.
        </ThemedText>
      </View>
      <Button
        title="Play bots"
        onPress={() => {
          haptic.tap();
          router.push('/play-bots');
        }}
      />
    </View>
  );
}

function share(message: string) {
  haptic.tap();
  void Share.share({ message });
}

/** A big gradient card with a small caps label and a share button, like each of Flighty's report cards. */
function Card({ colors, label, onShare, children }: { colors: readonly [string, string, string]; label: string; onShare?: () => void; children: React.ReactNode }) {
  return (
    <LivingCard colors={colors} style={{ padding: spacing.lg, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
        <Text maxFontSizeMultiplier={1.2} style={{ flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
          {label}
        </Text>
        {onShare && (
          <PressableScale accessibilityRole="button" accessibilityLabel={`Share your ${label.toLowerCase()}`} onPress={onShare} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="square.and.arrow.up" size={20} color="#ffffff" />
          </PressableScale>
        )}
      </View>
      {children}
    </LivingCard>
  );
}

const Big = ({ children }: { children: React.ReactNode }) => (
  <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 30, fontWeight: '700', color: '#ffffff' }}>
    {children}
  </Text>
);
const Faint = ({ children }: { children: React.ReactNode }) => (
  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 22, color: 'rgba(255,255,255,0.7)' }}>
    {children}
  </Text>
);

/** Which games you've played lately, most played first, and where you finished in each. */
function GamesYouPlay({ record }: { record: PokerRecord }) {
  const colors = useColors();
  const panel = usePanel();
  const shadows = useShadows();
  if (!record.games.length) return null;
  const by = new Map<Variant, { games: number; wins: number; bestPlace: number }>();
  for (const g of record.games) {
    const row = by.get(g.variant) ?? { games: 0, wins: 0, bestPlace: 99 };
    by.set(g.variant, { games: row.games + 1, wins: row.wins + (g.place === 1 ? 1 : 0), bestPlace: Math.min(row.bestPlace, g.place) });
  }
  const rows = [...by.entries()].sort((a, b) => b[1].games - a[1].games);
  return (
    <View style={{ gap: spacing.sm }}>
      <Heading title="Games you play" />
      <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, overflow: 'hidden' }}>
        {rows.map(([v, r], i) => (
          <View key={v} accessible accessibilityLabel={`${variantInfo(v).name}: ${r.games} games, ${r.wins} won`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator }}>
            <GameThumb variant={v} size={44} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline" numberOfLines={1}>
                {variantInfo(v).name}
              </ThemedText>
              <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
                {r.games} {r.games === 1 ? 'game' : 'games'} · best {place(r.bestPlace)}
              </ThemedText>
            </View>
            {r.wins > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="trophy.fill" size={15} color={colors.gold} />
                <ThemedText variant="headline">{n(r.wins)}</ThemedText>
              </View>
            )}
          </View>
        ))}
      </View>
      </View>
      <ThemedText variant="footnote" tone="tertiaryLabel">
        Your last {record.games.length} {record.games.length === 1 ? 'game' : 'games'}.
      </ThemedText>
    </View>
  );
}
