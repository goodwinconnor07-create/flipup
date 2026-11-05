import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { GlossaryText } from '@/components/ranges/glossary-text';
import { Kicker, NightSheet, panel, SheetHeading } from '@/components/ranges/night-sheet';
import { GroupRow, PILE } from '@/components/ranges/piles';
import { edgeOf } from '@/components/ranges/reveal';
import { useFadeIn } from '@/components/ranges/use-fade';
import { trickOf, vibeOf } from '@/components/ranges/words';
import { PressableScale } from '@/components/pressable-scale';
import { CardSlot, PlayingCard } from '@/components/table/playing-card';
import { enter } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { charactersOf, pilesFor, storySteps, type PileId } from '@/state/range-logic';
import { allHands, numbersFor, scenarioById, useRangePlay } from '@/state/ranges';
import { brand, radius, ROUNDED, spacing } from '@/theme';
import { bb, gradeOf, optionsFor, replay, type OptionId, type Street } from '@train/ranges/model';

const STREET: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const GRADE = { best: 'Best play', ok: 'Also good', mistake: 'Not this time' } as const;

/**
 * Show me why: the whole hand, explained. The story a street at a time (the street tabs, or Back and Next street)
 * with what each street told you; what each player still in could have, as one bar
 * of three piles and every group with a real hand from it; then the numbers behind the answer, open in Pro and a
 * tap away in Easy; and the full why last.
 */
export default function RangeWhySheet() {
  const params = useLocalSearchParams<{ id?: string; pick?: string }>();
  const s = scenarioById(params.id ?? '') ?? allHands()[0];
  const r = useMemo(() => replay(s), [s]);
  const options = useMemo(() => optionsFor(s, r), [s, r]);
  const numbers = useMemo(() => numbersFor(s, r), [s, r]);
  const chars = useMemo(() => charactersOf(s), [s]);
  const steps = useMemo(() => storySteps(s, r, (p) => (p === s.hero.pos ? 'you' : (chars[p]?.name ?? p))), [s, r, chars]);
  const play = useRangePlay();
  const reduce = useReduceMotion();
  const [at, setAt] = useState(0);
  const [math, setMath] = useState(play.level === 'pro');
  const stepFade = useFadeIn(at);
  const pick = options.some((o) => o.id === params.pick) ? (params.pick as OptionId) : null;
  const grade = pick ? gradeOf(s, pick) : null;
  const trick = trickOf(s.concept);
  const facing = r.toCall > 0;
  const step = steps[at];
  const clue = s.clues.find((c) => c.street === step.street);
  const labelOf = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  const best = options.find((o) => o.id === s.best);
  const edge = pick ? edgeOf(numbers, s.best, pick) : null;
  const go = (d: number) => {
    const n = Math.max(0, Math.min(steps.length - 1, at + d));
    if (n !== at) {
      haptic.street();
      setAt(n);
    }
  };

  return (
    <NightSheet>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={trick.icon} size={14} color={brand.gold} />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.3, color: brand.gold }}>
            {trick.nick.toUpperCase()}
          </Text>
        </View>
        <SheetHeading title={s.title} line={trick.line} />
        {best && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Pill text={`Best: ${best.label}`} gold />
            {grade && pick && <Pill text={`${GRADE[grade]} · you: ${labelOf(pick)}`} />}
          </View>
        )}
      </View>

      {/* The story, a street at a time. */}
      <View style={{ gap: spacing.sm }}>
        <Kicker>The hand, street by street</Kicker>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
          {steps.map((x, i) => (
            <PressableScale key={x.street} accessibilityRole="tab" accessibilityState={{ selected: i === at }} accessibilityLabel={STREET[x.street]} haptics={false} onPress={() => go(i - at)} outerStyle={{ flex: 1 }} style={{ height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: i === at ? brand.gold : i < at ? 'rgba(245,183,0,0.22)' : 'rgba(255,255,255,0.08)' }}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', color: i === at ? brand.goldInk : '#ffffff' }}>
                {STREET[x.street]}
              </Text>
            </PressableScale>
          ))}
        </View>
        <View style={panel}>
          <View style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}>
            {s.board.map((c, i) => (i < step.shown ? <PlayingCard key={`${c}${at}`} card={c} size="md" width={44} flip={i >= (steps[at - 1]?.shown ?? 0)} delay={(i % 3) * 80} /> : <CardSlot key={`slot${i}`} size="md" width={44} />))}
          </View>
          <Animated.View style={[{ gap: spacing.xs }, stepFade]}>
            <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#ffffff' }}>
              {step.line}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)', fontVariant: ['tabular-nums'] }}>
              Pot {bb(step.pot)}
            </Text>
            {clue && (
              <View style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(245,183,0,0.10)' }}>
                <Icon name="lightbulb.fill" size={15} color={brand.gold} />
                <GlossaryText style={{ flex: 1, fontSize: 15, lineHeight: 21, color: '#ffffff' }}>{clue.text}</GlossaryText>
              </View>
            )}
          </Animated.View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <StepButton dir="back" disabled={at === 0} onPress={() => go(-1)} />
            <StepButton dir="on" disabled={at === steps.length - 1} onPress={() => go(1)} />
          </View>
        </View>
      </View>

      {/* What they could have. */}
      {s.opponents
        .filter((o) => r.live.includes(o.pos))
        .map((o) => {
          const piles = pilesFor(s, numbers, o.pos);
          const groups = piles.flatMap((p) => p.groups).sort((a, b) => b.share - a.share);
          return (
            <View key={o.pos} style={{ gap: spacing.sm }}>
              <Kicker>{`What ${chars[o.pos]?.name ?? o.pos} could have`}</Kicker>
              <View style={panel}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text maxFontSizeMultiplier={1}>{chars[o.pos]?.emoji}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                    {o.type} · {vibeOf(o.type)}
                  </Text>
                </View>
                <View style={{ height: 14, borderRadius: 7, flexDirection: 'row', overflow: 'hidden', gap: 2 }} accessibilityLabel={piles.map((p) => `${PILE[p.id].name} ${Math.round(p.share * 100)}%`).join(', ')}>
                  {piles.map((p) => (
                    <View key={p.id} style={{ flex: p.share, backgroundColor: BAR[p.id] }} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {piles.map((p) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: BAR[p.id] }} />
                      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                        {PILE[p.id].name} {Math.round(p.share * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  {groups.map((g) => (
                    <GroupRow key={g.label + g.role} group={g} facing={facing} ink="#ffffff" sub="rgba(255,255,255,0.6)" />
                  ))}
                </View>
              </View>
            </View>
          );
        })}

      {/* The numbers. */}
      <View style={{ gap: spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: math }} onPress={() => {
            haptic.select();
            setMath(!math);
          }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}>
          <Icon name="chart.bar.xaxis" size={15} color={brand.gold} />
          <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 18, fontWeight: '800', color: '#ffffff' }}>
            Show the math
          </Text>
          <Icon name={math ? 'chevron.up' : 'chevron.down'} size={14} color="rgba(255,255,255,0.6)" />
        </Pressable>
        {math && (
          <Animated.View entering={enter(reduce)} style={panel}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Stat value={`${Math.round(numbers.equity * 100)}%`} line={facing ? 'your chance to win' : 'your chance to win at showdown now'} gold />
              {facing && <Stat value={`${Math.round(numbers.price * 100)}%`} line="what calling needs" />}
            </View>
            {edge && (
              <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                {bb(Math.round(edge.value * 10) / 10)} {edge.line}.
              </Text>
            )}
            <Kicker>What each play wins on average</Kicker>
            {numbers.rows.map((row) => {
              const top = Math.max(...numbers.rows.map((x) => Math.abs(x.ev)), 0.1);
              return (
                <View key={row.id} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: row.id === s.best ? '800' : '500', color: '#ffffff' }}>
                      {labelOf(row.id)}
                    </Text>
                    {row.id === s.best && <Pill text="Best" gold small />}
                    {row.id === pick && <Pill text="You" small />}
                    <View style={{ flex: 1 }} />
                    <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '800', color: row.ev >= 0 ? '#ffffff' : 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] }}>
                      {row.ev >= 0 ? '+' : '−'}
                      {bb(Math.abs(Math.round(row.ev * 10) / 10))}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${Math.round((Math.abs(row.ev) / top) * 100)}%`, backgroundColor: row.id === s.best ? brand.gold : row.ev >= 0 ? brand.violetDark : 'rgba(255,255,255,0.3)' }} />
                  </View>
                </View>
              );
            })}
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.5)' }}>
              Worked out by dealing out every hand they could have{s.opponents.filter((o) => r.live.includes(o.pos)).length > 1 ? ' (40,000 deals, as there’s more than one of them)' : ''}. Raises aren’t priced here.
            </Text>
            {numbers.views.map((v) => (
              <View key={v.pos} style={{ gap: 2 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.5)' }}>
                  {(chars[v.pos]?.name ?? v.pos).toUpperCase()} · COMBOS
                </Text>
                {s.opponents
                  .find((o) => o.pos === v.pos)
                  ?.range.map((g, i) => (
                    <Text key={g.label + i} maxFontSizeMultiplier={1.4} style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontVariant: ['tabular-nums'] }}>
                      {g.label}: {v.groups[i]?.combos ?? 0} combos{g.weight && g.weight < 1 ? ` (played this way ${Math.round(g.weight * 100)}%)` : ''}, you win {Math.round((v.groups[i]?.equity ?? 0) * 100)}%
                    </Text>
                  ))}
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Kicker>The whole why</Kicker>
        <GlossaryText max={5} style={{ fontSize: 17, lineHeight: 25, color: '#ffffff' }}>
          {s.why}
        </GlossaryText>
      </View>
    </NightSheet>
  );
}

const BAR: Record<PileId, string> = { behind: 'rgba(255,255,255,0.35)', close: brand.violetDark, ahead: brand.gold };

function Pill({ text, gold, small }: { text: string; gold?: boolean; small?: boolean }) {
  return (
    <View style={{ paddingHorizontal: small ? 7 : 10, height: small ? 20 : 28, borderRadius: 14, justifyContent: 'center', backgroundColor: gold ? brand.gold : 'rgba(255,255,255,0.12)' }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: small ? 11 : 14, fontWeight: '800', color: gold ? brand.goldInk : '#ffffff' }}>
        {text}
      </Text>
    </View>
  );
}

function Stat({ value, line, gold }: { value: string; line: string; gold?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: gold ? brand.gold : '#ffffff', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
        {line}
      </Text>
    </View>
  );
}

function StepButton({ dir, disabled, onPress }: { dir: 'back' | 'on'; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={dir === 'back' ? 'Street before' : 'Next street'} disabled={disabled} haptics={false} onPress={onPress} outerStyle={{ flex: 1 }} style={{ minHeight: 44, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      {dir === 'back' && <Icon name="chevron.left" size={13} color="#ffffff" />}
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
        {dir === 'back' ? 'Back' : 'Next street'}
      </Text>
      {dir === 'on' && <Icon name="chevron.right" size={13} color="#ffffff" />}
    </PressableScale>
  );
}
