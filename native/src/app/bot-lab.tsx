import { Redirect, router } from 'expo-router';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrainBackground } from '@/components/grain-background';
import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { NavRow } from '@/components/setup/setup-header';
import { RoundButton } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Face } from '@/components/bot-lab/face';
import { labPersona, MAX_LAB_BOTS } from '@/engine';
import { detail } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { useLabBots, type LabBot } from '@/state/bot-lab';
import { brand, ForceScheme, ROUNDED, spacing, useShadows } from '@/theme';

/**
 * Bot Lab (Settings > Bot Lab): the bots you made, two to a row on the same see-through panels as the lobby, with a
 * round + at the top right (greyed once you have `MAX_LAB_BOTS`). A tap opens the bot in the editor
 * (`bot-lab-edit`). They're seated from + Add Bot in any lobby you host. Always dark, on the moving blue field.
 */
export default function BotLabScreen() {
  const has = usePremium();
  return (
    // Bot Lab is Premium: without it the page is the offer, with Bot Lab first.
    !has ? (
      <Redirect href={{ pathname: '/premium', params: { reason: 'botlab' } }} />
    ) : (
      <ForceScheme scheme="dark">
        <BotLabPage />
      </ForceScheme>
    )
  );
}

function BotLabPage() {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const bots = useLabBots();
  const full = bots.length >= MAX_LAB_BOTS;
  const { width } = useWindowDimensions();
  const tile = Math.floor((Math.min(width, 700) - spacing.md * 2 - spacing.sm) / 2);
  const add = () => {
    if (full) {
      haptic.failure();
      return;
    }
    haptic.tap();
    router.push('/bot-lab-edit');
  };

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
      >
        <NavRow title="Bot Lab" right={<RoundButton icon="plus" label={full ? `Bot Lab is full, ${MAX_LAB_BOTS} bots` : 'Make a bot'} onPress={add} tint={full ? 'rgba(255,255,255,0.35)' : undefined} />} />

        <View style={{ gap: spacing.xxs }}>
          <ThemedText variant="largeTitle" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            Your bots
          </ThemedText>
          <ThemedText variant="callout" tone="secondaryLabel">
            Make a bot, set how it plays, then seat it from + Add Bot in any lobby. {bots.length} of {MAX_LAB_BOTS}.
          </ThemedText>
        </View>

        {bots.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {bots.map((b, i) => (
              <Animated.View key={b.id} entering={detail(i, reduce)}>
                <BotTile bot={b} width={tile} />
              </Animated.View>
            ))}
          </View>
        ) : (
          <Empty onMake={add} />
        )}
      </ScrollView>
    </GrainBackground>
  );
}

function BotTile({ bot, width }: { bot: LabBot; width: number }) {
  const panel = usePanel();
  const shadows = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${bot.name}, ${labPersona(bot.dials)}`}
      accessibilityHint="Opens the bot to change it"
      onPress={() => {
        haptic.select();
        router.push({ pathname: '/bot-lab-edit', params: { id: bot.id } });
      }}
      style={{ width, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', boxShadow: shadows.card }}
    >
      <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, padding: spacing.md, gap: spacing.sm, alignItems: 'center' }}>
        <Face emoji={bot.emoji} size={64} />
        <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
          <ThemedText variant="headline" numberOfLines={1}>
            {bot.name}
          </ThemedText>
          <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1}>
            {labPersona(bot.dials)}
          </ThemedText>
        </View>
      </View>
    </PressableScale>
  );
}

function Empty({ onMake }: { onMake: () => void }) {
  const panel = usePanel();
  return (
    <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, padding: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(91,139,255,0.16)' }}>
        <Icon name="flask.fill" size={32} color={brand.violetDark} />
      </View>
      <View style={{ alignItems: 'center', gap: spacing.xxs }}>
        <ThemedText variant="title3" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          No bots yet
        </ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel" style={{ textAlign: 'center' }}>
          Give it a name and a face, then turn the dials: how many hands it plays, how often it bluffs, how much it talks.
        </ThemedText>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Make a bot"
        onPress={onMake}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, minHeight: 48, borderRadius: 24, backgroundColor: brand.violet }}
      >
        <Icon name="plus" size={17} color="#ffffff" />
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
          Make a bot
        </Text>
      </PressableScale>
    </View>
  );
}
