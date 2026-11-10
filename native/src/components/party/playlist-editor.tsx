import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isPremiumVariant, PARTY_MAX_GAMES, PARTY_MIN_GAMES, variantInfo, VARIANTS, type Variant } from '@/engine';
import { EASE_OUT, enter, exit, SETTLE } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { brand, ROUNDED, spacing, useColors } from '@/theme';

import { GameThumb } from '../game-picture';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { TextButton } from '../lobby/code-card';
import { OPEN_BUTTON_ROOM } from '../setup/open-table-button';
import { NavRow } from '../setup/setup-header';
import { ThemedText } from '../themed-text';
import { autoScroll, gapAt, heldTop, HOLD_MS, HOLD_SLOP, moveItem, ROW, shuffled, slotOfTop, slotTop } from './playlist-math';

/** One game in the playlist. The id is what a row is known by while it moves, so the same game twice stays two rows. */
export interface PlaylistItem {
  id: number;
  v: Variant;
}

let nextId = 1;
export const playlistItem = (v: Variant): PlaylistItem => ({ id: nextId++, v });

/** Dragging with a mouse (the web build) shouldn't select the words. Not a typed style in this React Native, so it goes in as plain data. */
const NO_SELECT = { userSelect: 'none' } as object;
const THUMB = 40;
const GHOST_W = 220;
const GHOST_H = 60;
/** The colour a lifted game is drawn in: solid, so the rows it passes over don't show through it. */
const LIFTED = [27, 42, 85] as const;

type Drag = { kind: 'row'; id: number } | { kind: 'tile'; v: Variant };

/**
 * The party playlist: the games in order on one see-through panel, and every game to add under it. Hold a game for a
 * moment and it comes up off the page; slide it to a new place and the others make room (a spring, no overshoot,
 * motion rules 13 and 14: the lifted game is never tweened while the finger is on it). Hold a game in the Add a game
 * list and carry it over the playlist: a gap opens where it will land, and letting go drops it there. A quick tap on
 * one still adds it to the end, and the page scrolls by itself when a finger held near its top or bottom edge.
 * Built on React Native's own touches (like the raise slider), so it follows the finger on the UI thread's frame
 * and needs nothing else installed. `onChange` always gets the new list.
 */
export function PlaylistEditor({ items, onChange, footer }: { items: PlaylistItem[]; onChange: (next: PlaylistItem[]) => void; footer: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const panel = usePanel();
  const reduce = useReduceMotion();
  const premium = usePremium();

  // Typed by what's used (like the raise slider's track): the instance types of View and ScrollView differ by RN version.
  const scroll = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  const viewRef = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>(null);
  const view = useRef({ top: 0, height: 0 });
  const scrollY = useRef(0);
  const content = useRef(0);
  const listTop = useRef(0);
  const finger = useRef({ x: 0, y: 0 });
  const itemsRef = useRef(items);
  const gapRef = useRef<number | null>(null);
  const hold = useRef<{ drag: Drag; timer?: ReturnType<typeof setTimeout>; start: { x: number; y: number }; active: boolean; moved: boolean; grab: number } | null>(null);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [gap, setGap] = useState<number | null>(null);
  const [pressed, setPressed] = useState<Variant | null>(null);

  const dragTop = useSharedValue(0);
  const heldId = useSharedValue(-1);
  const listH = useSharedValue(Math.max(items.length, 1) * ROW);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOn = useSharedValue(0);
  const [ghostGame, setGhostGame] = useState<Variant>('holdem');

  const commit = (next: PlaylistItem[]) => {
    itemsRef.current = next;
    onChange(next);
  };
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const count = items.length + (gap !== null ? 1 : 0);
  useEffect(() => {
    const h = Math.max(count, 1) * ROW;
    listH.set(reduce ? h : withTiming(h, { duration: 220, easing: EASE_OUT }));
  }, [count, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const panelStyle = useAnimatedStyle(() => ({ height: listH.get() }));

  const full = items.length >= PARTY_MAX_GAMES;
  const full_alert = () => {
    haptic.failure();
    Alert.alert('The playlist is full', `A party has at most ${PARTY_MAX_GAMES} games.`);
  };

  /** Places everything that follows the finger: the lifted row, or the carried game and the gap it opens. */
  const refresh = () => {
    const h = hold.current;
    if (!h?.active) return;
    const fy = finger.current.y - view.current.top + scrollY.current - listTop.current;
    if (h.drag.kind === 'row') {
      const list = itemsRef.current;
      const id = h.drag.id;
      const top = heldTop(fy, h.grab, list.length);
      dragTop.set(top);
      const at = list.findIndex((x) => x.id === id);
      const to = slotOfTop(top, list.length);
      if (at >= 0 && to !== at) {
        commit(moveItem(list, at, to));
        haptic.select();
      }
    } else {
      ghostX.set(finger.current.x - GHOST_W / 2);
      ghostY.set(finger.current.y - view.current.top - GHOST_H * 1.3);
      const g = itemsRef.current.length < PARTY_MAX_GAMES ? gapAt(fy, itemsRef.current.length) : null;
      if (g !== gapRef.current) {
        gapRef.current = g;
        setGap(g);
        if (g !== null) haptic.select();
      }
    }
  };

  const activate = () => {
    const h = hold.current;
    if (!h || h.active) return;
    // Measure now: the screen may have still been sliding in when it was laid out.
    viewRef.current?.measureInWindow((_x, y, _w, height) => {
      const again = hold.current;
      if (again !== h || h.active) return;
      view.current = { top: y, height };
      const fy = finger.current.y - y + scrollY.current - listTop.current;
      h.active = true;
      haptic.turn();
      setDrag(h.drag);
      if (h.drag.kind === 'row') {
        const id = h.drag.id;
        const at = itemsRef.current.findIndex((x) => x.id === id);
        h.grab = fy - at * ROW;
        dragTop.set(at * ROW);
        heldId.set(id);
      } else {
        setGhostGame(h.drag.v);
        ghostOn.set(withTiming(1, { duration: 120, easing: EASE_OUT }));
      }
      refresh();
    });
  };

  const finish = (cancelled: boolean) => {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    clearTimeout(h.timer);
    setPressed(null);
    if (!h.active) {
      // A quick tap on a game in the list below adds it to the end.
      if (!cancelled && !h.moved && h.drag.kind === 'tile') {
        if (itemsRef.current.length >= PARTY_MAX_GAMES) return full_alert();
        haptic.tap();
        commit([...itemsRef.current, playlistItem(h.drag.v)]);
      }
      return;
    }
    if (h.drag.kind === 'tile') {
      const g = gapRef.current;
      if (!cancelled && g !== null && itemsRef.current.length < PARTY_MAX_GAMES) {
        haptic.tap();
        const next = itemsRef.current.slice();
        next.splice(g, 0, playlistItem(h.drag.v));
        commit(next);
      } else if (!cancelled && itemsRef.current.length >= PARTY_MAX_GAMES && gapAt(finger.current.y - view.current.top + scrollY.current - listTop.current, itemsRef.current.length) !== null) {
        full_alert();
      }
      ghostOn.set(withTiming(0, { duration: 200, easing: EASE_OUT }));
    } else {
      haptic.tap();
    }
    gapRef.current = null;
    setGap(null);
    setDrag(null);
    heldId.set(-1);
  };

  // Scrolls by itself while a finger holds a game near the top or bottom edge of the page.
  useEffect(() => {
    if (!drag) return;
    const timer = setInterval(() => {
      const v = autoScroll(finger.current.y - view.current.top, view.current.height);
      if (!v) return;
      const max = Math.max(0, content.current - view.current.height);
      const y = Math.min(max, Math.max(0, scrollY.current + v));
      if (y === scrollY.current) return;
      scrollY.current = y;
      scroll.current?.scrollTo({ y, animated: false });
      refresh();
    }, 16);
    return () => clearInterval(timer);
  }, [drag]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = (e: GestureResponderEvent) => {
    finger.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };
  /** The touch handlers for a game in the list or in Add a game: hold to lift, tap (tiles) to add. */
  const grab = (what: Drag) => ({
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => !hold.current?.active,
    onResponderGrant: (e: GestureResponderEvent) => {
      touch(e);
      const h = { drag: what, start: { ...finger.current }, active: false, moved: false, grab: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      h.timer = setTimeout(activate, HOLD_MS);
      hold.current = h;
      if (what.kind === 'tile') setPressed(what.v);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      touch(e);
      const h = hold.current;
      if (!h) return;
      if (h.active) return refresh();
      if (Math.hypot(finger.current.x - h.start.x, finger.current.y - h.start.y) > HOLD_SLOP) {
        // Moving before the hold is up is a scroll: let the page have it.
        h.moved = true;
        clearTimeout(h.timer);
        setPressed(null);
      }
    },
    onResponderRelease: () => finish(false),
    onResponderTerminate: () => finish(true),
  });

  const remove = (id: number) => {
    haptic.tap();
    commit(itemsRef.current.filter((x) => x.id !== id));
  };

  const ghost = useAnimatedStyle(() => ({
    opacity: ghostOn.get(),
    transform: [{ translateX: ghostX.get() }, { translateY: ghostY.get() }, { scale: 0.95 + 0.1 * ghostOn.get() }],
  }));

  return (
    <View
      ref={viewRef as never}
      style={{ flex: 1 }}
      onLayout={() => viewRef.current?.measureInWindow((_x, y, _w, h) => (view.current = { top: y, height: h }))}
    >
      <ScrollView
        ref={scroll as never}
        scrollEnabled={!drag}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={(_w, h) => (content.current = h)}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: OPEN_BUTTON_ROOM + insets.bottom, gap: spacing.lg }}
      >
        <NavRow title="Party playlist" />

        <View style={{ gap: spacing.xxs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
              Playlist
            </ThemedText>
            <TextButton
              title="Shuffle"
              label="Shuffle the playlist"
              onPress={() => {
                haptic.select();
                commit(shuffled(itemsRef.current));
              }}
            />
          </View>
          <ThemedText variant="subhead" tone="secondaryLabel">
            {`${items.length} of ${PARTY_MIN_GAMES}–${PARTY_MAX_GAMES} games. Hold one to move it.`}
          </ThemedText>
        </View>

        {/* Direct child of the page, so its `y` is a place on the page (the drag sums use it). */}
        <Animated.View
          onLayout={(e: LayoutChangeEvent) => (listTop.current = e.nativeEvent.layout.y)}
          style={[{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge }, panelStyle]}
        >
          {items.length === 0 && gap === null && (
            <View style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
              <ThemedText tone="tertiaryLabel">Add a game from the list below.</ThemedText>
            </View>
          )}
          {items.map((item, i) => (
            <PlaylistRow
              key={item.id}
              item={item}
              index={i}
              slot={slotTop(i, gap)}
              held={drag?.kind === 'row' && drag.id === item.id}
              dragTop={dragTop}
              heldId={heldId}
              crown={!premium && isPremiumVariant(item.v)}
              reduce={reduce}
              onRemove={() => remove(item.id)}
              touches={grab({ kind: 'row', id: item.id })}
            />
          ))}
        </Animated.View>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            Add a game
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {VARIANTS.map((v) => (
              <View
                key={v.id}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Add ${v.name}`}
                accessibilityHint="Hold and drag to a place in the playlist"
                accessibilityActions={[{ name: 'activate' }]}
                onAccessibilityAction={() => {
                  if (itemsRef.current.length >= PARTY_MAX_GAMES) return full_alert();
                  haptic.tap();
                  commit([...itemsRef.current, playlistItem(v.id)]);
                }}
                {...grab({ kind: 'tile', v: v.id })}
                style={{
                  width: '48.5%',
                  flexGrow: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: spacing.sm,
                  minHeight: 60,
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  backgroundColor: panel.fill,
                  borderWidth: 1,
                  borderColor: panel.edge,
                  opacity: pressed === v.id ? 0.6 : 1,
                  ...NO_SELECT,
                }}
              >
                <GameThumb variant={v.id} size={32} />
                <ThemedText variant="subhead" numberOfLines={2} style={{ flex: 1, fontWeight: '600' }}>
                  {v.name}
                </ThemedText>
                {!premium && isPremiumVariant(v.id) && <Icon name="crown.fill" size={12} color={brand.gold} />}
                <Icon name="plus" size={15} color={colors.accent as string} />
              </View>
            ))}
          </View>
          {!premium && (
            <ThemedText variant="footnote" tone="tertiaryLabel">
              Games with a crown need Premium to host. Friends who join never need it.
            </ThemedText>
          )}
        </View>
      </ScrollView>

      {/* The game being carried from the list: over everything, following the finger. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: GHOST_W,
            height: GHOST_H,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: 20,
            borderCurve: 'continuous',
            backgroundColor: `rgb(${LIFTED.join(',')})`,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.5)',
          },
          ghost,
        ]}
      >
        <GameThumb variant={ghostGame} size={36} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
          {variantInfo(ghostGame).name}
        </Text>
      </Animated.View>

      {footer}
    </View>
  );
}

/**
 * One game in the list. Its place is its `top` (a layout value, so a fade in and out can still use the transform):
 * it springs to a new slot whenever the order or the gap changes, follows the finger while held, and on letting go
 * starts its settle from where the finger left it. Lifted, it grows 4% and gets a solid fill and a shadow, so it
 * reads as picked up off the panel.
 */
function PlaylistRow({
  item,
  index,
  slot,
  held,
  dragTop,
  heldId,
  crown,
  reduce,
  onRemove,
  touches,
}: {
  item: PlaylistItem;
  index: number;
  slot: number;
  held: boolean;
  dragTop: SharedValue<number>;
  heldId: SharedValue<number>;
  crown: boolean;
  reduce: boolean;
  onRemove: () => void;
  touches: object;
}) {
  const colors = useColors();
  const top = useSharedValue(slot);
  const lift = useSharedValue(0);
  const was = useRef(false);

  useEffect(() => {
    if (held) {
      was.current = true;
      lift.set(withTiming(1, { duration: 120, easing: EASE_OUT }));
      return;
    }
    if (was.current) {
      // Let go: settle from where the finger left the row.
      was.current = false;
      top.set(dragTop.get());
    }
    lift.set(withTiming(0, { duration: 200, easing: EASE_OUT }));
    top.set(reduce ? slot : withSpring(slot, SETTLE));
  }, [held, slot, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = useAnimatedStyle(() => ({
    top: heldId.get() === item.id ? dragTop.get() : top.get(),
    zIndex: lift.get() > 0.01 ? 10 : 0,
  }));
  const card = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.04 * lift.get() }],
    backgroundColor: interpolateColor(lift.get(), [0, 1], [`rgba(${LIFTED.join(',')},0)`, `rgba(${LIFTED.join(',')},1)`]),
  }));
  const shadow = useAnimatedStyle(() => ({ opacity: lift.get() }));
  const hairline = useAnimatedStyle(() => ({ opacity: 1 - lift.get() }));
  const info = variantInfo(item.v);

  return (
    <Animated.View
      entering={enter(reduce)}
      exiting={exit(reduce)}
      style={[{ position: 'absolute', left: 0, right: 0, height: ROW, ...NO_SELECT }, place]}
      accessible
      accessibilityLabel={`${index + 1}. ${info.name}`}
      accessibilityActions={[{ name: 'delete', label: 'Remove' }]}
      onAccessibilityAction={onRemove}
      {...touches}
    >
      {index > 0 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: spacing.md + 22 + spacing.sm + THUMB + spacing.sm, right: 0, height: 0.5, backgroundColor: colors.separator }, hairline]} />}
      <Animated.View style={[{ flex: 1, borderRadius: 20, borderCurve: 'continuous' }, card]}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, borderCurve: 'continuous', boxShadow: '0 14px 30px rgba(0, 0, 0, 0.5)' }, shadow]} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md }}>
          <Text maxFontSizeMultiplier={1.2} style={{ width: 22, fontFamily: ROUNDED, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.tertiaryLabel as string }}>
            {index + 1}
          </Text>
          <GameThumb variant={item.v} size={THUMB} />
          <ThemedText variant="headline" numberOfLines={1} style={{ flex: 1 }}>
            {info.name}
          </ThemedText>
          {crown && <Icon name="crown.fill" size={15} color={brand.gold} />}
          <Icon name="line.3.horizontal" size={18} color={colors.tertiaryLabel as string} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${info.name}`} hitSlop={8} onPress={onRemove} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Icon name="minus.circle.fill" size={22} color={colors.red as string} />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
