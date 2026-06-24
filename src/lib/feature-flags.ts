export const featureFlags = {
  localSqliteReadMode:
    import.meta.env.DEV &&
    import.meta.env.VITE_LOCAL_SQLITE_READ_MODE === 'true',
  offlineMode: false,
} as const

export type FeatureFlags = typeof featureFlags
export type LocalSqliteReadMode = FeatureFlags['localSqliteReadMode']
export type OfflineMode = FeatureFlags['offlineMode']
