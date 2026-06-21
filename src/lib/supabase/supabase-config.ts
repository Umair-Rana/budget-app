const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export type SupabaseConfig = {
  url: string
  anonKey: string
}

export type SupabaseConfigStatus = {
  configured: boolean
  missingKeys: Array<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'>
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export function getSupabaseConfig(): SupabaseConfig | null {
  if (!hasSupabaseConfig) {
    return null
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missingKeys: SupabaseConfigStatus['missingKeys'] = []

  if (!supabaseUrl) {
    missingKeys.push('VITE_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    missingKeys.push('VITE_SUPABASE_ANON_KEY')
  }

  return {
    configured: missingKeys.length === 0,
    missingKeys,
  }
}
