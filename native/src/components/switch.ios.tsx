import { Host, Switch as NativeSwitch } from '@expo/ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';

import { brandTint } from './brand-tint';
import { haptic } from './haptics';

/**
 * The system switch (SwiftUI's Toggle, with Liquid Glass on iOS 26). It ticks as it flips. The row shows the
 * title, so the switch's own label is hidden on screen but still read by VoiceOver.
 */
export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (on: boolean) => void; label: string }) {
  return (
    <Host matchContents>
      <NativeSwitch
        value={value}
        onValueChange={(on) => {
          haptic.select();
          onValueChange(on);
        }}
        label={label}
        modifiers={[labelsHidden(), ...brandTint]}
      />
    </Host>
  );
}
