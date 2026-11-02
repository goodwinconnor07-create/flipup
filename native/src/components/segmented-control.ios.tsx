import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { haptic } from './haptics';
import type { SegmentedControlProps } from './segmented-control.types';

/** Apple's segmented control (a SwiftUI Picker in segmented style). */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }}>
      <Picker
        label={label}
        selection={value}
        onSelectionChange={(next: T) => {
          haptic.select();
          onChange(next);
        }}
        modifiers={[pickerStyle('segmented')]}
      >
        {options.map((o) => (
          <Text key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
