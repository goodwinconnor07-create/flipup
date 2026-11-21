// The share cards, drawn like the game icons (the owner, 19 Nov 2026): the game pictures' sticker system from
// src/design/gameArt.ts, so a card looks like the game it came from. Each card is a fixed 360 × 450 points, saved at
// 3x (1080 × 1350, the shape Instagram and Messages show best), and keeps its own colours whatever the app's look.
//   a flat field in the game's colour (brand blue for your stats), its lighter spot and scattered suits
//   one subject with the shared ink outline and hard flat shadow: the real playing cards, the game's scene, the spade
//   the big number outlined like a sticker, gold when you won; labels on white capsules
//   the app icon, FlipUp and "Free on the App Store" at the top, the game's icon stuck in the corner, and your face
//   and name on the darker band at the bottom, like a game's name under its picture on Home
// Every card is free: a card is how a game gets seen. A hand can be drawn three ways (`layoutsFor()`): the hand, the
// showdown against the player who showed, and the odds street by street.
import type { ReactNode } from 'react';
import { Text as RNText, View, type TextStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text } from 'react-native-svg';

import { gameLook, gameScene, GLOW, INK, OUTLINE, SUIT_PATH, type Shape } from '@design/gameArt';
import { IconArt } from '@/components/app-icon-art';
import { DrawnThumb, draw, FONT } from '@/components/game-picture';
import { ICON_RADIUS } from '@/components/launch-mark';
import { brand, cardColors, ROUNDED } from '@/theme';

import type { Card, Street, Variant } from '@/engine';

import type { ShareData, ShareSide } from './data';
import { BAND, CARD_H, CARD_W, handCardLayout, layoutsFor, ROW_MAX, showdownLayout, SIDE_X, VS, type Placed, type ShareLayout } from './layout';

export { CARD_H, CARD_W } from './layout';
const SHADOW = 0.24;
const WHITE = '#ffffff';

export { isShareLayout, LAYOUT_NAMES, layoutsFor, type ShareLayout } from './layout';

/** Your stats wear the brand: the app's blue in the game pictures' three shades. */
const BRAND_LOOK = { field: brand.violet, tone: cardColors.violet[0], band: brand.violetDeep } as const;
function lookOf(d: ShareData) {
  if (!d.variant) return BRAND_LOOK;
  const l = gameLook(d.variant);
  return { field: l.card[0], tone: l.tone, band: l.band };
}

export function ShareCard({ data, layout = 'hand' }: { data: ShareData; layout?: ShareLayout }) {
  const look = lookOf(data);
  const use = layoutsFor(data).includes(layout) ? layout : 'hand';
  const art =
    data.kind === 'stats' ? <StatsArt d={data} look={look} /> : data.kind === 'game' ? <GameArt d={data} /> : use === 'showdown' ? <ShowdownArt d={data} /> : use === 'odds' ? <OddsArt d={data} /> : <HandArt d={data} />;
  return (
    <View style={{ width: CARD_W, height: CARD_H, overflow: 'hidden', backgroundColor: look.field }}>
      <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute' }}>
        {data.kind !== 'game' && <Field look={look} />}
        {art}
        <Rect y={CARD_H - BAND} width={CARD_W} height={BAND} fill={look.band} />
        <Path d={`M0 ${CARD_H - BAND}H${CARD_W}`} stroke={INK} strokeWidth={OUTLINE} />
      </Svg>
      <Header />
      {data.variant && <GameSticker variant={data.variant} />}
      <Band d={data} />
    </View>
  );
}

// ── The pieces every card shares ────────────────────────────────────────────

/** The game picture's backdrop, card sized: the soft spot and the suit scattered in the lighter shade. */
function Field({ look }: { look: { tone: string } }) {
  const spots: [number, number, number, number][] = [
    [30, 92, -18, 1.8],
    [334, 120, 16, 1.5],
    [18, 300, 24, 2.1],
    [344, 290, -22, 1.9],
  ];
  return (
    <G>
      <Circle cx={180} cy={214} r={152} fill={look.tone} />
      {spots.map(([x, y, r, k]) => (
        <Path key={`${x}`} d={SUIT_PATH['♠']} fill={look.tone} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} />
      ))}
    </G>
  );
}

/** FlipUp's own icon, the name and where to get it: every card is an advert for the app. */
function Header() {
  const size = 40;
  return (
    <View style={{ position: 'absolute', top: 18, left: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: size, height: size, borderRadius: size * ICON_RADIUS, borderCurve: 'continuous', boxShadow: `0 3px 0 rgba(20, 20, 28, ${SHADOW})` }}>
        <View style={{ flex: 1, borderRadius: size * ICON_RADIUS, borderCurve: 'continuous', overflow: 'hidden' }}>
          <IconArt size={size} id="share-icon" />
        </View>
      </View>
      <View>
        <RNText style={{ ...words, fontSize: 19, fontWeight: '800', lineHeight: 22 }}>FlipUp</RNText>
        <RNText style={{ ...words, fontSize: 12, fontWeight: '700', opacity: 0.88 }}>Free on the App Store</RNText>
      </View>
    </View>
  );
}

/** The game's icon, slapped on the corner like a sticker. */
function GameSticker({ variant }: { variant: Variant }) {
  const size = 54;
  return (
    <View style={{ position: 'absolute', top: 16, right: 18, transform: [{ rotate: '6deg' }], borderRadius: size * 0.24, boxShadow: `0 3.4px 0 rgba(20, 20, 28, ${SHADOW})` }}>
      <View style={{ borderRadius: size * 0.24, borderWidth: OUTLINE, borderColor: INK, overflow: 'hidden' }}>
        <DrawnThumb variant={variant} size={size - OUTLINE * 2} rounded={size * 0.24 - OUTLINE} />
      </View>
    </View>
  );
}

/** Your face and name on the band, with the game (or, for stats, the games you play most). */
function Band({ d }: { d: ShareData }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAND, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <RNText style={{ fontSize: 22 }}>{d.who.emoji}</RNText>
      <RNText numberOfLines={1} style={{ ...words, flexShrink: 1, fontSize: 17, fontWeight: '800' }}>
        {d.who.name}
      </RNText>
      <View style={{ flex: 1 }} />
      {d.kind === 'stats' && d.games?.length ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {d.games.map((v) => (
            <View key={v} style={{ borderRadius: 8, borderWidth: 2, borderColor: INK, overflow: 'hidden' }}>
              <DrawnThumb variant={v} size={26} rounded={6} />
            </View>
          ))}
        </View>
      ) : (
        <RNText numberOfLines={1} style={{ ...words, flexShrink: 1, fontSize: 14, fontWeight: '700', opacity: 0.88 }}>
          {d.kind === 'stats' ? d.date : d.game}
        </RNText>
      )}
    </View>
  );
}

const words: TextStyle = { fontFamily: ROUNDED, color: WHITE };

/** Sticker words: the hard shadow, a thick ink outline, then the fill on top. */
function Sticker({ x, y, size, fill = WHITE, children }: { x: number; y: number; size: number; fill?: string; children: string }) {
  const ow = Math.max(OUTLINE, size * 0.12) * 2;
  const common = { x, fontFamily: FONT, fontSize: size, fontWeight: '900' as const, textAnchor: 'middle' as const };
  return (
    <G>
      <Text {...common} y={y + Math.max(3.4, size * 0.07)} fill={INK} stroke={INK} strokeWidth={ow} strokeLinejoin="round" opacity={SHADOW}>
        {children}
      </Text>
      <Text {...common} y={y} fill={INK} stroke={INK} strokeWidth={ow} strokeLinejoin="round">
        {children}
      </Text>
      <Text {...common} y={y} fill={fill}>
        {children}
      </Text>
    </G>
  );
}

/** Plain words on the field, no outline. */
function Words({ x, y, size, children, opacity = 1, weight = '800' }: { x: number; y: number; size: number; children: string; opacity?: number; weight?: '700' | '800' | '900' }) {
  return (
    <Text x={x} y={y} fontFamily={FONT} fontSize={size} fontWeight={weight} textAnchor="middle" fill={WHITE} opacity={opacity}>
      {children}
    </Text>
  );
}

/** A white capsule with ink capitals, outlined, with the hard shadow. Long labels get smaller letters. */
function Capsule({ x, y, text, fill = WHITE, max = 300 }: { x: number; y: number; text: string; fill?: string; max?: number }) {
  const size = Math.min(13, (max - 28) / (text.length * 0.72));
  const w = Math.min(max, text.length * size * 0.72 + 28);
  const h = size + 15;
  const d = rr(x - w / 2, y - h / 2, w, h, h / 2);
  return (
    <G>
      <Path d={d} fill={INK} opacity={SHADOW} transform="translate(0 3.4)" />
      <Path d={d} fill={fill} stroke={INK} strokeWidth={OUTLINE} />
      <Text x={x} y={y + size * 0.36} fontFamily={FONT} fontSize={size} fontWeight="900" letterSpacing={1} textAnchor="middle" fill={INK}>
        {text}
      </Text>
    </G>
  );
}

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** An outlined shape with its hard shadow. */
function Ink({ d, fill, t, sw = OUTLINE }: { d: string; fill: string; t?: string; sw?: number }) {
  return (
    <G transform={t}>
      <Path d={d} fill={INK} opacity={SHADOW} transform="translate(0 3.4)" />
      <Path d={d} fill={fill} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
    </G>
  );
}

const SUITS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
/** A real card as the game pictures draw it. */
const sticker = (c: Card, x: number, y: number, s: number, r = 0, glow = false): Shape => ({ kind: 'card', x, y, s, r, rank: c[0] === 'T' ? '10' : c[0], suit: SUITS[c[1]] ?? '♠', glow });
const drawn = (shapes: Shape[]) => shapes.map((s, i) => draw(s, i));

/** Cards placed by layout.ts, drawn as the game pictures' sticker cards; `glow` frames the ones that swung the hand. */
function cardsAt(cards: Card[], at: Placed[], glow: ReadonlySet<Card> = new Set()): Shape[] {
  return cards.map((c, i) => sticker(c, at[i].x, at[i].y, at[i].s, at[i].r, glow.has(c)));
}

/** A headline's size so it fits the card's width. */
const fit = (text: string, size: number, width = 300) => Math.min(size, width / (text.length * 0.6));

// ── The cards ───────────────────────────────────────────────────────────────

function HandArt({ d }: { d: ShareData }) {
  const hole = d.hole ?? [];
  const board = d.board ?? [];
  const hasBoard = board.length > 0;
  const at = handCardLayout(hole.length, board.length);
  const line = d.moment?.headline ?? d.subline;
  return (
    <G>
      <Capsule x={180} y={98} text={d.eyebrow} />
      {drawn(cardsAt(hole, at.hole))}
      {drawn(cardsAt(board, at.board, new Set(d.swing ?? [])))}
      <Sticker x={180} y={hasBoard ? 350 : 336} size={fit(d.headline, board.length > ROW_MAX ? 40 : 48)} fill={d.tone === 'win' ? GLOW : WHITE}>
        {d.headline}
      </Sticker>
      {line && (
        <Words x={180} y={hasBoard ? 377 : 368} size={fit(line, 15, 320)} opacity={0.95}>
          {line}
        </Words>
      )}
    </G>
  );
}

/** One player's cards, name and a capsule: your chips for you, their hand (or WON) for them. */
function Side({ side, x, at, tag }: { side: ShareSide; x: number; at: Placed[]; tag?: string }) {
  return (
    <G>
      {drawn(cardsAt(side.cards, at))}
      <Words x={x} y={238} size={fit(side.name, 16, 120)} weight="900">
        {side.name}
      </Words>
      {!!tag && <Capsule x={x} y={262} text={tag.toUpperCase()} max={140} fill={side.won ? GLOW : WHITE} />}
    </G>
  );
}

function ShowdownArt({ d }: { d: ShareData }) {
  const m = d.matchup!;
  const them = m.them;
  const board = d.board ?? [];
  const at = showdownLayout(m.you.cards.length, them?.cards.length ?? 0, board.length);
  return (
    <G>
      <Capsule x={180} y={98} text={d.eyebrow} />
      <Side side={m.you} x={SIDE_X[0]} at={at.you} tag={d.headline} />
      {them && <Side side={them} x={SIDE_X[1]} at={at.them} tag={them.hand?.split(',')[0] ?? (them.won ? 'Won' : '')} />}
      <Ink d={circle(VS.x, VS.y, VS.r)} fill={GLOW} />
      <Text x={VS.x} y={VS.y + 6.5} fontFamily={FONT} fontSize={18} fontWeight="900" textAnchor="middle" fill={INK}>
        VS
      </Text>
      {drawn(cardsAt(board, at.board, new Set(d.swing ?? [])))}
      {d.moment && (
        <Words x={180} y={377} size={fit(d.moment.headline, 15, 320)} opacity={0.95}>
          {d.moment.headline}
        </Words>
      )}
    </G>
  );
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const STREET_SHORT: Record<Street, string> = { preflop: 'PRE', flop: 'FLOP', turn: 'TURN', river: 'RIVER' };

/** Your chance street by street as one thick outlined line, like the beanstalk's stalk. */
function OddsArt({ d }: { d: ShareData }) {
  const odds = d.odds ?? [];
  const left = 58, right = 302, top = 152, bottom = 312;
  const step = odds.length > 1 ? (right - left) / (odds.length - 1) : 0;
  const pts = odds.map((o, i) => [left + i * step, bottom - o.you * (bottom - top)] as const);
  const path = 'M' + pts.map(([x, y]) => `${x} ${y}`).join('L');
  const won = d.tone === 'win';
  return (
    <G>
      <Capsule x={180} y={98} text={d.eyebrow} />
      <Path d={path} fill="none" stroke={INK} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" opacity={SHADOW} transform="translate(0 3.4)" />
      <Path d={path} fill="none" stroke={INK} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
      <Path d={path} fill="none" stroke={WHITE} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const last = i === pts.length - 1;
        const below = y < top + 30;
        return (
          <G key={i}>
            <Ink d={circle(x, y, last ? 12 : 8.5)} fill={last && won ? GLOW : WHITE} />
            <Sticker x={x} y={below ? y + 34 : y - 20} size={17}>
              {`${Math.round(odds[i].you * 100)}%`}
            </Sticker>
            <Words x={x} y={344} size={12} weight="900" opacity={0.85}>
              {STREET_SHORT[odds[i].street]}
            </Words>
          </G>
        );
      })}
      <Words x={180} y={376} size={fit(d.moment?.headline ?? d.subline ?? '', 15, 320)} opacity={0.95}>
        {d.moment?.headline ?? `${d.headline} · ${d.subline ?? ''}`}
      </Words>
    </G>
  );
}

/** A finished game: the game's own wide scene and a medal for your place. */
function GameArt({ d }: { d: ShareData }) {
  const first = d.tone === 'win';
  return (
    <G>
      <G transform="translate(0 66) scale(1.8)">{drawn(gameScene(d.variant ?? 'holdem'))}</G>
      <Ink d="M-30 26L-42 74L-25 66L-15 82L0 36Z" fill="#e8414f" t="translate(180 252)" />
      <Ink d="M30 26L42 74L25 66L15 82L0 36Z" fill="#2f7de0" t="translate(180 252)" />
      <Ink d={circle(0, 0, 40)} fill={first ? GLOW : '#e9edf5'} t="translate(180 252)" />
      <Path d={circle(180, 252, 30)} fill="none" stroke={INK} strokeWidth={1.8} opacity={0.3} />
      <Text x={180} y={263} fontFamily={FONT} fontSize={30} fontWeight="900" textAnchor="middle" fill={INK}>
        {d.headline}
      </Text>
      <Sticker x={180} y={350} size={28}>
        {first ? 'Won the table' : `${d.headline} place`}
      </Sticker>
      {d.subline && (
        <Words x={180} y={376} size={14} opacity={0.92}>
          {d.subline}
        </Words>
      )}
    </G>
  );
}

/** Your stats: the FlipUp spade as the sticker, your win rate on it, three numbers under it. */
function StatsArt({ d, look }: { d: ShareData; look: { field: string } }) {
  const stats = d.stats ?? [];
  return (
    <G>
      <Capsule x={180} y={98} text={d.eyebrow} />
      <Ink d={SPADE} fill={WHITE} t="translate(180 212) scale(1.35)" sw={OUTLINE / 1.35} />
      <Sticker x={180} y={236} size={fit(d.headline, 46, 150)} fill={look.field}>
        {d.headline}
      </Sticker>
      {d.subline && (
        <Words x={180} y={318} size={15} opacity={0.95}>
          {d.subline}
        </Words>
      )}
      {stats.map((s, i) => {
        const x = 70 + i * 110;
        return (
          <G key={s.label}>
            <Sticker x={x} y={352} size={fit(s.value, 22, 100)}>
              {s.value}
            </Sticker>
            <Words x={x} y={372} size={10} weight="900" opacity={0.8}>
              {s.label}
            </Words>
          </G>
        );
      })}
    </G>
  );
}

/** The spade from the app icon (scripts/makeAppIcon.mjs), without the chevron: a sticker big enough to write on. */
const SPADE =
  'M0 -60 C6 -46 22 -34 38 -20 C52 -8 58 4 58 18 C58 37 44 49 27 49 C15 49 7 44 3.5 37 C5 48 12 57 25 62 C26 63 25.5 65 24 65 L-24 65 C-25.5 65 -26 63 -25 62 C-12 57 -5 48 -3.5 37 C-7 44 -15 49 -27 49 C-44 49 -58 37 -58 18 C-58 4 -52 -8 -38 -20 C-22 -34 -6 -46 0 -60 Z';

/** A small live preview of a layout, for the composer's picker. */
export function LayoutPreview({ data, layout, width }: { data: ShareData; layout: ShareLayout; width: number }): ReactNode {
  const k = width / CARD_W;
  return (
    <View style={{ width, height: CARD_H * k, overflow: 'hidden' }}>
      <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale: k }], transformOrigin: 'top left' }}>
        <ShareCard data={data} layout={layout} />
      </View>
    </View>
  );
}
