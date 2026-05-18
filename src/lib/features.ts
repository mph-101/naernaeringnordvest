const envBool = (key: string, fallback: boolean): boolean => {
  const val = typeof import.meta !== "undefined"
    ? (import.meta as any).env?.[key]
    : process.env[key];
  if (val === undefined || val === null) return fallback;
  return val === "true" || val === "1";
};

export const FEATURES = {
  AUDIO_FIRST: envBool("VITE_FEATURE_AUDIO_FIRST", true),
  IDRETT: envBool("VITE_FEATURE_IDRETT", false),
  HJERNEVELV: envBool("VITE_FEATURE_HJERNEVELV", false),
  MASCOT: envBool("VITE_FEATURE_MASCOT", false),
  GAMES: envBool("VITE_FEATURE_GAMES", false),
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (key: FeatureKey): boolean => FEATURES[key];
