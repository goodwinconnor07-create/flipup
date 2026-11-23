// The Demo's coach, over the real table (see docs/DEMO.md): everything but the step's part of the table goes dark
// blue, the part it's about is cut out of the dark, and a caption says what you're looking at. When the step asks you
// to do something, the thing to tap wears a gold ring and a pointing hand, and it's the only thing on the screen
// that takes a tap. One step at a time, Close always in the corner, and a finish card at the end.
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect as SvgRect } from 'react-native-svg';

import { useAnnounce } from '@/components/announce';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { useTableNow } from '@/components/table/use-now';
import { basicsOf } from '@/data/game-basics';
import { myPlayer, variantInfo, variantNeedsPremium, type Game, type Variant } from '@/engine';
import { enter, exit, EASE_OUT, popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { dispatch, me as myDevice, openDemo, startDemo } from '@/state/session';
import { brand, motion, radius, ROUNDED, spacing, useColors, useScreenReader } from '@/theme';

import { coachView, FLOW_START, nextFlow, type Flow } from './flow';
import { measureSpots, setSpotsActive, useSpots, type Rect, type SpotId } from './spots';
import { actionFor, DEMO_STEPS, short, textOf, type CoachCtx } from './steps';

/** The dark around a lit-up part: the app's deep night blue, most of the way opaque. */
const DIM = 'rgba(5, 16, 58, 0.84)';
/** Room left round a lit-up part, and the cut-out's corners. */
const PAD = 8;
const CORNER = 16;
/** Up to this many parts lit at once (a step uses one to three). */
const HOLES = 4;
/** How long a caption waits for the last one to leave (most of its 200ms exit). */
const CAPTION_AFTER = 140;
const NONE: Rect = { x: -100, y: -100, width: 0, height: 0 };

/** Texas Hold'em's three lines for the finish card (the mini games have theirs in game-basics.ts). */
const HOLDEM_BASICS = ['Two cards each, five on the board for everyone.', 'Fold, check, call or raise, in turn.', 'The best five cards win the pot.'];

/** What a step's tap is called in its instruction chip. */
function tapWord(spot: SpotId): string {
  if (spot === 'act.call') return 'Tap Call';
  if (spot === 'act.check') return 'Tap Check';
  if (spot === 'act.raise' || spot === 'raise.go') return 'Tap Bet';
  if (spot === 'act.hit') return 'Tap Hit';
  if (spot === 'power.card') return 'Tap your power';
  if (spot === 'power.go') return 'Tap the gold button';
  if (spot.startsWith('discard:')) return `Tap the ${short(spot.slice('discard:'.length))}`;
  return 'Tap it';
}

const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 });
/** Room a cut-out keeps from the screen's edges, so a wide part (the seat row) still shows its round corners. */
const EDGE = 10;
/** A cut-out kept inside the screen. */
function inside(r: Rect, width: number, height: number): Rect {
  const x = Math.max(r.x, EDGE);
  const y = Math.max(r.y, EDGE);
  return { x, y, width: Math.max(0, Math.min(r.x + r.width, width - EDGE) - x), height: Math.max(0, Math.min(r.y + r.height, height - EDGE) - y) };
}
function union(rs: Rect[]): Rect | null {
  if (!rs.length) return null;
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, width: Math.max(...rs.map((r) => r.x + r.width)) - x, height: Math.max(...rs.map((r) => r.y + r.height)) - y };
}

/** The screen less the holes, as rectangles that catch taps: bands between the holes' top and bottom edges, split round them. */
export function blockersAround(holes: Rect[], width: number, height: number): Rect[] {
  const ys = [...new Set([0, height, ...holes.flatMap((h) => [h.y, h.y + h.height])])].filter((y) => y >= 0 && y <= height).sort((a, b) => a - b);
  const out: Rect[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const top = ys[i];
    const bottom = ys[i + 1];
    if (bottom - top < 0.5) continue;
    const across = holes.filter((h) => h.y < bottom && h.y + h.height > top).sort((a, b) => a.x - b.x);
    let x = 0;
    for (const h of across) {
      if (h.x > x) out.push({ x, y: top, width: h.x - x, height: bottom - top });
      x = Math.max(x, h.x + h.width);
    }
    if (x < width) out.push({ x, y: top, width: width - x, height: bottom - top });
  }
  return out;
}

/** A lit part: where it is and how round its corners are (the felt's cut-out follows the oval). */
interface Hole extends Rect {
  r: number;
}

let maskIds = 0;

/** One step's dark with its lit parts cut out (a mask, so cut-outs may overlap). Drawn once, never animated. */
function DimLayer({ holes, width, height }: { holes: Hole[]; width: number; height: number }) {
  const [id] = useState(() => `demo-dim-${++maskIds}`);
  return (
    <Svg width={width} height={height}>
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <SvgRect x={0} y={0} width={width} height={height} fill="#ffffff" />
          {holes.map((h, i) => {
            const r = Math.min(h.r, h.width / 2, h.height / 2);
            return <SvgRect key={i} x={h.x} y={h.y} width={h.width} height={h.height} rx={r} ry={r} fill="#000000" />;
          })}
        </Mask>
      </Defs>
      <SvgRect x={0} y={0} width={width} height={height} fill={DIM} mask={`url(#${id})`} />
    </Svg>
  );
}

/**
 * The dark round the lit parts. Opacity only (docs/MOTION.md: transform and opacity, no work per frame): each step's
 * dark is drawn once, and the next step's fades in over it (180ms) as the last one fades out a little slower (220ms),
 * so the dark never thins between them. Until 23 Nov 2026 the cut-outs glided by animating the mask, which redrew
 * the whole screen's SVG every frame and ran at half speed on the phone.
 */
function Dim({ holes, layer, shown, width, height }: { holes: Hole[]; layer: string; shown: boolean; width: number; height: number }) {
  const reduce = useReduceMotion();
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(withTiming(shown ? 1 : 0, { duration: shown ? motion.base : motion.exit, easing: EASE_OUT }));
  }, [shown, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width, height }, fade]}>
      <Animated.View
        key={layer}
        entering={reduce ? undefined : FadeIn.duration(180).easing(EASE_OUT)}
        exiting={reduce ? undefined : FadeOut.duration(220).easing(EASE_OUT)}
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
      >
        <DimLayer holes={holes} width={width} height={height} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The gold ring round the thing to tap, breathing, with a pointing hand under it. Still under Reduce Motion. One ring
 * for the whole demo that moves to each step's target and hides between them (a ring per step left old rings behind
 * on the web build).
 */
function TapRing({ rect, flash, width }: { rect: Rect | null; flash: number; width: number }) {
  const reduce = useReduceMotion();
  const glow = useSharedValue(1);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      glow.set(1);
      bob.set(0);
      return;
    }
    glow.set(withRepeat(withSequence(withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1));
    bob.set(withRepeat(withSequence(withTiming(-6, { duration: 650, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 650, easing: Easing.inOut(Easing.quad) })), -1));
  }, [reduce, glow, bob]);
  // A tap anywhere else lights the ring up at once, so the eye finds it.
  useEffect(() => {
    if (!flash) return;
    glow.set(1);
    if (!reduce) glow.set(withSequence(withTiming(1, { duration: 500 }), withRepeat(withSequence(withTiming(0.45, { duration: 900 }), withTiming(1, { duration: 900 })), -1)));
  }, [flash]); // eslint-disable-line react-hooks/exhaustive-deps
  const ring = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const hand = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));
  const r = grow(rect ?? NONE, PAD - 2);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: rect ? 1 : 0 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: r.x, top: r.y, width: r.width, height: r.height, borderRadius: CORNER, borderWidth: 3, borderColor: brand.gold, boxShadow: `0 0 18px ${brand.gold}` },
          ring,
        ]}
      />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: Math.min(r.x + r.width - 26, width - 52), top: r.y + r.height - 18 }, hand]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)' }}>
          <Icon name="hand.tap.fill" size={24} color={brand.goldInk} />
        </View>
      </Animated.View>
    </View>
  );
}

/** The demo on the table: steps, then the finish card. `from` is where it was opened (the lobby goes back there). */
export function DemoCoach({ game, variant, started, from }: { game: Game; variant: Variant; started: boolean; from?: string }) {
  const steps = DEMO_STEPS[variant];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const reader = useScreenReader();
  const colors = useColors();
  const spots = useSpots();
  const now = useTableNow(game.fast, 200);
  const [flow, setFlow] = useState<Flow>(FLOW_START);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [flash, setFlash] = useState(0);
  const root = useRef<{ measureInWindow: (cb: (x: number, y: number) => void) => void } | null>(null);

  useEffect(() => {
    setSpotsActive(true);
    return () => setSpotsActive(false);
  }, []);

  const me = myPlayer(game, myDevice);
  const hand = game.hand;
  const c: CoachCtx = { game, me, hand, seat: hand?.seats.find((s) => s.playerId === me?.id), started, now, open: spots.open };
  const view = coachView(steps, flow, c);
  const step = view.step;
  // The flow moved on with the table: keep it (React's "adjust state while rendering", settled in one more pass).
  if (view.flow.index !== flow.index || view.flow.since !== flow.since) setFlow(view.flow);

  // Things on the table slide and grow, so places are measured again as each step comes up and while it's up.
  useEffect(() => {
    measureSpots();
    const timers = [120, 360, 800].map((ms) => setTimeout(measureSpots, ms));
    const every = setInterval(measureSpots, 600);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(every);
    };
  }, [step?.id, view.finished]);

  const at = (id: string): Rect | null => {
    const r = spots.rects.get(id);
    return r ? { x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height } : null;
  };
  const lit = step ? [...(step.spots ?? []), ...(step.also ?? []), ...(step.tap ? [step.tap] : [])] : [];
  const holes: Hole[] = lit
    .map((id) => {
      const r = at(id);
      // The felt is an oval: its cut-out is a stadium, so the page round it stays dark.
      return r ? { ...inside(grow(r, PAD), width, height), r: id === 'felt' ? Math.min(r.width, r.height) / 2 + PAD : CORNER } : null;
    })
    .filter((h): h is Hole => !!h)
    .slice(0, HOLES);
  const tapRect = step?.tap ? at(step.tap) : null;
  const tapHole = tapRect ? grow(tapRect, PAD) : null;
  const alsoHoles = (step?.also ?? []).map(at).filter((r): r is Rect => !!r);
  const around = union(holes);

  const title = step ? textOf(step.title, c) : '';
  const text = step ? textOf(step.text, c) : '';
  useAnnounce(step ? `${title}. ${text}` : null, step?.id);

  const next = () => {
    haptic.tap();
    if (step?.id === 'welcome') startDemo();
    setFlow(nextFlow(view.flow));
  };
  const nudge = () => {
    haptic.failure();
    setFlash((n) => n + 1);
  };
  // VoiceOver (and Switch Control) can do the step's move from the caption itself.
  const doIt = () => {
    if (!step?.tap) return;
    const a = actionFor(step.tap, c);
    if (a && a !== 'raisePanel' && a !== 'powerPanel') dispatch(a);
  };
  const restart = () => {
    haptic.tap();
    setFlow(FLOW_START);
    openDemo(variant);
  };

  const shown = !!step || view.finished;
  // Between steps the dim fades out with its cut-outs where they were: closing them as it faded showed the table's
  // next buttons (a white Check) shrinking in a hole after you tapped Call. Each step's dark is its own layer, so the
  // next step's crossfades in over it.
  const holesKey = holes.map((h) => [h.x, h.y, h.width, h.height, h.r].map(Math.round).join(',')).join('|');
  const [held, setHeld] = useState<{ key: string; holes: Hole[]; layer: string }>({ key: '', holes: [], layer: '' });
  if (step && (held.key !== holesKey || held.layer !== step.id)) setHeld({ key: holesKey, holes, layer: step.id });
  // Where the caption goes: under the lit part if there's more room there, else over it; in the middle with none.
  const top = insets.top + 64;
  const bottom = height - Math.max(insets.bottom, spacing.sm) - 8;
  const below = around ? bottom - (around.y + around.height) : 0;
  const above = around ? around.y - top : 0;
  const place = !around ? { top: Math.max(top, height * 0.3) } : below >= above ? { top: around.y + around.height + 12 } : { bottom: height - around.y + 12 };

  return (
    <View
      ref={root as never}
      onLayout={(_e: LayoutChangeEvent) => root.current?.measureInWindow((x, y) => setOrigin((o) => (o.x === x && o.y === y ? o : { x, y })))}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 100 }}
    >
      <Dim holes={view.finished ? [] : step ? holes : held.holes} layer={view.finished ? 'finish' : (step?.id ?? held.layer)} shown={shown} width={width} height={height} />

      {/* Taps: only the thing a step asks for gets through; anywhere else nudges it. Between steps, nothing does. */}
      {(step?.tap && tapHole ? blockersAround([tapHole, ...alsoHoles], width, height) : [{ x: 0, y: 0, width, height }]).map((r, i) => (
        <Pressable
          key={i}
          accessible={false}
          onPress={step?.tap ? nudge : undefined}
          style={{ position: 'absolute', left: r.x, top: r.y, width: r.width, height: r.height }}
        />
      ))}

      <TapRing rect={step?.tap ? tapRect : null} flash={flash} width={width} />

      {step && (
        <Animated.View
          key={step.id}
          // The last caption is mostly gone before this one comes (they sit in different places, and for a moment two
          // cards showed at once in the recording of 23 Nov 2026).
          entering={enter(reduce).delay(CAPTION_AFTER)}
          exiting={exit(reduce)}
          style={{ position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center', ...place }}
          pointerEvents="box-none"
        >
          <View
            accessible
            accessibilityRole={step.tap ? 'button' : 'summary'}
            accessibilityLabel={`Step ${view.flow.index + 1} of ${steps.length}. ${title}. ${text}`}
            accessibilityActions={step.tap ? [{ name: 'activate', label: tapWord(step.tap) }] : undefined}
            onAccessibilityAction={doIt}
            style={{
              width: '100%',
              maxWidth: 400,
              padding: spacing.md,
              gap: 6,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              backgroundColor: '#ffffff',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
            }}
          >
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: brand.violet }}>
              {step.id === 'welcome' ? 'DEMO' : `${view.flow.index} OF ${steps.length - 1}`}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 26, fontWeight: '800', color: '#0b0d12' }}>
              {title}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 16, lineHeight: 21, color: '#3a3f4b' }}>
              {text}
            </Text>
            {step.tap ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Icon name="hand.tap.fill" size={16} color={brand.goldDeep} />
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '800', color: brand.goldDeep }}>
                  {tapWord(step.tap)}
                </Text>
              </View>
            ) : step.watch ? null : (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={step.next ?? 'Next'}
                onPress={next}
                haptics={false}
                style={{ alignSelf: 'flex-end', marginTop: 6, minHeight: 44, minWidth: 96, paddingHorizontal: spacing.lg, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
                  {step.next ?? 'Next'}
                </Text>
              </PressableScale>
            )}
          </View>
        </Animated.View>
      )}

      {view.finished && <Finish variant={variant} from={from} onAgain={restart} reader={reader} />}

      {/* Close, always there, over the table's bar. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top, left: 0, right: 0, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md }}>
        <View style={{ paddingHorizontal: 14, height: 32, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cell }}>
          <Icon name="play.fill" size={12} color={colors.label as string} />
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: colors.label }}>
            Demo · {variantInfo(variant).name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close the demo"
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          style={({ pressed }) => ({ position: 'absolute', right: spacing.md, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cell, opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="xmark" size={17} color={colors.label as string} />
        </Pressable>
      </View>
    </View>
  );
}

/** The end: what you've seen in three lines, then play it (or unlock it), watch again, or done. */
function Finish({ variant, from, onAgain, reader }: { variant: Variant; from?: string; onAgain: () => void; reader: boolean }) {
  const reduce = useReduceMotion();
  const premium = usePremium();
  const info = variantInfo(variant);
  const locked = !premium && variantNeedsPremium(variant);
  const lines = useMemo(() => (variant === 'holdem' ? HOLDEM_BASICS : basicsOf(variant)), [variant]);
  useAnnounce(reader ? `That's ${info.name}. ${lines.join(' ')}` : null, variant);
  const inLobby = from === 'lobby';
  const play = () => {
    haptic.tap();
    if (inLobby) return router.back();
    if (locked) return router.push({ pathname: '/premium', params: { reason: 'game', game: variant } });
    router.back();
    router.push({ pathname: '/play-bots', params: { variant } });
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
      <Animated.View
        entering={reduce ? undefined : popIn()}
        accessibilityViewIsModal
        style={{ width: '100%', maxWidth: 400, padding: spacing.lg, gap: spacing.sm, alignItems: 'center', borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: '#ffffff', boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)' }}
      >
        <GameThumb variant={variant} size={76} />
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={{ fontFamily: ROUNDED, fontSize: 26, lineHeight: 30, fontWeight: '800', color: '#0b0d12', textAlign: 'center', marginTop: 4 }}>
          That’s {info.name}!
        </Text>
        <View style={{ alignSelf: 'stretch', gap: 8, marginVertical: spacing.xs }}>
          {lines.map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ marginTop: 1 }}>
                <Icon name="checkmark.circle.fill" size={18} color={brand.violet} />
              </View>
              <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 16, lineHeight: 21, color: '#3a3f4b' }}>
                {line}
              </Text>
            </View>
          ))}
        </View>
        {locked && !inLobby && (
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 14, lineHeight: 19, color: '#6b7180', textAlign: 'center' }}>
            Hosting {info.name} needs Premium. Joining a friend’s table is always free.
          </Text>
        )}
        <PressableScale
          accessibilityRole="button"
          onPress={play}
          haptics={false}
          outerStyle={{ alignSelf: 'stretch' }}
          style={{ minHeight: 54, borderRadius: radius.full, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: locked && !inLobby ? brand.gold : brand.violet }}
        >
          {locked && !inLobby && <Icon name="crown.fill" size={17} color={brand.goldInk} />}
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', color: locked && !inLobby ? brand.goldInk : '#ffffff' }}>
            {inLobby ? 'Back to the lobby' : locked ? 'Unlock with Premium' : `Play ${info.name}`}
          </Text>
        </PressableScale>
        <View style={{ flexDirection: 'row', alignSelf: 'stretch', gap: spacing.sm }}>
          <PressableScale accessibilityRole="button" onPress={onAgain} haptics={false} outerStyle={{ flex: 1 }} style={{ minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f7' }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '700', color: brand.violet }}>
              Watch again
            </Text>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              router.back();
            }}
            haptics={false}
            outerStyle={{ flex: 1 }}
            style={{ minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f7' }}
          >
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '700', color: '#0b0d12' }}>
              Done
            </Text>
          </PressableScale>
        </View>
      </Animated.View>
    </View>
  );
}
