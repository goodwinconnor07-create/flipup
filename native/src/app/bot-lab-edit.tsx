import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dial } from '@/components/bot-lab/dial';
import { Face } from '@/components/bot-lab/face';
import { GrainBackground } from '@/components/grain-background';
import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import { OPEN_BUTTON_ROOM, OpenTableButton } from '@/components/setup/open-table-button';
import { NavRow } from '@/components/setup/setup-header';
import { Swap } from '@/components/swap';
import { ThemedText } from '@/components/themed-text';
import { DIAL_IDS, isNameBlocked, LAB_DIALS, LAB_FACES, LAB_NAME_MAX, labName, labPersona, MAX_LAB_BOTS, type LabDials, type LabTone } from '@/engine';
import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { deleteLabBot, labBot, labBots, newLabBot, restoreLabBot, saveLabBot, type LabBot } from '@/state/bot-lab';
import { offerUndo } from '@/state/undo';
import { brand, ForceScheme, ROUNDED, spacing } from '@/theme';

const TONES: { value: LabTone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'trash', label: 'Trash talk' },
];

/**
 * Making or changing a Bot Lab bot (`?id=` for one you have): its face (a tap opens the faces under it), its name
 * typed straight into the big title, then the eight dials two to a row on one panel, and how it talks. Save is
 * pinned at the bottom; a bot you have also has Delete, which can be undone. Always dark, like the lobby.
 */
export default function BotLabEditScreen() {
  return (
    <ForceScheme scheme="dark">
      <Editor />
    </ForceScheme>
  );
}

function Editor() {
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const panel = usePanel();
  const [bot, setBot] = useState<LabBot>(() => labBot(params.id) ?? newLabBot());
  const editing = !!labBot(params.id);
  const [faces, setFaces] = useState(false);
  // A dial being turned holds the page still, so dragging it up doesn't scroll.
  const [turning, setTurning] = useState(false);
  const name = labName(bot.name);

  const dial = (patch: Partial<LabDials>) => setBot((b) => ({ ...b, dials: { ...b.dials, ...patch } }));
  const shuffle = () => {
    haptic.tap();
    const next = Object.fromEntries(DIAL_IDS.map((id) => [id, Math.floor(Math.random() * 11)])) as Record<string, number>;
    dial(next as Partial<LabDials>);
  };
  const save = () => {
    if (!name) return;
    if (isNameBlocked(name)) {
      haptic.failure();
      Alert.alert('Pick a different name', 'That name isn’t allowed at FlipUp tables.');
      return;
    }
    if (!saveLabBot({ ...bot, name })) {
      haptic.failure();
      Alert.alert('Bot Lab is full', `You can keep ${MAX_LAB_BOTS} bots. Delete one to make room.`);
      return;
    }
    haptic.success();
    router.back();
  };
  const remove = () => {
    const at = labBots().findIndex((b) => b.id === bot.id);
    const gone = labBot(bot.id);
    deleteLabBot(bot.id);
    haptic.turn();
    if (gone) offerUndo(`${gone.name} deleted`, () => restoreLabBot(gone, at));
    router.back();
  };

  return (
    <GrainBackground>
      <ScrollView
        scrollEnabled={!turning}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: OPEN_BUTTON_ROOM + insets.bottom, gap: spacing.lg }}
      >
        <NavRow title={editing ? 'Edit bot' : 'New bot'} />

        {/* The face and the name, the bot as it'll sit at the table. */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Face, ${bot.emoji}`}
            accessibilityHint="Shows the faces to pick from"
            onPress={() => {
              haptic.select();
              setFaces((f) => !f);
            }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Face emoji={bot.emoji} size={104} />
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet, borderWidth: 3, borderColor: '#0b1636' }}>
              <Icon name="pencil" size={15} color="#ffffff" />
            </View>
          </Pressable>
          <TextInput
            value={bot.name}
            onChangeText={(t) => setBot((b) => ({ ...b, name: t.slice(0, LAB_NAME_MAX) }))}
            placeholder="Name it"
            placeholderTextColor="rgba(255,255,255,0.35)"
            maxLength={LAB_NAME_MAX}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Bot name"
            maxFontSizeMultiplier={1.3}
            style={{ alignSelf: 'stretch', textAlign: 'center', fontFamily: ROUNDED, fontSize: 34, fontWeight: '800', color: '#ffffff', paddingVertical: 4 }}
          />
          <Swap id={labPersona(bot.dials)} kind="text">
            <ThemedText variant="subhead" tone="secondaryLabel">
              {labPersona(bot.dials)}
            </ThemedText>
          </Swap>
        </View>

        {faces && (
          <Animated.View entering={enter(reduce)} exiting={exit(reduce)} style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, padding: spacing.sm }}>
            <View accessibilityRole="radiogroup" accessibilityLabel="Faces" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs }}>
              {LAB_FACES.map((f) => {
                const on = bot.emoji === f;
                return (
                  <View key={f} style={{ width: '12.5%', alignItems: 'center' }}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={f}
                      onPress={() => {
                        haptic.select();
                        setBot((b) => ({ ...b, emoji: f }));
                      }}
                      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(91,139,255,0.3)' : pressed ? 'rgba(255,255,255,0.1)' : 'transparent', borderWidth: 2, borderColor: on ? brand.violetDark : 'transparent' })}
                    >
                      <Text maxFontSizeMultiplier={1} style={{ fontSize: 24 }}>
                        {f}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
              How it plays
            </ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Shuffle the dials" hitSlop={10} onPress={shuffle} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.4 : 1 })}>
              <Icon name="shuffle" size={15} color={brand.violetDark} />
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '600', color: brand.violetDark }}>
                Shuffle
              </Text>
            </Pressable>
          </View>
          <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, paddingVertical: spacing.md, paddingHorizontal: spacing.xs }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg }}>
              {LAB_DIALS.map((d) => (
                <View key={d.id} style={{ width: '50%', alignItems: 'center' }}>
                  <Dial dial={d} value={bot.dials[d.id]} onChange={(v) => dial({ [d.id]: v })} onDrag={setTurning} />
                </View>
              ))}
            </View>
          </View>
          <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
            Drag a dial up or right to turn it up, down or left to turn it down.
          </ThemedText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            Table talk
          </ThemedText>
          <SegmentedControl label="Table talk" options={TONES} value={bot.dials.tone} onChange={(tone) => dial({ tone })} />
          <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
            How much it says is the Chat dial. Bots only ever use FlipUp’s own lines.
          </ThemedText>
        </View>

        {editing && (
          <View style={{ alignItems: 'center' }}>
            <Pressable accessibilityRole="button" onPress={remove} hitSlop={10} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, opacity: pressed ? 0.4 : 1 })}>
              <Icon name="trash.fill" size={15} color="#ff453a" />
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '600', color: '#ff453a' }}>
                Delete bot
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <OpenTableButton title={editing ? 'Save changes' : 'Save bot'} line={name ? undefined : 'Give it a name first'} disabled={!name} onPress={save} />
    </GrainBackground>
  );
}
