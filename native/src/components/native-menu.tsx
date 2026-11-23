import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { spacing } from '@/theme';

import { Icon, type IconName } from './icon';
import { MenuRow, MenuSection, useMenuColors } from './menu-list';
import { SegmentedControl } from './segmented-control';
import { Stepper } from './stepper';
import { Switch } from './switch';
import { ThemedText } from './themed-text';
import type { MenuItem, NativeMenuProps } from './native-menu.types';

/** The web build's settings list (no SwiftUI there): the same data as `native-menu.ios.tsx`, in React Native. */
export function NativeMenu({ groups, top, transparent }: NativeMenuProps) {
  const menu = useMenuColors();
  return (
    <View style={{ flex: 1, backgroundColor: transparent ? 'transparent' : menu.page }}>
      {top}
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        {groups.map((g) => (
          <MenuSection key={g.id} header={g.header} footer={g.footer}>
            {g.items.filter((i): i is MenuItem => !!i).map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </MenuSection>
        ))}
      </ScrollView>
    </View>
  );
}

function Item({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false);
  switch (item.kind) {
    case 'link':
      return <MenuRow icon={item.symbol as IconName | undefined} title={item.title} subtitle={item.subtitle} detail={item.detail} chevron={item.chevron !== false} trailing={item.trailingCrown ? <Icon name="crown.fill" size={15} color="#d9a441" /> : undefined} onPress={item.onPress} />;
    case 'button':
      return <MenuRow icon={item.symbol as IconName | undefined} title={item.busy ? `${item.title}…` : item.title} destructive={item.destructive} chevron={false} onPress={item.busy ? undefined : item.onPress} />;
    case 'toggle':
      return <MenuRow icon={item.symbol as IconName | undefined} title={item.title} subtitle={item.subtitle} accessory={<Switch label={item.title} value={item.value} onValueChange={item.onChange} />} />;
    case 'segmented':
      return (
        <MenuRow
          icon={item.symbol as IconName | undefined}
          title={item.title}
          subtitle={item.note}
          accessory={
            <View style={{ width: item.options.length > 2 ? 190 : 150 }}>
              <SegmentedControl label={item.title} value={item.value} options={item.options} onChange={item.onChange} />
            </View>
          }
        />
      );
    case 'picker':
      return (
        <MenuRow
          icon={item.symbol as IconName | undefined}
          title={item.title}
          accessory={
            <View style={{ width: 190 }}>
              <SegmentedControl label={item.title} value={item.value} options={item.options} onChange={item.onChange} />
            </View>
          }
        />
      );
    case 'stepper':
      return <MenuRow icon={item.symbol as IconName | undefined} title={item.title} detail={item.detail} accessory={<Stepper label={item.title} value={item.value} min={item.min} max={item.max} onChange={item.onChange} />} />;
    case 'value':
      return <MenuRow icon={item.symbol as IconName | undefined} title={item.title} detail={item.detail} />;
    case 'info':
      return <MenuRow title={item.title} subtitle={item.text} leading={<Icon name={item.symbol as never} size={22} color="#6f9bff" />} />;
    case 'faq':
      return (
        <View>
          <MenuRow title={item.title} chevron onPress={() => setOpen(!open)} />
          {open && (
            <ThemedText variant="subhead" tone="secondaryLabel" style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
              {item.text}
            </ThemedText>
          )}
        </View>
      );
  }
}
