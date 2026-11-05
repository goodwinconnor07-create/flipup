import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { PARTY_BLIND_HANDS, PARTY_FILL, PARTY_STACKS, variantInfo } from '@/engine';
import { clearPartyDraft, setPartyRules, type PartyDraft } from '@/state/party-draft';
import { brand, radius, ROUNDED, spacing, useColors } from '@/theme';

import { GameThumb } from '../game-picture';
import { Row, Section } from '../grouped-list';
import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { Stepper } from '../stepper';
import { SetupRowTitle } from './setup-header';

const chips = (n: number) => n.toLocaleString('en-US');

/** Under the game row: the way into a party, for a night of more than one game. */
export function StartPartyButton() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Want to play more than one game? Start a party"
      accessibilityHint="Opens the party playlist"
      onPress={() => {
        haptic.tap();
        router.push('/party-playlist');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1.5, borderColor: 'rgba(139,109,255,0.55)', backgroundColor: 'rgba(110,75,255,0.14)' }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
        <Icon name="party.popper.fill" size={20} color="#ffffff" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.75)' }}>
          Want to play more than one game?
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 19, lineHeight: 24, fontWeight: '800', color: '#ffffff' }}>
          Start a party
        </Text>
      </View>
      <Icon name="chevron.right" size={15} color="rgba(255,255,255,0.6)" />
    </PressableScale>
  );
}

/** In place of the game row once a party's playlist is saved: the games in order, Edit, and back to one game. */
export function PartyPlaylistCard({ draft }: { draft: PartyDraft }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <SetupRowTitle title="Party" detail={`${draft.games.length} games`} />
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, paddingVertical: spacing.sm, gap: spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.sm, gap: spacing.sm }}>
          {draft.games.map((g, i) => (
            <View key={`${i}-${g}`} style={{ width: 64, alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`Game ${i + 1}: ${variantInfo(g).name}`}>
              <GameThumb variant={g} size={56} />
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: colors.secondaryLabel }}>
                {i + 1}. {variantInfo(g).name}
              </Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm }}>
          <SmallButton icon="pencil" title="Edit playlist" onPress={() => router.push('/party-playlist')} />
          <SmallButton icon="xmark" title="One game" onPress={clearPartyDraft} />
        </View>
      </View>
    </View>
  );
}

function SmallButton({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      outerStyle={{ flex: 1 }}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' }}
    >
      <Icon name={icon} size={14} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
        {title}
      </Text>
    </PressableScale>
  );
}

/** The party's house rules, in place of the table's: chips per game, hands per blind level, and how far bots fill. */
export function PartyRules({ draft, tint }: { draft: PartyDraft; tint: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <SetupRowTitle title="House rules" />
      <Section footer={`Everyone starts each game with ${chips(draft.stack)} chips, and the blinds double every ${draft.blindHands} hands. No rebuys, and 20 seconds to act. Friends join with the party code once it's open.`}>
        <Pick label="Chips" symbol="dollarsign.circle.fill" color={tint} value={draft.stack} options={PARTY_STACKS} onChange={(stack) => setPartyRules({ stack })} format={chips} />
        <Pick label="Hands per level" symbol="chart.line.uptrend.xyaxis" color={tint} value={draft.blindHands} options={PARTY_BLIND_HANDS} onChange={(blindHands) => setPartyRules({ blindHands })} format={String} />
        <Pick label="Bots fill to" symbol="cpu.fill" color={tint} value={draft.fill} options={PARTY_FILL} onChange={(fill) => setPartyRules({ fill })} format={(n) => (n === 0 ? 'None' : `${n} seats`)} />
      </Section>
    </View>
  );
}

/** A row with a stepper that walks through a fixed list of choices. */
function Pick({ label, symbol, color, value, options, onChange, format }: { label: string; symbol: IconName; color: string; value: number; options: number[]; onChange: (n: number) => void; format: (n: number) => string }) {
  const at = Math.max(0, options.indexOf(value));
  return <Row title={label} detail={format(options[at])} icon={{ symbol, color }} chevron={false} accessory={<Stepper label={label} value={at} min={0} max={options.length - 1} onChange={(i) => onChange(options[i])} />} />;
}
