// Feature flags. Slå av/på via env-vars eller hardkodet under utvikling.
// Jf. CLAUDE.md fase 3.7.

export const FEATURES = {
  AUDIO_FIRST: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (key: FeatureKey): boolean => FEATURES[key];
