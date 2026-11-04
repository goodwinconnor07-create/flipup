import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Kicker, NightSheet, panel, SheetHeading } from '@/components/ranges/night-sheet';
import { FAMILY, trickOf, wordOf, WORDS } from '@/components/ranges/words';
import { brand, radius, ROUNDED, spacing } from '@/theme';

/**
 * Poker words, in plain words. Opened from a linked word (`term`), the price, or a hand's trick pill (`concept`):
 * that one comes first, big, and every other word follows.
 */
export default function RangeGlossarySheet() {
  const { term, concept } = useLocalSearchParams<{ term?: string; concept?: string }>();
  const word = term ? wordOf(term) : undefined;
  const trick = concept ? trickOf(concept) : null;
  return (
    <NightSheet>
      {trick && concept ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,183,0,0.16)' }}>
            <Icon name={trick.icon} size={28} color={brand.gold} />
          </View>
          <SheetHeading kicker={`${FAMILY[trick.family].name} · ${concept}`} title={trick.nick} line={trick.line} />
        </View>
      ) : word ? (
        <SheetHeading kicker="Poker words" title={word.word} line={word.says} />
      ) : (
        <SheetHeading kicker="Range training" title="Poker words" line="Every word the hands use, in plain English." />
      )}

      <View style={{ gap: spacing.sm }}>
        <Kicker>{trick || word ? 'More words' : 'The words'}</Kicker>
        <View style={panel}>
          {WORDS.filter((w) => w.key !== word?.key).map((w, i) => (
            <View key={w.key} style={{ gap: 2, paddingTop: i ? spacing.sm : 0, borderTopWidth: i ? 0.5 : 0, borderTopColor: 'rgba(255,255,255,0.12)' }}>
              <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
                {w.word}
              </Text>
              <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.72)' }}>
                {w.says}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </NightSheet>
  );
}
