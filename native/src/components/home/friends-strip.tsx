import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { useMyUsername, usePals, type Pal } from '@/state/pals';
import { spacing, useColors } from '@/theme';

import { Avatar } from '../avatar';
import { useFriendActions } from '../friend-menu';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { Menu } from '../menu';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { SectionTitle } from './section-title';

const FACE = 64;

/**
 * Your friends as a row of faces, Add first. A tap on a face opens Apple's menu: invite them to a game, their
 * profile, remove. With no friends yet, Add and a line on what friends are for.
 */
export function FriendsStrip() {
  const pals = usePals();
  const { username } = useMyUsername();
  const actions = useFriendActions();
  const add = () => router.push(username ? '/add-friend' : '/username');
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionTitle title="Friends" onMore={pals.length ? () => router.navigate('/friends') : undefined} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md, marginTop: -8, marginBottom: -28 }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 28, gap: spacing.md, alignItems: 'flex-start' }}>
        <AddFace onPress={add} />
        {pals.length === 0 ? (
          <View style={{ justifyContent: 'center', height: FACE, maxWidth: 240 }}>
            <ThemedText variant="headline">Add your friends</ThemedText>
            <ThemedText variant="subhead" tone="tertiaryLabel">
              Then invite them to a table in a tap.
            </ThemedText>
          </View>
        ) : (
          pals.map((pal) => (
            <Menu key={pal.code} label={`${pal.name}. Invite, profile`} title={pal.username ? `${pal.name} · @${pal.username}` : pal.name} sections={actions.sections(pal)}>
              <Face pal={pal} />
            </Menu>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Face({ pal }: { pal: Pal }) {
  const colors = useColors();
  return (
    <View style={{ width: FACE + 8, alignItems: 'center', gap: 6 }}>
      <Avatar emoji={pal.emoji} size={FACE} />
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.label }}>
        {pal.name}
      </Text>
    </View>
  );
}

function AddFace({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Add a friend"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      haptics={false}
      style={{ width: FACE + 8, alignItems: 'center', gap: 6 }}
    >
      <View style={{ width: FACE, height: FACE, borderRadius: FACE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cell, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.tertiaryLabel }}>
        <Icon name="plus" size={26} color={colors.accent} />
      </View>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>
        Add
      </Text>
    </PressableScale>
  );
}
