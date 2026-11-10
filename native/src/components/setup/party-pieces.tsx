import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PARTY_BLIND_HANDS, PARTY_FILL, PARTY_STACKS, variantInfo, type Variant } from '@/engine';
import { clearPartyDraft } from '@/state/party-draft';
import { brand, ROUNDED, spacing } from '@/theme';

import { GameThumb } from '../game-picture';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { TextButton } from '../lobby/code-card';
import { Card, NumberRow, SwitchRow } from '../lobby/house-rules';
import { PressableScale } from '../pressable-scale';
import { Stepper } from '../stepper';
import { ThemedText } from '../themed-text';

const chips = (n: number) => n.toLocaleString('en-US');

/** Under the game card: the way into a party, for a night of more than one game. */
export function StartPartyButton() {
  const panel = usePanel();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Want to play more than one game? Start a party"
      accessibilityHint="Opens the party playlist"
      onPress={() => {
        haptic.tap();
        router.push('/party-playlist');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', borderWidth: 1, borderColor: panel.edge, backgroundColor: panel.fill }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
        <Icon name="party.popper.fill" size={20} color="#ffffff" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.75)' }}>
          Want to play more than one game?
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 20, lineHeight: 24, fontWeight: '800', color: '#ffffff' }}>
          Start a party
        </Text>
      </View>
      <Icon name="chevron.right" size={15} color="rgba(255,255,255,0.6)" />
    </PressableScale>
  );
}

/** "Hold'em, Ghost and 4 more": the first games of a playlist in a line. */
function gamesLine(games: readonly Variant[]): string {
  const names = games.slice(0, 2).map((g) => variantInfo(g).name);
  const more = games.length - names.length;
  return more > 0 ? `${names.join(', ')} and ${more} more` : names.join(', ');
}

/**
 * Where the game card is once the lobby is a party's: the same card (the first game's picture, a small PARTY over
 * the title, a line of what's on the list), with Edit for the host and, under it, a way back to one game. Nothing
 * else about the lobby changes.
 */
export function PartyCard({ games, host }: { games: readonly Variant[]; host: boolean }) {
  const panel = usePanel();
  const edit = () => {
    haptic.tap();
    router.push('/party-playlist');
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole={host ? 'button' : undefined}
        accessibilityLabel={`Party, ${games.length} games. ${gamesLine(games)}`}
        accessibilityHint={host ? 'Edit the playlist' : undefined}
        disabled={!host}
        onPress={edit}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: PANEL_RADIUS,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: panel.edge,
          backgroundColor: pressed ? panel.pressed : panel.fill,
        })}
      >
        {games[0] && <GameThumb variant={games[0]} size={52} />}
        <View style={{ flex: 1, gap: 1 }}>
          <ThemedText variant="caption2" tone="secondaryLabel" style={{ fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Party
          </ThemedText>
          <ThemedText variant="title3" numberOfLines={1} style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            {games.length}-game party
          </ThemedText>
          <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={2}>
            {gamesLine(games)}
          </ThemedText>
        </View>
        {host && <TextButton title="Edit" onPress={edit} label="Edit the playlist" />}
      </Pressable>
      {host && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play one game instead"
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            clearPartyDraft();
          }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: spacing.xxs, opacity: pressed ? 0.5 : 1 })}
        >
          <ThemedText variant="callout" style={{ fontWeight: '600', color: brand.violetDark }}>
            Play one game instead
          </ThemedText>
          <Icon name="chevron.right" size={13} color={brand.violetDark} weight="semibold" />
        </Pressable>
      )}
    </View>
  );
}

export interface PartyRulesValue {
  stack: number;
  blindHands: number;
  fill: number;
}

/**
 * A party's house rules, laid out exactly like the table's (`HouseRules`): each number over its value with the
 * − + stepper, then the switches. Rebuys are locked off (a party's rounds have none), and every game gets 20
 * seconds to act. Without `onChange` (a friend who joined) the rows only show the values.
 */
export function PartyRules({ rules, onChange }: { rules: PartyRulesValue; onChange?: (patch: Partial<PartyRulesValue>) => void }) {
  const pick = (label: string, value: number, options: number[], format: (n: number) => string, key: keyof PartyRulesValue) => {
    const at = Math.max(0, options.indexOf(value));
    return (
      <NumberRow key={key} label={label} value={format(options[at])}>
        {onChange && <Stepper label={label} value={at} min={0} max={options.length - 1} onChange={(i) => onChange({ [key]: options[i] })} />}
      </NumberRow>
    );
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
        House rules
      </ThemedText>
      <Card>
        {[
          pick('Chips each game', rules.stack, PARTY_STACKS, chips, 'stack'),
          pick('Hands per blind level', rules.blindHands, PARTY_BLIND_HANDS, String, 'blindHands'),
          pick('Bots fill to', rules.fill, PARTY_FILL, (n) => (n === 0 ? 'No bots' : `${n} seats`), 'fill'),
          <NumberRow key="clock" label="Time to act" value="20 sec" />,
        ]}
      </Card>
      <Card>{[<SwitchRow key="rebuys" label="Rebuys" line="Off in a party. Bust out and you're out for that game." value={false} />]}</Card>
    </View>
  );
}
