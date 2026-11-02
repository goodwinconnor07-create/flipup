export type StepperProps = {
  /** Read by VoiceOver, e.g. "Bots". */
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};
