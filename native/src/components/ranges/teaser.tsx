import { Text, View } from 'react-native';

import { challengeLook } from '@design/challengeArt';
import { dailyToday, flameOf, scenarioById, useRangePlay } from '@/state/ranges';
import { brand, ROUNDED } from '@/theme';

import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { CardBack, PlayingCard } from '../table/playing-card';
import { SQUARE_COLOUR } from './share';

/**
 * Range training's picture, live: today's first hand (your two cards, and the board face down with a question
 * mark), on the card's own violet. Once today's three are played, the board turns into their three squares. The
 * flame sits in the corner while there's a streak. Home's card uses it small, the start sheet big.
 */
export function RangeTeaser({ width, height, rounded = 0 }: { width: number; height: number; rounded?: number }) {
  const play = useRangePlay();
  const today = dailyToday(play);
  const first = scenarioById(today.ids[0]);
  const flame = flameOf(play).days;
  const [a, b] = challengeLook('ranges').card;
  const cardW = Math.round(height * 0.36);
  const back = Math.round(height * 0.2);
  return (
    <LivingCard colors={[a, '#3a20b8', b]} radius={rounded} shadow={false} grain={0} outerStyle={{ width, height }} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View accessible accessibilityLabel={today.done ? 'Today’s three are done' : 'Today’s hand is waiting'} style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.1 }}>
        {first && (
          <View style={{ flexDirection: 'row' }}>
            <View style={{ transform: [{ rotate: '-9deg' }], marginRight: -cardW * 0.25 }}>
              <PlayingCard card={first.hero.cards[0]} size="md" width={cardW} />
            </View>
            <View style={{ transform: [{ rotate: '9deg' }, { translateY: 3 }] }}>
              <PlayingCard card={first.hero.cards[1]} size="md" width={cardW} />
            </View>
          </View>
        )}
        <View style={{ alignItems: 'center', gap: height * 0.05 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {today.done
              ? today.grades.map((g, i) => <View key={i} style={{ width: back, height: back, borderRadius: back * 0.25, backgroundColor: SQUARE_COLOUR[g], borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }} />)
              : [0, 1, 2].map((i) => (
                  <View key={i}>
                    <CardBack w={back} small />
                    {i === 1 && (
                      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <Text maxFontSizeMultiplier={1} style={{ fontFamily: ROUNDED, fontSize: back * 0.6, fontWeight: '800', color: brand.gold }}>
                          ?
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
          </View>
          <Text maxFontSizeMultiplier={1} style={{ fontSize: Math.max(9, height * 0.085), fontWeight: '800', letterSpacing: 1.1, color: 'rgba(255,255,255,0.85)' }}>
            {today.done ? 'DONE TODAY' : today.grades.length ? `${today.grades.length} OF 3 TODAY` : 'TODAY’S HAND'}
          </Text>
        </View>
      </View>
      {flame > 0 && (
        <View style={{ position: 'absolute', top: height * 0.08, right: height * 0.08, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, height: Math.max(20, height * 0.17), borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Icon name="flame.fill" size={Math.max(11, height * 0.1)} color={brand.gold} />
          <Text maxFontSizeMultiplier={1} style={{ fontSize: Math.max(11, height * 0.1), fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
            {flame}
          </Text>
        </View>
      )}
    </LivingCard>
  );
}
