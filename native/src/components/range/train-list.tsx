// Range training as a Flighty list (the Training tab): Practice is the spots worth working on (in blue, on top),
// a thin line, then every kind of spot with how many of its hands you've mastered (greyed once they all are);
// History is every hand you've answered, by day, newest first. A tap on any row starts a set of it.
import { Text, View } from 'react-native';

import { rankLabel, suitOf } from '@/engine';
import { dayLabel } from '@/state/my-games';
import { libraryProgress, missedHands, rangeStats, type Answer } from '@/state/range-history';
import { allHands } from '@/state/ranges';
import { brand, spacing, useColors } from '@/theme';
import type { Grade, OptionId, Scenario } from '@train/ranges/model';

import { Icon } from '../icon';
import { EmptyState, ListDivider, ListHeader, ListRow, SIZE } from '../tab-list';
import { startSet } from './train-home';

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
const RED = { s: false, h: true, d: true, c: false } as const;

/** Two of your cards, slightly fanned on a grey square: a hand's picture in a list, as a game's is. */
export function HandThumb({ cards, size = 44 }: { cards: readonly string[]; size?: number }) {
  const colors = useColors();
  const w = Math.round(size * 0.46);
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size * 0.24, borderCurve: 'continuous', backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        {cards.slice(0, 2).map((c, i) => {
          const suit = suitOf(c as never) as keyof typeof SUIT;
          return (
            <View
              key={c}
              style={{
                width: w,
                height: Math.round(w * 1.36),
                marginLeft: i ? -w * 0.28 : 0,
                transform: [{ rotate: i ? '7deg' : '-7deg' }, { translateY: i ? 1 : 0 }],
                borderRadius: 4,
                backgroundColor: '#ffffff',
                borderWidth: 0.5,
                borderColor: 'rgba(0,0,0,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text maxFontSizeMultiplier={1} style={{ fontSize: w * 0.5, lineHeight: w * 0.56, fontWeight: '800', color: RED[suit] ? '#d92b2b' : '#111111' }}>
                {rankLabel(c as never)}
              </Text>
              <Text maxFontSizeMultiplier={1} style={{ fontSize: w * 0.44, lineHeight: w * 0.5, color: RED[suit] ? '#d92b2b' : '#111111' }}>
                {SUIT[suit]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The spots to work on, then every kind of spot. */
export function PracticeList({ history, grades }: { history: Answer[]; grades: Record<string, Grade> }) {
  const colors = useColors();
  const hands = allHands();
  const st = rangeStats(history);
  const missed = missedHands(history);
  // Every kind of spot, the ones with most hands first, with how many of its hands you've got right.
  const kinds = new Map<string, Scenario[]>();
  for (const s of hands) kinds.set(s.concept, [...(kinds.get(s.concept) ?? []), s]);
  const library = [...kinds.entries()]
    .map(([concept, list]) => ({ concept, list, done: list.filter((s) => grades[s.id] === 'best').length }))
    .sort((a, b) => b.list.length - a.list.length || a.concept.localeCompare(b.concept));
  const lib = libraryProgress(grades);
  const focus = st.weakest.length > 0 || missed.length > 0;
  return (
    <View>
      {st.weakest.map((t) => {
        const first = kinds.get(t.label)?.[0];
        return (
          <ListRow
            key={`work-${t.label}`}
            leading={first ? <HandThumb cards={first.hero.cards} /> : null}
            eyebrow={`Work on · ${t.best} of ${t.total} best plays`}
            title={t.label}
            tint={colors.accent as string}
            label={`Work on ${t.label}. ${t.best} of ${t.total} best plays so far. Start a set`}
            onPress={() => startSet([t.label])}
            detail={<Detail>Start a set of these spots</Detail>}
          />
        );
      })}
      {missed.length > 0 && (
        <ListRow
          leading={<IconThumb />}
          eyebrow="Retry"
          title="Your misses"
          tint={colors.accent as string}
          label={`Retry your misses. ${plural(missed.length, 'hand')} to try again`}
          onPress={() => startSet(missed.map((m) => `id:${m.id}`))}
          detail={<Detail>{plural(missed.length, 'hand')} to try again</Detail>}
        />
      )}
      {focus && <ListDivider />}
      <ListHeader title="Every spot" count={`${lib.best} of ${lib.total} mastered`} />
      {library.map((k, i) => {
        const all = k.done === k.list.length;
        return (
          <ListRow
            key={k.concept}
            leading={<HandThumb cards={k.list[0].hero.cards} />}
            eyebrow={all ? 'Mastered' : `${k.done} of ${plural(k.list.length, 'hand')} mastered`}
            title={k.concept}
            dim={all}
            separator={i < library.length - 1}
            label={`${k.concept}. ${k.done} of ${k.list.length} mastered. Start a set`}
            onPress={() => startSet([k.concept])}
          />
        );
      })}
    </View>
  );
}

const PICK: Record<OptionId, string> = { fold: 'Fold', call: 'Call', raise: 'Raise', check: 'Check', bet33: 'Bet ⅓', bet75: 'Bet ¾', bet125: 'Overbet' };
const VERDICT: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Missed' };

const time = (at: number) => {
  const d = new Date(at);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
};

/** Every hand you've answered, by day, newest first. */
export function HistoryList({ history }: { history: Answer[] }) {
  const colors = useColors();
  const byId = new Map(allHands().map((s) => [s.id, s]));
  const rows = [...history].sort((a, b) => b.at - a.at).filter((a) => byId.has(a.id));
  if (!rows.length) return <EmptyState title="No Hands Yet" line="Tap Start a Set to play five real hands from pro breakdowns" />;
  const days: { label: string; answers: Answer[] }[] = [];
  for (const a of rows) {
    const label = dayLabel(a.at);
    const last = days[days.length - 1];
    if (last?.label === label) last.answers.push(a);
    else days.push({ label, answers: [a] });
  }
  const tone: Record<Grade, string> = { best: brand.gold, ok: colors.accent as string, mistake: colors.tertiaryLabel as string };
  return (
    <View>
      {days.map((d) => (
        <View key={d.label}>
          <ListHeader title={d.label} count={plural(d.answers.length, 'hand')} />
          {d.answers.map((a, i) => {
            const s = byId.get(a.id)!;
            const opps = s.opponents.map((o) => o.pos).join(', ');
            return (
              <ListRow
                key={`${a.id}-${a.at}`}
                leading={<HandThumb cards={s.hero.cards} />}
                eyebrow={`${s.hero.pos} vs ${opps} · ${s.format === 'tournament' ? 'Tournament' : 'Cash'}`}
                when={time(a.at)}
                title={s.title}
                dim={a.grade === 'mistake'}
                separator={i < d.answers.length - 1}
                label={`${s.title}. ${VERDICT[a.grade]}, you chose ${PICK[a.pick]}. Play it again`}
                onPress={() => startSet([`id:${a.id}`])}
                detail={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone[a.grade] }} />
                    <Detail>
                      {VERDICT[a.grade]} · {PICK[a.pick]}
                    </Detail>
                  </View>
                }
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Detail({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.small, color: colors.secondaryLabel }}>
      {children}
    </Text>
  );
}

function IconThumb() {
  const colors = useColors();
  return (
    <View style={{ width: 44, height: 44, borderRadius: 44 * 0.24, borderCurve: 'continuous', backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs }}>
      <Icon name="arrow.counterclockwise" size={20} color={colors.accent} />
    </View>
  );
}
