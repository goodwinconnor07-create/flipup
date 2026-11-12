// The share card designs. Each draws the same `ShareData` (data.ts) at a fixed 360 × 450 points, saved at 3x
// (1080 × 1350, the shape Instagram and Messages show best). They are pictures to send, so they keep their own
// colours and type whatever the app's appearance: Night is free, the rest come with FlipUp Premium. A design that
// needs a hand (`fits`) is only offered for one: the odds chart needs odds, so a hand where everyone still in showed.
//   night    the app's night card: big rounded numbers on deep blue
//   felt     a photo of the table: the cards on green felt inside a gold rail
//   gold     black lacquer, gold foil frame, serif type: a luxury invitation
//   receipt  a casino till receipt: the hand line by line in monospace, torn edge
//   poster   a Swiss poster: one giant number on a blue block, heavy type
//   odds     your win chance street by street as a line, from where you were to where you ended
//   broadcast a TV poker graphic: the board, both hands on name plates with their odds, the moment as a ticker
import type { ReactNode } from 'react';
import { Platform, Text, View, type TextStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PlayingCard } from '@/components/table/playing-card';
import { brand, cardColors, gradient, ROUNDED } from '@/theme';

import type { Card, Street } from '@/engine';

import type { ShareData, ShareSide } from './data';

export const CARD_W = 360;
export const CARD_H = 450;

export type ShareDesignId = 'night' | 'felt' | 'gold' | 'receipt' | 'poster' | 'odds' | 'broadcast';

export interface ShareDesign {
  id: ShareDesignId;
  name: string;
  premium: boolean;
  swatch: readonly string[];
  /** Only offered for cards it can draw; every card when left out. */
  fits?: (d: ShareData) => boolean;
}

export const SHARE_DESIGNS: ShareDesign[] = [
  { id: 'night', name: 'Night', premium: false, swatch: cardColors.night },
  { id: 'felt', name: 'Felt', premium: true, swatch: ['#2f9a5a', '#16673a', '#083a20'] },
  { id: 'gold', name: 'Gold Foil', premium: true, swatch: ['#1b1a1f', '#0a0a0c', '#d9a93a'] },
  { id: 'receipt', name: 'Receipt', premium: true, swatch: ['#faf7ef', '#efe9da', '#1b1b1b'] },
  { id: 'poster', name: 'Poster', premium: true, swatch: [brand.violet, '#ffffff', '#0b0b0f'] },
  { id: 'odds', name: 'Odds', premium: true, swatch: ['#0d1a44', '#060b1c', brand.gold], fits: (d) => (d.odds?.length ?? 0) >= 2 },
  { id: 'broadcast', name: 'Broadcast', premium: true, swatch: ['#1f4fc9', '#0a1d55', brand.gold], fits: (d) => d.kind === 'hand' && !!d.hole?.length },
];

/** The designs that can draw this card. */
export const designsFor = (d: ShareData): ShareDesign[] => SHARE_DESIGNS.filter((x) => !x.fits || x.fits(d));

export const isShareDesign = (v: unknown): v is ShareDesignId => SHARE_DESIGNS.some((d) => d.id === v);

const SERIF = Platform.select({ ios: 'Didot', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function ShareCard({ design, data }: { design: ShareDesignId; data: ShareData }) {
  const fits = SHARE_DESIGNS.find((d) => d.id === design)?.fits;
  const Design = fits && !fits(data) ? Night : { night: Night, felt: Felt, gold: Gold, receipt: Receipt, poster: Poster, odds: Odds, broadcast: Broadcast }[design];
  return (
    <View style={{ width: CARD_W, height: CARD_H, overflow: 'hidden' }}>
      <Design data={data} />
    </View>
  );
}

/** The cards a share card shows: your hole cards, then the board (or your best hand). */
function Cards({ data, width, gap = 6, boardWidth }: { data: ShareData; width: number; gap?: number; boardWidth?: number }) {
  if (!data.hole?.length && !data.board?.length) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: gap * 2 }}>
      {!!data.hole?.length && (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {data.hole.map((c) => (
            <PlayingCard key={c} card={c} size="md" width={width} />
          ))}
        </View>
      )}
      {!!data.board?.length && (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {data.board.map((c) => (
            <PlayingCard key={c} card={c} size="md" width={boardWidth ?? width * 0.8} />
          ))}
        </View>
      )}
    </View>
  );
}

const handle = (data: ShareData) => (data.who.username ? `@${data.who.username}` : data.who.name);

// ── Night ───────────────────────────────────────────────────────────────────

function Night({ data }: { data: ShareData }) {
  const label: TextStyle = { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' };
  return (
    <LivingCard colors={cardColors.night} radius={0} shadow={false} still outerStyle={{ width: CARD_W, height: CARD_H }} style={{ flex: 1, padding: 26, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
          <Icon name="suit.spade.fill" size={15} color="#ffffff" />
        </View>
        <Text style={{ flex: 1, fontFamily: ROUNDED, fontSize: 21, fontWeight: '800', color: '#ffffff' }}>FlipUp</Text>
        <Text style={label}>{data.eyebrow}</Text>
      </View>
      <View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 88, lineHeight: 96, fontWeight: '800', color: data.tone === 'win' ? brand.gold : '#ffffff' }}>
          {data.headline}
        </Text>
        {data.subline && <Text style={{ fontFamily: ROUNDED, fontSize: 19, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>{data.subline}</Text>}
      </View>
      <Cards data={data} width={46} />
      {data.stats && (
        <View style={{ flexDirection: 'row' }}>
          {data.stats.map((s) => (
            <View key={s.label} style={{ flex: 1 }}>
              <Text style={{ ...label, fontSize: 9 }}>{s.label}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 22, fontWeight: '800', color: '#ffffff' }}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{data.who.emoji}</Text>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
          {handle(data)}
        </Text>
        <Text numberOfLines={1} style={{ ...label, letterSpacing: 0.4, fontWeight: '600' }}>
          {data.game ?? data.date ?? 'Poker night on your phones'}
        </Text>
      </View>
    </LivingCard>
  );
}

// ── Felt ────────────────────────────────────────────────────────────────────

function Felt({ data }: { data: ShareData }) {
  const goldText: TextStyle = { color: '#f3d27a', fontWeight: '800', letterSpacing: 2, fontSize: 11 };
  return (
    <View style={{ flex: 1, backgroundColor: '#3a2414', padding: 14 }}>
      <View style={{ flex: 1, borderRadius: 150, borderWidth: 5, borderColor: '#d8b25a', overflow: 'hidden', ...gradient('radial-gradient(ellipse at 50% 40%, #33a463 0%, #187040 60%, #0b4325 100%)') }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 20 }}>
          <Text style={goldText}>{data.eyebrow}</Text>
          <Cards data={data} width={52} boardWidth={44} gap={4} />
          <View style={{ alignItems: 'center', paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 52, lineHeight: 58, fontWeight: '800', color: data.tone === 'win' ? '#ffe08a' : '#ffffff' }}>
              {data.headline}
            </Text>
          </View>
          {data.subline && (
            <Text numberOfLines={2} style={{ textAlign: 'center', fontFamily: ROUNDED, fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
              {data.subline}
            </Text>
          )}
          {data.stats && !data.hole && (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              {data.stats.slice(0, 3).map((s) => (
                <View key={s.label} style={{ alignItems: 'center' }}>
                  <Text style={{ ...goldText, fontSize: 9, letterSpacing: 1 }}>{s.label}</Text>
                  <Text style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '800', color: '#ffffff' }}>{s.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 8 }}>
        <Text style={{ flex: 1, ...goldText, fontSize: 12 }}>
          {data.who.emoji} {handle(data)}
        </Text>
        <Text style={{ ...goldText, fontSize: 12 }}>♠ FLIPUP</Text>
      </View>
    </View>
  );
}

// ── Gold Foil ───────────────────────────────────────────────────────────────

const FOIL = 'linear-gradient(135deg, #fff1c1 0%, #e6b956 25%, #9c6b1b 50%, #f2d27c 72%, #b07d24 100%)';
const GOLD_INK = '#e3bb5c';

function Gold({ data }: { data: ShareData }) {
  return (
    <View style={{ flex: 1, padding: 18, ...gradient('linear-gradient(160deg, #1d1c22 0%, #09090b 55%, #18171c 100%)') }}>
      <View style={{ flex: 1, padding: 3, borderRadius: 6, ...gradient(FOIL) }}>
        <View style={{ flex: 1, borderRadius: 4, backgroundColor: '#0c0c0e', padding: 22, alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: 6, color: GOLD_INK }}>FLIPUP</Text>
            <View style={{ width: 40, height: 1, backgroundColor: GOLD_INK }} />
            <Text style={{ fontFamily: SERIF, fontSize: 12, letterSpacing: 3, color: 'rgba(227,187,92,0.8)' }}>{data.eyebrow}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 96, color: GOLD_INK }}>
              {data.headline}
            </Text>
            {data.subline && (
              <Text numberOfLines={2} style={{ textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: '#f3e3b8' }}>
                {data.subline}
              </Text>
            )}
          </View>
          <Cards data={data} width={42} />
          {data.stats && !data.hole && (
            <View style={{ flexDirection: 'row', gap: 22 }}>
              {data.stats.slice(0, 3).map((s) => (
                <View key={s.label} style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: SERIF, fontSize: 22, color: '#f3e3b8' }}>{s.value}</Text>
                  <Text style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: 2, color: 'rgba(227,187,92,0.75)' }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 40, height: 1, backgroundColor: GOLD_INK }} />
            <Text style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: 1, color: '#f3e3b8' }}>
              {data.who.emoji} {handle(data)}
            </Text>
            {(data.game || data.date) && <Text style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: 2, color: 'rgba(227,187,92,0.7)' }}>{(data.game ?? data.date ?? '').toUpperCase()}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Receipt ─────────────────────────────────────────────────────────────────

/** The receipt's torn edge: a row of paper teeth. */
function Tear({ flip }: { flip?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', height: 8, transform: flip ? [{ rotate: '180deg' }] : undefined }}>
      {Array.from({ length: 24 }, (_, i) => (
        <View key={i} style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#faf7ef' }} />
      ))}
    </View>
  );
}

function Receipt({ data }: { data: ShareData }) {
  const ink = '#1b1b1b';
  const t: TextStyle = { fontFamily: MONO, fontSize: 11, lineHeight: 15, color: ink };
  // The hand line by line, cut to what fits with the total at the bottom.
  const all = data.lines ?? [];
  const lines = all.length > 13 ? [...all.slice(0, 6), { left: '…' }, ...all.slice(-6)] : all;
  return (
    <View style={{ flex: 1, backgroundColor: '#2b2d33', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 288, transform: [{ rotate: '-2deg' }] }}>
        <Tear />
        <View style={{ backgroundColor: '#faf7ef', paddingHorizontal: 18, paddingVertical: 12, gap: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ ...t, fontSize: 16, fontWeight: '700', letterSpacing: 4 }}>♠ FLIPUP ♠</Text>
            <Text style={t}>{data.eyebrow}</Text>
            <Text style={t}>{data.date ?? new Date().toLocaleDateString('en-GB')}</Text>
          </View>
          <Text style={t}>{'-'.repeat(36)}</Text>
          {lines.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              <Text numberOfLines={1} style={{ ...t, flex: 1 }}>
                {l.left}
              </Text>
              {l.right !== undefined && <Text style={t}>{l.right}</Text>}
            </View>
          ))}
          <Text style={t}>{'='.repeat(36)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ ...t, flex: 1, fontWeight: '700' }}>{data.kind === 'hand' ? 'NET' : 'TOTAL'}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...t, fontSize: 30, lineHeight: 36, fontWeight: '700' }}>
              {data.headline}
            </Text>
          </View>
          {data.subline && <Text style={{ ...t, textAlign: 'right' }}>{data.subline}</Text>}
          <Text style={t}>{'-'.repeat(36)}</Text>
          <Text style={{ ...t, textAlign: 'center' }}>
            {data.who.emoji} {handle(data)}
          </Text>
          <Text style={{ ...t, textAlign: 'center', fontSize: 9 }}>THANK YOU FOR PLAYING · PLAY CHIPS ONLY</Text>
          {/* A barcode, for the look. */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', height: 26, gap: 1.5, marginTop: 2 }}>
            {Array.from({ length: 46 }, (_, i) => (
              <View key={i} style={{ width: (i * 7) % 3 === 0 ? 2.5 : 1, backgroundColor: ink }} />
            ))}
          </View>
        </View>
        <Tear flip />
      </View>
    </View>
  );
}

// ── Poster ──────────────────────────────────────────────────────────────────

function Poster({ data }: { data: ShareData }) {
  const black = '#0b0b0f';
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ height: 270, backgroundColor: brand.violet, padding: 22, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#ffffff' }}>FLIPUP</Text>
          <Text style={{ fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#ffffff' }}>{data.date ?? 'POKER'}</Text>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 150, lineHeight: 150, fontWeight: '900', letterSpacing: -6, color: '#ffffff' }}>
          {data.headline}
        </Text>
      </View>
      <View style={{ height: 14, backgroundColor: data.tone === 'win' ? brand.gold : black }} />
      <View style={{ flex: 1, padding: 22, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 30, lineHeight: 32, fontWeight: '900', letterSpacing: -1, color: black }}>{data.eyebrow}</Text>
          {data.subline && (
            <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '600', color: black }}>
              {data.subline}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {data.hole?.length || data.board?.length ? (
            <Cards data={data} width={30} boardWidth={26} gap={3} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '800', color: black }}>{data.stats?.map((s) => `${s.label} ${s.value}`).slice(0, 2).join('   ')}</Text>
          )}
          <Text style={{ fontSize: 13, fontWeight: '900', color: black }}>
            {data.who.emoji} {handle(data)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Odds ────────────────────────────────────────────────────────────────────

const STREET_SHORT: Record<Street, string> = { preflop: 'PRE', flop: 'FLOP', turn: 'TURN', river: 'RIVER' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const GOLD = brand.gold;
const NIGHT = '#060b1c';

/** Where the story starts: your lowest point for a win, your highest for a loss. */
function oddsStory(odds: { you: number }[], won: boolean) {
  const before = odds.slice(0, -1);
  const from = before.reduce((m, o) => (won ? Math.min(m, o.you) : Math.max(m, o.you)), won ? 1 : 0);
  return { from, to: odds[odds.length - 1].you };
}

function Odds({ data }: { data: ShareData }) {
  const odds = data.odds ?? [];
  const won = data.tone === 'win';
  const { from, to } = oddsStory(odds, won);
  // The chart: 316 wide, 100% at 30 points down and 0% at 166, leaving room above every point for its number.
  const W = 316;
  const H = 196;
  const top = 30;
  const bottom = 166;
  const x = (i: number) => 18 + (i * (W - 36)) / Math.max(1, odds.length - 1);
  const y = (v: number) => bottom - v * (bottom - top);
  const line = odds.map((o, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(o.you).toFixed(1)}`).join(' ');
  const area = `${line} L${x(odds.length - 1).toFixed(1)} ${bottom} L${x(0).toFixed(1)} ${bottom} Z`;
  const label: TextStyle = { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(255,255,255,0.55)' };
  const big: TextStyle = { fontFamily: ROUNDED, fontSize: 54, lineHeight: 60, fontWeight: '800', letterSpacing: -1.5 };
  return (
    <View style={{ flex: 1, backgroundColor: NIGHT, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={label}>MY WIN CHANCE</Text>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {data.hole?.map((c) => (
            <PlayingCard key={c} card={c} size="sm" width={24} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <Text style={{ ...big, color: 'rgba(255,255,255,0.4)' }}>{pct(from)}</Text>
        <Icon name="arrow.right" size={22} color={won ? GOLD : 'rgba(255,255,255,0.7)'} />
        <Text style={{ ...big, color: won ? GOLD : '#ffffff' }}>{pct(to)}</Text>
      </View>
      <Text numberOfLines={2} style={{ fontFamily: ROUNDED, fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#ffffff' }}>
        {data.moment?.headline ?? data.subline}
      </Text>

      <View style={{ width: W, height: H + 20, marginTop: 8 }}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="oddsFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={GOLD} stopOpacity={0.4} />
              <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line x1={0} x2={W} y1={y(0.5)} y2={y(0.5)} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 5" />
          <Line x1={0} x2={W} y1={bottom} y2={bottom} stroke="rgba(255,255,255,0.14)" />
          <Path d={area} fill="url(#oddsFill)" />
          <Path d={line} stroke={GOLD} strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {odds.map((o, i) => (
            <Circle key={o.street} cx={x(i)} cy={y(o.you)} r={i === odds.length - 1 ? 6 : 4.5} fill={i === odds.length - 1 ? GOLD : NIGHT} stroke={GOLD} strokeWidth={2.5} />
          ))}
        </Svg>
        {odds.map((o, i) => (
          <Text key={o.street} style={{ position: 'absolute', left: x(i) - 30, width: 60, textAlign: 'center', top: y(o.you) - 24, fontFamily: ROUNDED, fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
            {pct(o.you)}
          </Text>
        ))}
        {odds.map((o, i) => (
          <Text key={`l-${o.street}`} style={{ ...label, position: 'absolute', left: x(i) - 30, width: 60, textAlign: 'center', top: bottom + 8 }}>
            {STREET_SHORT[o.street]}
          </Text>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 34, fontWeight: '800', color: won ? brand.raise : '#ffffff' }}>{data.headline}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
            {[data.matchup?.them?.cards.length ? `vs ${data.matchup.them.cards.map(cardText).join(' ')}` : null, handle(data)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Mark />
      </View>
    </View>
  );
}

const SUIT_TEXT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const cardText = (c: Card) => `${c[0] === 'T' ? '10' : c[0]}${SUIT_TEXT[c[1]] ?? ''}`;

/** The FlipUp mark for a card's corner. */
function Mark({ color = '#ffffff' }: { color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name="suit.spade.fill" size={13} color={color} />
      <Text style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color }}>FlipUp</Text>
    </View>
  );
}

// ── Broadcast ───────────────────────────────────────────────────────────────

const MONO_BOLD: TextStyle = { fontFamily: MONO, fontWeight: '800' };

function Broadcast({ data }: { data: ShareData }) {
  const odds = data.odds;
  const last = odds?.[odds.length - 1];
  const street = data.board?.length ? (data.board.length >= 5 ? 'RIVER' : data.board.length === 4 ? 'TURN' : 'FLOP') : 'PREFLOP';
  const swing = new Set(data.swing ?? []);
  const you = data.matchup?.you ?? { name: data.who.name, emoji: data.who.emoji, cards: data.hole ?? [], won: data.tone === 'win' };
  const them = data.matchup?.them;
  const pot = data.stats?.find((s) => s.label === 'POT')?.value;
  const caps: TextStyle = { fontSize: 10, fontWeight: '800', letterSpacing: 1.6, color: 'rgba(255,255,255,0.6)' };
  return (
    <View style={{ flex: 1, ...gradient('radial-gradient(ellipse at 50% 38%, #1f4fc9 0%, #0a1d55 55%, #03081a 100%)') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30' }} />
          <Text style={{ ...caps, color: '#ffffff' }}>REPLAY</Text>
        </View>
        <Text numberOfLines={1} style={{ ...MONO_BOLD, fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>
          {(data.game ?? '').toUpperCase()}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 8, marginTop: 18 }}>
        <Text style={{ ...MONO_BOLD, fontSize: 11, letterSpacing: 4, color: GOLD }}>{street}</Text>
        {!!data.board?.length && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {data.board.map((c) => (
              <PlayingCard key={c} card={c} size="md" width={50} glow={swing.has(c)} />
            ))}
          </View>
        )}
        {pot && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={caps}>POT</Text>
            <Text style={{ ...MONO_BOLD, fontSize: 24, color: '#ffffff' }}>{pot}</Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 14, gap: 8, marginTop: 16 }}>
        <Plate side={you} odds={last?.you} />
        {them && <Plate side={them} odds={last?.them} />}
      </View>

      {odds && odds.length >= 2 ? (
        <View style={{ paddingHorizontal: 14, marginTop: 16, gap: 5 }}>
          <Text style={caps}>YOUR WIN CHANCE</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {odds.map((o, i) => {
              // Gold is good news: the last box only lights up for a win.
              const end = i === odds.length - 1 && data.tone === 'win';
              return (
                <View key={o.street} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 6, backgroundColor: end ? GOLD : 'rgba(255,255,255,0.09)' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1, color: end ? brand.goldInk : 'rgba(255,255,255,0.55)' }}>{STREET_SHORT[o.street]}</Text>
                  <Text style={{ ...MONO_BOLD, fontSize: 15, color: end ? brand.goldInk : '#ffffff' }}>{pct(o.you)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', height: 44 }}>
        <View style={{ backgroundColor: GOLD, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: ROUNDED, fontSize: 14, fontWeight: '800', color: brand.goldInk }}>FlipUp</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', paddingHorizontal: 12 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color: '#0b1430' }}>
            {data.moment?.headline ?? `${handle(data)} ${data.tone === 'win' ? 'wins' : 'plays'} ${data.headline}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** A name plate: cards, name and hand, and the win chance (or the result) on the right. */
function Plate({ side, odds }: { side: ShareSide; odds?: number }) {
  const right = odds !== undefined ? pct(odds) : side.won ? 'WIN' : '';
  return (
    <View style={{ flexDirection: 'row', height: 60, borderRadius: 6, overflow: 'hidden', opacity: side.won ? 1 : 0.82 }}>
      <View style={{ width: 5, backgroundColor: side.won ? GOLD : 'rgba(255,255,255,0.3)' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.96)' }}>
        {side.cards.length ? (
          side.cards.map((c) => <PlayingCard key={c} card={c} size="sm" width={28} />)
        ) : (
          <Text style={{ fontSize: 24 }}>{side.emoji}</Text>
        )}
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: '#0b1430', gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
          {side.name.toUpperCase()}
        </Text>
        {side.hand && (
          <Text numberOfLines={2} style={{ fontSize: 10, lineHeight: 12, fontWeight: '800', letterSpacing: 0.4, color: side.won ? GOLD : 'rgba(255,255,255,0.6)' }}>
            {side.hand.toUpperCase()}
          </Text>
        )}
      </View>
      {!!right && (
        <View style={{ width: 66, alignItems: 'center', justifyContent: 'center', backgroundColor: side.won ? GOLD : '#2a3550' }}>
          <Text style={{ ...MONO_BOLD, fontSize: 20, color: side.won ? brand.goldInk : 'rgba(255,255,255,0.75)' }}>{right}</Text>
        </View>
      )}
    </View>
  );
}

export function DesignSwatch({ colors }: { colors: readonly string[] }): ReactNode {
  return <View style={{ width: '100%', height: '100%', ...gradient(`linear-gradient(135deg, ${colors.join(', ')})`) }} />;
}
