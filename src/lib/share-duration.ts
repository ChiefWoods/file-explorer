export const SHARE_DURATION_PRESETS = ["1d", "7d", "30d", "never"] as const;
export type ShareDurationPreset = (typeof SHARE_DURATION_PRESETS)[number];
