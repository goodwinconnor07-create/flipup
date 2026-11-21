// Core Haptics patterns in Apple's AHAP format, played by modules/flipup-haptics.
// Times are in seconds; intensity and sharpness run 0 to 1.

/**
 * An all-in run-out: a heartbeat under a low rumble that swells for about 1.5s, then one firm hit.
 * The rumble is soft (low sharpness) so it reads as tension, not an alert.
 */
export const RUNOUT_AHAP = JSON.stringify({
  Version: 1,
  Pattern: [
    {
      Event: {
        Time: 0,
        EventType: 'HapticContinuous',
        EventDuration: 1.5,
        EventParameters: [
          { ParameterID: 'HapticIntensity', ParameterValue: 0.55 },
          { ParameterID: 'HapticSharpness', ParameterValue: 0.12 },
        ],
      },
    },
    {
      ParameterCurve: {
        ParameterID: 'HapticIntensityControl',
        Time: 0,
        ParameterCurveControlPoints: [
          { Time: 0, ParameterValue: 0.15 },
          { Time: 0.8, ParameterValue: 0.45 },
          { Time: 1.4, ParameterValue: 0.9 },
          { Time: 1.5, ParameterValue: 0 },
        ],
      },
    },
    // The heartbeat: two beats, then two quicker ones.
    ...[0.0, 0.14, 0.62, 0.74, 1.08, 1.18].map((t, i) => ({
      Event: {
        Time: t,
        EventType: 'HapticTransient',
        EventParameters: [
          { ParameterID: 'HapticIntensity', ParameterValue: i % 2 ? 0.45 : 0.7 },
          { ParameterID: 'HapticSharpness', ParameterValue: 0.3 },
        ],
      },
    })),
    {
      Event: {
        Time: 1.52,
        EventType: 'HapticTransient',
        EventParameters: [
          { ParameterID: 'HapticIntensity', ParameterValue: 1 },
          { ParameterID: 'HapticSharpness', ParameterValue: 0.6 },
        ],
      },
    },
  ],
});
