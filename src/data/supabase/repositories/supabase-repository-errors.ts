import { RepositoryError } from '@/data/repositories/common/repository-errors'

type SupabaseErrorLike = {
  code?: string
  message?: string
}

export function isSupabaseUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as SupabaseErrorLike).code === '23505'
  )
}

export function throwSupabaseRepositoryError(
  operation: string,
  error: unknown,
): never {
  const detail =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as SupabaseErrorLike).message === 'string'
      ? ` ${(error as SupabaseErrorLike).message}`
      : ''

  throw new RepositoryError(`Supabase ${operation} failed.${detail}`)
}
