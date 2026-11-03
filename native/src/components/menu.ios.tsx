import { Host } from '@expo/ui';
import { Button, Menu as NativeMenu, RNHostView, Section } from '@expo/ui/swift-ui';
import { View } from 'react-native';

import { haptic } from './haptics';
import type { MenuProps } from './menu.types';

/**
 * Apple's pull-down menu (SwiftUI's Menu): a tap on the trigger opens it from where it sits, with SF Symbols, groups
 * and red destructive items, the way Flighty's avatar opens Profile, Friends and Settings. The trigger is drawn by
 * React Native inside the menu's label.
 */
export function Menu({ sections, title, children, label, fill }: MenuProps) {
  const groups = sections.filter((s) => s.length > 0);
  return (
    <Host matchContents={fill ? { vertical: true } : true} style={fill ? { alignSelf: 'stretch' } : undefined}>
      <NativeMenu
        label={
          <RNHostView matchContents={fill ? { vertical: true } : true}>
            <View accessible accessibilityRole="button" accessibilityLabel={label} style={fill ? { alignSelf: 'stretch' } : undefined}>
              {children}
            </View>
          </RNHostView>
        }
      >
        {groups.map((items, i) => (
          <Section key={i} title={i === 0 ? title : undefined}>
            {items.map((item) => (
              <Button
                key={item.title}
                label={item.title}
                systemImage={item.symbol}
                role={item.destructive ? 'destructive' : 'default'}
                onPress={() => {
                  haptic.tap();
                  item.onPress();
                }}
              />
            ))}
          </Section>
        ))}
      </NativeMenu>
    </Host>
  );
}
