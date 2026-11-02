import { Host, Switch as NativeSwitch } from '@expo/ui';
import { View } from 'react-native';

import { haptic } from './haptics';

/** The switch on the web build. The row shows the title; the label here is for screen readers. */
export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (on: boolean) => void; label: string }) {
  return (
    <View accessible accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }}>
      <Host matchContents>
        <NativeSwitch
          value={value}
          onValueChange={(on) => {
            haptic.select();
            onValueChange(on);
          }}
        />
      </Host>
    </View>
  );
}
