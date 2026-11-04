import { Pressable, ScrollView, View } from 'react-native';

import { type Pal } from '@/state/pals';
import { spacing, useColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { ThemedText } from '../themed-text';
import { SetupRowTitle } from './setup-header';

/**
 * SLOT 1 of Play with friends: the Invite friends row, first on the page.
 *
 * Stage 6b rebuilds this row (big faces, an invite sent on tap with ripple rings and an "Invited…" pill, then
 * "Joined"). Until then it's the old picker so nothing is lost: friends to tick, each ticked one invited the
 * moment the table opens (`FriendsSetup.open()` sends them). The page owns `picked`; keep these props.
 */
export function InviteFriendsRow({ pals, picked, onToggle }: { pals: Pal[]; picked: string[]; onToggle: (code: string) => void }) {
  const colors = useColors();
  if (!pals.length) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <SetupRowTitle title="Invite friends" detail={picked.length ? `${picked.length} invited` : undefined} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.md }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs }}
      >
        {pals.map((p) => {
          const on = picked.includes(p.code);
          return (
            <Pressable
              key={p.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Invite ${p.name}`}
              onPress={() => {
                haptic.tap();
                onToggle(p.code);
              }}
              style={({ pressed }) => ({ width: 72, alignItems: 'center', gap: spacing.xxs, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ borderRadius: 32, padding: 3, borderWidth: 3, borderColor: on ? colors.accent : 'transparent' }}>
                <Avatar emoji={p.emoji} size={52} />
                {on && (
                  <View
                    style={{
                      position: 'absolute',
                      right: -4,
                      bottom: -4,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.accent,
                    }}
                  >
                    <Icon name="checkmark" size={12} color={colors.onColor} />
                  </View>
                )}
              </View>
              <ThemedText variant="footnote" numberOfLines={1} style={{ fontWeight: on ? '700' : '400' }}>
                {p.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
