import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { popIn } from '@/motion/presets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confettiColors } from '@design/tokens';
import { haptic } from '@/components/haptics';
import { ACTION_BAR_ROOM, ActionBar } from '@/components/ranges/action-bar';
import type { HandResult } from '@/components/ranges/end-card';
import { EndCard } from '@/components/ranges/end-card';
import { FeltBoard } from '@/components/ranges/felt-board';
import { GuessCard } from '@/components/ranges/guess';
import { HandFan } from '@/components/ranges/hand-fan';
import { Flash, Reveal } from '@/components/ranges/reveal';
import { Seats, ThoughtBubble, type SeatInfo } from '@/components/ranges/seats';
import { Price, Story } from '@/components/ranges/story';
import { StudyRoom, type Mood } from '@/components/ranges/study-room';
import { TopBar } from '@/components/ranges/top-bar';
import { trickOf } from '@/components/ranges/words';
import { Confetti } from '@/components/table/confetti';
import { playSound, type SoundName } from '@/components/table/sounds';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import {
  betRead,
  BLITZ_MS,
  blitzIds,
  blitzMultiplier,
  blitzPoints,
  charactersOf,
  ENDLESS_SIZE,
  handPoints,
  lessonIds,
  mainOpponent,
  pilesFor,
  POINTS,
  roundIds,
  sampleHands,
  shortWhy,
  starsFor,
  storySteps,
  type Mode,
  type Sampled,
} from '@/state/range-logic';
import { noteDailyPick } from '@/state/bankroll';
import {
  answerHand,
  dailyToday,
  finishSession,
  flameOf,
  noteDaily,
  noteSwipe,
  numbersFor,
  readRangeGrades,
  readRangePlay,
  scenarioById,
  allHands,
  useRangePlay,
} from '@/state/ranges';
import { ForceScheme, ROUNDED, spacing } from '@/theme';
import { optionsFor, replay, type OptionId, type Pos } from '@train/ranges/model';

const MODES: Mode[] = ['round', 'daily', 'blitz', 'hand', 'fix', 'lesson', 'endless'];
const TITLE: Record<Mode, string> = {
  round: 'Round',
  daily: 'Today’s three',
  blitz: 'Blitz',
  hand: 'One hand',
  fix: 'Fixing misses',
  lesson: 'Lesson',
  endless: 'Keep going',
};
/** How long each street of the story stays up. */
const STEP_MS = 1300;
const ACTION_SOUND: Record<OptionId, SoundName> = {
  fold: 'fold',
  check: 'check',
  call: 'chip',
  raise: 'chips',
  bet33: 'chip',
  bet75: 'chips',
  bet125: 'allin',
};

type Phase = 'countdown' | 'story' | 'decide' | 'guess' | 'reveal' | 'done';

interface Session {
  mode: Mode;
  queue: string[];
  start: number;
  /** The daily's day, and the answers already given today. */
  day?: string;
  /** A lesson's trick (its hands' concept). */
  concept?: string;
  prior: HandResult[];
}

/** Which hands this session deals, from the route's `mode` (and `id` or `ids`). */
function startSession(raw: { mode?: string; id?: string; ids?: string; concept?: string }): Session {
  const mode = MODES.includes(raw.mode as Mode) ? (raw.mode as Mode) : 'round';
  const valid = (ids: string[]) => ids.filter((id) => !!scenarioById(id));
  if (mode === 'daily') {
    const d = dailyToday(readRangePlay());
    return {
      mode,
      queue: d.ids,
      start: d.grades.length,
      day: d.day,
      prior: d.grades.map((g, i) => ({ id: d.ids[i], grade: g, points: POINTS[g], bonus: 0 })),
    };
  }
  if (mode === 'blitz') return { mode, queue: blitzIds(allHands()), start: 0, prior: [] };
  if (mode === 'endless') return { mode, queue: roundIds(readRangeGrades(), allHands(), ENDLESS_SIZE), start: 0, prior: [] };
  if (mode === 'hand' && raw.id && scenarioById(raw.id)) return { mode, queue: [raw.id], start: 0, prior: [] };
  if (mode === 'lesson' && raw.concept) {
    const ids = lessonIds(raw.concept, readRangeGrades(), allHands());
    if (ids.length) return { mode, queue: ids, start: 0, prior: [], concept: raw.concept };
  }
  if (mode === 'fix') {
    const ids = valid((raw.ids ?? '').split(','));
    if (ids.length) return { mode, queue: ids, start: 0, prior: [] };
  }
  return { mode: 'round', queue: roundIds(readRangeGrades(), allHands()), start: 0, prior: [] };
}

/**
 * Range training's table: one full-screen room on the night grain (no tab bar, no nav bar). The glass bar at the
 * top, the other players with their faces, the felt under a spotlight with the board dealt street by street as the
 * hand is told, the price, your two cards big and fanned, and the answer pinned at the bottom. The answer rises
 * over the table, and the end of the session is its own page. Modes: a round of five, today's three (the same
 * three on every phone), Blitz (60 seconds), a lesson from the Train tab's path (one trick's hands), one hand, or the
 * misses again.
 */
export default function RangesScreen() {
  return (
    <ForceScheme scheme="dark">
      <Trainer />
    </ForceScheme>
  );
}

function Trainer() {
  const params = useLocalSearchParams<{ mode?: string; id?: string; ids?: string; concept?: string }>();
  const [session, setSession] = useState(() => startSession(params));
  const { mode } = session;
  const play = useRangePlay();
  const pro = play.level === 'pro' && mode !== 'blitz';
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const compact = height < 740;

  const finishedDaily = mode === 'daily' && session.start >= session.queue.length;
  const [index, setIndex] = useState(session.start);
  const [results, setResults] = useState<HandResult[]>(session.prior);
  const [phase, setPhase] = useState<Phase>(finishedDaily ? 'done' : mode === 'blitz' ? 'countdown' : 'story');
  const [step, setStep] = useState(mode === 'blitz' ? 99 : 0);
  const [playing, setPlaying] = useState(mode !== 'blitz');
  const [size, setSize] = useState<OptionId>('bet75');
  const [locked, setLocked] = useState(false);
  const [pick, setPick] = useState<OptionId | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [open, setOpen] = useState<Pos | null>(null);
  const [sampled, setSampled] = useState<Sampled[] | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const [burst, setBurst] = useState(0);
  const [barH, setBarH] = useState(ACTION_BAR_ROOM);
  const [newBest, setNewBest] = useState(false);
  // Blitz.
  const [count, setCount] = useState(3);
  const [endsAt, setEndsAt] = useState(0);
  const [run, setRun] = useState(0);
  const [bestRun, setBestRun] = useState(0);

  const s = scenarioById(session.queue[Math.min(index, session.queue.length - 1)]) ?? allHands()[0];
  const r = useMemo(() => replay(s), [s]);
  const options = useMemo(() => optionsFor(s, r), [s, r]);
  const chars = useMemo(() => charactersOf(s), [s]);
  const steps = useMemo(() => storySteps(s, r, (p) => (p === s.hero.pos ? 'you' : (chars[p]?.name ?? p))), [s, r, chars]);
  const at = Math.min(step, steps.length - 1);
  const shown = steps[at];
  const facing = r.toCall > 0;
  const numbers = useMemo(() => (phase === 'reveal' ? numbersFor(s, r) : null), [phase, s, r]);
  const score = results.reduce((n, x) => n + x.points + x.bonus, 0);
  const labelOf = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  const title = mode === 'lesson' && session.concept ? trickOf(session.concept).nick : TITLE[mode];

  /** Your move: the whole board out and, in Easy, what the bettor's move usually means already open. */
  const toDecide = useCallback(() => {
    setStep(steps.length - 1);
    setPlaying(false);
    setPhase('decide');
    if (play.level === 'easy' && mode !== 'blitz') setOpen(mainOpponent(s, r));
  }, [steps.length, play.level, mode, s, r]);

  // The story: a street at a time, then your move.
  useEffect(() => {
    if (phase !== 'story' || !playing) return;
    const t = setTimeout(
      () => {
        if (at + 1 >= steps.length - 1) toDecide();
        else setStep(at + 1);
      },
      at === 0 ? STEP_MS - 300 : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [phase, playing, at, steps.length, toDecide]);

  // Each street lands with a soft tick and the table's own sound.
  useEffect(() => {
    if (phase !== 'story' && phase !== 'decide') return;
    if (mode === 'blitz') return;
    haptic.street();
    playSound(shown.street === 'preflop' ? 'shuffle' : shown.street === 'flop' ? 'deal' : 'place');
  }, [shown.street, s.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Blitz: 3, 2, 1, then sixty seconds.
  useEffect(() => {
    if (phase !== 'countdown') return;
    haptic.select();
    playSound('tick');
    const t = setTimeout(() => {
      if (count > 1) return setCount(count - 1);
      haptic.thud();
      setCount(0);
      setEndsAt(Date.now() + BLITZ_MS);
      setPhase('decide');
    }, 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  const finish = (all: HandResult[]) => {
    const total = all.reduce((n, x) => n + x.points + x.bonus, 0);
    const res = finishSession(mode, total);
    setNewBest(res.newBest);
    setMood('idle');
    setPhase('done');
  };

  // When Blitz's clock runs out on your move, it's over; mid-answer, the next hand ends it instead (`advance`).
  const latest = useRef({ phase, results, finish });
  useEffect(() => {
    latest.current = { phase, results, finish };
  });
  useEffect(() => {
    if (!endsAt) return;
    const t = setTimeout(
      () => {
        const now = latest.current;
        if (now.phase !== 'decide') return;
        haptic.thud();
        now.finish(now.results);
      },
      Math.max(0, endsAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [endsAt]);

  const commit = (id: OptionId, g: number | null) => {
    const grade = answerHand(s, id);
    const n = numbersFor(s, r);
    if (mode === 'daily' && session.day) {
      noteDaily(session.day, grade);
      // Today's board: the answers go to the server, which scores them itself.
      noteDailyPick(session.day, id);
    }
    let result: HandResult;
    if (mode === 'blitz') {
      const nextRun = grade === 'mistake' ? 0 : run + 1;
      setRun(nextRun);
      setBestRun(Math.max(bestRun, nextRun));
      result = { id: s.id, grade, points: blitzPoints(grade, nextRun), bonus: 0 };
    } else {
      const p = handPoints(grade, { locked, guess: g, equity: n.equity });
      result = { id: s.id, grade, ...p };
    }
    const all = [...results, result];
    setResults(all);
    setPick(id);
    setGuess(g);
    setSampled(mode === 'blitz' ? null : sampleHands(s, r));
    setOpen(mode === 'blitz' ? null : mainOpponent(s, r));
    setMood(grade === 'best' ? 'best' : grade === 'ok' ? 'ok' : 'miss');
    setPhase('reveal');
    setTimeout(
      () => {
        if (grade === 'best') {
          haptic.success();
          playSound('win');
          setBurst((b) => b + 1);
        } else {
          haptic.double();
          if (grade === 'ok') playSound('collect');
        }
      },
      mode === 'blitz' ? 60 : 280,
    );
    if (mode === 'blitz') setTimeout(() => advance(all), 850);
  };

  /** Skip, or a tap on an answer while the hand is still being told: straight to your move. */
  const skipStory = () => {
    haptic.select();
    toDecide();
  };

  const answer = (id: OptionId) => {
    if (phase === 'story') return skipStory();
    if (phase !== 'decide') return;
    playSound(ACTION_SOUND[id]);
    if (locked) haptic.thud();
    if (pro) {
      setPick(id);
      setPhase('guess');
      return;
    }
    commit(id, null);
  };

  const advance = (all: HandResult[]) => {
    const blitzOver = mode === 'blitz' && Date.now() >= endsAt;
    if (blitzOver || index + 1 >= session.queue.length) return finish(all);
    setIndex(index + 1);
    setStep(mode === 'blitz' ? 99 : 0);
    setPlaying(mode !== 'blitz');
    setPhase(mode === 'blitz' ? 'decide' : 'story');
    setPick(null);
    setGuess(null);
    setLocked(false);
    setSampled(null);
    setOpen(null);
    setMood('idle');
    setSize('bet75');
  };

  // Keep going has no end: closing it banks the points from the hands you answered.
  const closeRun = () => {
    if (mode === 'endless' && results.length > 0 && phase !== 'done')
      finishSession(
        mode,
        results.reduce((n, x) => n + x.points + x.bonus, 0),
      );
    router.back();
  };

  const restart = (next: { mode: Mode; id?: string; ids?: string; concept?: string }) => {
    const fresh = startSession(next);
    setSession(fresh);
    setIndex(fresh.start);
    setResults(fresh.prior);
    setPhase(fresh.mode === 'blitz' ? 'countdown' : 'story');
    setStep(fresh.mode === 'blitz' ? 99 : 0);
    setPlaying(fresh.mode !== 'blitz');
    setPick(null);
    setGuess(null);
    setLocked(false);
    setSampled(null);
    setOpen(null);
    setMood('idle');
    setNewBest(false);
    setCount(3);
    setEndsAt(0);
    setRun(0);
    setBestRun(0);
  };

  if (phase === 'done') {
    const grades = results.map((x) => x.grade);
    const misses = [...new Set(results.filter((x) => x.grade === 'mistake').map((x) => x.id))];
    const day = session.day
      ? new Date(`${session.day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      : undefined;
    return (
      <StudyRoom mood={grades.every((g) => g === 'best') ? 'best' : 'idle'}>
        <EndCard
          summary={{
            mode,
            title,
            day,
            score,
            stars: mode === 'blitz' || mode === 'hand' ? null : starsFor(score, results.length),
            grades,
            flame: flameOf(play).days,
            blitz: mode === 'blitz' ? { hands: results.length, run: bestRun } : undefined,
          }}
          results={results}
          newBest={newBest}
          onAgain={
            mode === 'daily'
              ? null
              : () =>
                  restart(
                    mode === 'lesson' ? { mode, concept: session.concept } : { mode: mode === 'fix' || mode === 'hand' ? 'round' : mode },
                  )
          }
          onFix={misses.length ? () => restart({ mode: 'fix', ids: misses.slice(0, 8).join(',') }) : null}
          onHand={(id) => restart({ mode: 'hand', id })}
          onDone={() => router.back()}
        />
      </StudyRoom>
    );
  }

  const seats: SeatInfo[] = s.opponents.map((o) => ({
    pos: o.pos,
    who: chars[o.pos],
    type: o.type,
    live: r.live.includes(o.pos),
    bet: shown.final ? (r.bets[o.pos] ?? 0) : 0,
  }));
  const openSeat = seats.find((x) => x.pos === open) ?? null;
  const decided = phase === 'reveal' || phase === 'guess';
  // The story line already says who checked; the price line only adds when nobody has acted yet.
  const quiet = s.actions.some((a) => a.street === shown.street && a.who !== s.hero.pos) ? '' : 'You’re first to act';
  const hold = phase === 'reveal' && pick !== 'fold' ? 'played' : phase === 'reveal' ? 'mucked' : 'live';
  const handW = compact ? 70 : Math.min(88, Math.round(width * 0.21));

  return (
    <StudyRoom mood={mood} energy={mode === 'blitz' ? Math.min(1, run / 8) : 0}>
      <View style={{ flex: 1, paddingTop: insets.top + 4, paddingBottom: barH, gap: compact ? spacing.xs : spacing.sm }}>
        <TopBar
          total={session.queue.length}
          index={index}
          done={results.map((x) => x.grade)}
          label={
            mode === 'round' || mode === 'lesson'
              ? `${Math.min(index + 1, session.queue.length)} of ${session.queue.length}`
              : mode === 'blitz'
                ? `${score}`
                : mode === 'endless'
                  ? `${index + 1}`
                  : TITLE[mode]
          }
          concept={mode === 'blitz' ? null : s.concept}
          clock={mode === 'blitz' && endsAt ? { endsAt, multiplier: blitzMultiplier(run), score } : null}
          onClose={closeRun}
        />
        <Seats seats={seats} open={open} reveal={sampled} onOpen={setOpen} />
        <ThoughtBubble
          seat={openSeat}
          read={openSeat ? (shown.final ? betRead(s, r, openSeat.pos) : 'Watch how they play it.') : ''}
          shown={sampled?.find((h) => h.pos === open) ?? null}
        />
        <FeltBoard
          board={s.board}
          shown={phase === 'countdown' ? 0 : shown.shown}
          pot={shown.pot}
          width={width - spacing.md * 2}
          compact={compact}
        />
        {phase !== 'countdown' && (
          <Story
            step={shown}
            playing={playing && phase === 'story'}
            onSkip={skipStory}
            onReplay={
              mode === 'blitz' || decided
                ? null
                : () => {
                    setStep(0);
                    setPlaying(true);
                    setPhase('story');
                  }
            }
          />
        )}
        {shown.final && phase !== 'countdown' && <Price toCall={r.toCall} pot={r.pot} quiet={quiet} />}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <HandFan
            cards={s.hero.cards}
            width={handW}
            state={hold}
            canSwipe={phase === 'decide'}
            facing={facing}
            hint={play.swipes < 3 && mode !== 'blitz'}
            onSwipe={(dir) => {
              noteSwipe();
              answer(dir === 'up' ? (facing ? 'call' : size) : facing ? 'fold' : 'check');
            }}
          />
        </View>
      </View>

      {(phase === 'decide' || phase === 'story') && (
        <ActionBar
          options={options}
          size={size}
          onSize={setSize}
          onPick={answer}
          waiting={phase === 'story'}
          pro={pro}
          locked={locked}
          onLock={() => setLocked(!locked)}
          onHeight={setBarH}
        />
      )}
      {phase === 'guess' && pick && <GuessCard pickLabel={labelOf(pick)} onDone={(g) => commit(pick, g)} />}
      {phase === 'reveal' && pick && numbers && mode !== 'blitz' && (
        <Reveal
          grade={results[results.length - 1].grade}
          pick={pick}
          best={s.best}
          labelOf={labelOf}
          why={shortWhy(s.why)}
          numbers={numbers}
          facing={facing}
          piles={s.opponents
            .filter((o) => r.live.includes(o.pos))
            .map((o) => ({ pos: o.pos, who: chars[o.pos], piles: pilesFor(s, numbers, o.pos) }))}
          points={results[results.length - 1].points}
          bonus={results[results.length - 1].bonus}
          guess={guess}
          pro={pro}
          last={index + 1 >= session.queue.length}
          maxHeight={Math.round(height * 0.64) - insets.bottom}
          onNext={() => {
            haptic.tap();
            advance(results);
          }}
          onWhy={() => router.push({ pathname: '/range-why', params: { id: s.id, pick } })}
        />
      )}
      {phase === 'reveal' && mode === 'blitz' && results.length > 0 && (
        <Flash grade={results[results.length - 1].grade} points={results[results.length - 1].points} multiplier={blitzMultiplier(run)} />
      )}
      {phase === 'countdown' && (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View key={count} entering={reduce ? undefined : popIn()}>
            <Text maxFontSizeMultiplier={1} style={{ fontFamily: ROUNDED, fontSize: 120, fontWeight: '800', color: '#ffffff' }}>
              {count || 'Go'}
            </Text>
          </Animated.View>
        </View>
      )}
      <Confetti burst={burst} origin={{ x: width / 2, y: height * 0.42 }} colors={confettiColors.gold} amount={70} />
    </StudyRoom>
  );
}
