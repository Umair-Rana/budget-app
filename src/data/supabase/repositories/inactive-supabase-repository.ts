export const inactiveSupabaseFinanceRepositoryMessage =
  'Supabase finance repositories are not active yet.'

export function throwInactiveSupabaseFinanceRepository(): never {
  throw new Error(inactiveSupabaseFinanceRepositoryMessage)
}
