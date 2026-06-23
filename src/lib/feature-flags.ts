export const featureFlags = {
  offlineMode: false,
} as const

export type FeatureFlags = typeof featureFlags
export type OfflineMode = FeatureFlags['offlineMode']
