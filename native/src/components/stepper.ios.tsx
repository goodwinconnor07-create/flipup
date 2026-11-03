import { Host } from '@expo/ui';
import { Stepper as NativeStepper } from '@expo/ui/swift-ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';

import { brandTint } from './brand-tint';
import { haptic } from './haptics';
import type { StepperProps } from './stepper.types';

/** Apple's − / + stepper (SwiftUI). The row shows the value; the stepper only changes it. */
export function Stepper({ label, value, min, max, step = 1, onChange }: StepperProps) {
  return (
    <Host matchContents>
      <NativeStepper
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          haptic.select();
          onChange(next);
        }}
        modifiers={[labelsHidden(), ...brandTint]}
      />
    </Host>
  );
}
