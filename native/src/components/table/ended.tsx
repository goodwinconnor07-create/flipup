import { useEffect, useMemo } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { tableAwards } from '@train/tableAwards';
import { tableStats, type TableStats } from '@train/tableStats';
import { net, standings, variantInfo, type Game } from '@/engine';
import { dispatch, me as myDevice, requestLogs, useTable } from '@/state/session';
import { radius, spacing, useColors, usePlainColors, useShadows } from '@/theme';
import { Avatar } from '../avatar';
import { Button } from '../button';
import { Icon } from '../icon';
import { Row, Section } from '../grouped-list';
import { ThemedText } from '../themed-text';
import { Count } from './count';
import { signed, useResultShare, type ResultData } from './result-share';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
const ORDINAL = ['1st', '2nd', '3rd'];
const place = (n: number) => ORDINAL[n - 1] ?? `${n}th`;

/**
 * The finish page (the web's `Final`, without legends or badges): one scrolling page with the result up top, then
 * big stat tiles that count up, the chips line, how you played, the table's awards, and the standings (chips won or
 * lost, not raw stacks). Play again, Share and Home are pinned under it, with who's in for another game. Share sends
 * a picture of the result. The stats come from this table's hand log (`tableStats()`, shared with the web).
 */
export function Ended({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const t = useTable();
  const colors = useColors();
  const c = usePlainColors();
  useEffect(() => requestLogs(), [game.id]);
  const rows = standings(game);
  const mine = game.players.find((p) => p.deviceId === myDevice);
  const host = game.hostDeviceId === myDevice;
  const rank = mine ? rows.findIndex((p) => p.id === mine.id) + 1 : 0;
  const top = rows[0];
  const records = useMemo(() => (t.logs ? t.logs.flatMap((l) => (l.record && l.record.tableId === game.id ? [l.record] : [])) : []), [t.logs, game.id]);
  const stats = useMemo<TableStats | null>(() => {
    if (!mine || !records.length) return null;
    return tableStats(records, mine.id);
  }, [records, mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const awards = useMemo(() => tableAwards(records, game.players.map((p) => p.id)), [records, game.players]);
  const again = !!mine && (game.again ?? []).includes(mine.id);
  // A table ended before any hand finished has no winner: nobody won a chip.
  const played = !!game.hand && (game.hand.number > 1 || !!game.hand.result);
  const title = !played ? 'No hands played' : !mine ? (top ? `${top.name} wins!` : 'Game over') : rank === 1 ? 'You win!' : `You came ${place(rank)}`;
  const who = (id: string) => game.players.find((p) => p.id === id);
  const awardLines = awards.map((a) => ({ title: a.title, who: a.ids.map((id) => `${who(id)?.emoji ?? ''} ${who(id)?.name ?? ''}`.trim()).join(' & '), detail: a.detail }));
  const gameName = variantInfo(game.settings.variant ?? 'holdem').name;
  const hands = records.length || (game.hand?.number ?? 0);
  const data: ResultData = {
    headline: !played ? 'No hands played' : !top ? 'Game over' : top.id === mine?.id ? 'I won!' : `${top.name} won!`,
    line: [gameName, `${rows.length} players`, hands ? `${hands} ${hands === 1 ? 'hand' : 'hands'}` : ''].filter(Boolean).join(' · '),
    rows: rows.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, net: net(r), you: r.id === mine?.id })),
    awards: awardLines,
    text: `${mine ? (rank === 1 ? `I won a FlipUp table of ${rows.length}!` : `I came ${place(rank)} of ${rows.length} at FlipUp.`) : `${title} at FlipUp.`}${stats ? ` ${stats.won} hands won${stats.bestMade ? `, best hand ${stats.bestMade.name.toLowerCase()}` : ''}.` : ''}`,
  };
  const result = useResultShare(data);
  // Everyone but the bots can say they're in for another; their taps appear here as they happen.
  const people = game.players.filter((p) => !p.bot);
  const inCount = people.filter((p) => (game.again ?? []).includes(p.id)).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md }}>
          <Text style={{ fontSize: 80 }} maxFontSizeMultiplier={1} accessible={false}>
            {played && rank === 1 ? '🏆' : (mine?.emoji ?? top?.emoji ?? '🏆')}
          </Text>
          <ThemedText variant="largeTitle" accessibilityRole="header" style={{ textAlign: 'center', fontWeight: '800' }}>
            {title}
          </ThemedText>
          {!played && (
            <ThemedText tone="secondaryLabel" style={{ textAlign: 'center' }}>
              The table closed before the first hand finished.
            </ThemedText>
          )}
          {played && mine && stats && (
            <ThemedText tone="secondaryLabel" style={{ textAlign: 'center' }}>
              {stats.net >= 0 ? `Up ${chips(stats.net)}` : `Down ${chips(-stats.net)}`} over {stats.hands} {stats.hands === 1 ? 'hand' : 'hands'}
            </ThemedText>
          )}
        </View>

        {awards.length > 0 && (
          <Section header="Table awards">
            {awards.map((a) => (
              <Row
                key={a.id}
                leading={
                  <View style={{ flexDirection: 'row' }}>
                    {a.ids.map((id, i) => (
                      <View key={id} style={{ marginLeft: i ? -10 : 0 }}>
                        <Avatar emoji={who(id)?.emoji} size={36} />
                      </View>
                    ))}
                  </View>
                }
                title={a.ids.map((id) => `${who(id)?.name ?? ''}${id === mine?.id ? ' (you)' : ''}`).join(' & ')}
                subtitle={`${a.title} · ${a.detail}`}
              />
            ))}
          </Section>
        )}

        {stats && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Tile label="Hands won" value={stats.won} />
              <Tile label="Biggest win" value={Math.max(0, stats.bigWin?.net ?? 0)} />
              <Tile label="Bluffs that worked" value={stats.bluffsWon} />
              <Tile label="Best run" value={stats.streak} suffix={stats.streak === 1 ? ' hand' : ' in a row'} />
            </View>
            {stats.bestMade && (
              <Section header="Best hand">
                <Row title={stats.bestMade.name} subtitle={`Hand ${stats.bestMade.number}`} />
              </Section>
            )}
            {stats.series.length > 2 && <ChipsLine series={stats.series} />}
            <Section header="How you played">
              <Row title={stats.style} subtitle={`In ${Math.round(stats.vpip * 100)}% of hands · raised ${Math.round(stats.pfr * 100)}% before the flop`} />
            </Section>
          </>
        )}
        <Section header="Standings">
          {rows.map((r, i) => {
            const n = net(r);
            return (
              <Row
                key={r.id}
                leading={<Avatar emoji={r.emoji} size={32} />}
                title={`${i + 1}. ${r.name}${r.id === mine?.id ? ' (you)' : ''}`}
                subtitle={`${chips(r.stack)} chips`}
                trailing={
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], color: n > 0 ? colors.green : n < 0 ? colors.red : colors.tertiaryLabel }}>
                    {signed(n)}
                  </Text>
                }
              />
            );
          })}
        </Section>
      </ScrollView>

      {/* Pinned, so the next game is one tap away from wherever you stopped scrolling. */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs, backgroundColor: c.background }}>
        {people.length > 1 && !!game.code && (
          <View accessible accessibilityLabel={`${inCount} of ${people.length} are in for another game`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
              {people.map((p) => {
                const inn = (game.again ?? []).includes(p.id);
                return (
                  <View key={p.id} style={{ opacity: inn ? 1 : 0.35 }}>
                    <Avatar emoji={p.emoji} size={32} />
                    {inn && (
                      <View style={{ position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.green }}>
                        <Icon name="checkmark" size={10} color="#ffffff" />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            <ThemedText variant="footnote" tone="tertiaryLabel" style={{ flex: 1 }}>
              {inCount} of {people.length} in for another
            </ThemedText>
          </View>
        )}
        {host ? (
          <Button variant="party" tint="blue" size="lg" title="Play again" onPress={() => dispatch({ type: 'playAgain' })} />
        ) : mine && game.code ? (
          <Button variant="party" tint="blue" size="lg" title={again ? "You're in for the next one" : "I'm in for another"} disabled={again} onPress={() => dispatch({ type: 'playAgain' })} />
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" title="Share" loading={result.busy} onPress={() => void result.share()} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" title="Back to Home" onPress={onLeave} />
          </View>
        </View>
      </View>
      {result.card}
    </View>
  );
}

/** A big number that counts up, on a flat cell. */
function Tile({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const colors = useColors();
  const shadows = useShadows();
  const { width } = useWindowDimensions();
  const w = Math.floor((Math.min(width, 700) - spacing.md * 2 - spacing.sm) / 2);
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${suffix ?? ''}`} style={{ width: w, padding: spacing.md, gap: spacing.xxs, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Count value={value} style={{ fontSize: 40, lineHeight: 46, fontWeight: '800', color: colors.label }} />
        {suffix && (
          <ThemedText variant="subhead" tone="tertiaryLabel">
            {suffix}
          </ThemedText>
        )}
      </View>
      <ThemedText variant="subhead" tone="secondaryLabel">
        {label}
      </ThemedText>
    </View>
  );
}

/** Chips up or down after each hand, as a line over the zero mark: green when you finished up, red when down. */
function ChipsLine({ series }: { series: number[] }) {
  const c = usePlainColors();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 700) - spacing.md * 4;
  const h = 120;
  const lo = Math.min(0, ...series);
  const hi = Math.max(0, ...series);
  const span = hi - lo || 1;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (v: number) => h - ((v - lo) / span) * h;
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const up = series[series.length - 1] >= 0;
  return (
    <Section header="Your chips">
      <View accessible accessibilityLabel={`Chips over the game, finishing ${up ? 'up' : 'down'}`} style={{ padding: spacing.md }}>
        <Svg width={w} height={h}>
          <Line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={colors.separator as string} strokeWidth={1} strokeDasharray="4 4" />
          <Path d={d} stroke={up ? c.green : c.red} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      </View>
    </Section>
  );
}
