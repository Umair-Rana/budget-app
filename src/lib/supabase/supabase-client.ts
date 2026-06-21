import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import { getSupabaseConfig } from '@/lib/supabase/supabase-config'

let supabaseClient: SupabaseClient<Database> | null | undefined

export function getSupabaseClient(): SupabaseClient<Database> | null {
  const config = getSupabaseConfig()

  if (!config) {
    return null
  }

  supabaseClient ??= createClient<Database>(config.url, config.anonKey)

  return supabaseClient
}
