type FeatureFlagEnv = {
  VITE_LOCAL_SQLITE_READ_MODE?: unknown
}

function isEnabled(value: unknown) {
  return value === true || value === 'true'
}

export function createFeatureFlags(env: FeatureFlagEnv) {
  return {
    localSqliteReadMode: isEnabled(env.VITE_LOCAL_SQLITE_READ_MODE),
    offlineMode: false,
  } as const
}

export const featureFlags = createFeatureFlags(import.meta.env as FeatureFlagEnv)

export type FeatureFlags = typeof featureFlags
export type LocalSqliteReadMode = FeatureFlags['localSqliteReadMode']
export type OfflineMode = FeatureFlags['offlineMode']
