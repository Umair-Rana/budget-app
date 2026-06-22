import type { Session, User } from '@supabase/supabase-js'

export const minimumAuthPasswordLength = 6

export const emailConfirmationRequiredMessage =
  'Account created. Please check your email to confirm your account, then sign in.'

export type AuthSignUpResult =
  | {
      ok: true
      confirmationRequired: boolean
      message: string
      session: Session | null
      user: User | null
    }
  | {
      ok: false
      message: string
    }

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Authentication failed.'
}

export function getSupabaseEmailRedirectTo(origin?: string) {
  const redirectOrigin =
    origin ??
    (typeof window === 'undefined' ? undefined : window.location.origin)

  return redirectOrigin
}

export function validateAuthCredentials(email: string, password: string) {
  if (!email.trim()) {
    return 'Email is required.'
  }

  if (!password) {
    return 'Password is required.'
  }

  if (password.length < minimumAuthPasswordLength) {
    return `Password must be at least ${minimumAuthPasswordLength} characters.`
  }

  return null
}

export function createSignUpResult(data: {
  session: Session | null
  user: User | null
}): AuthSignUpResult {
  const confirmationRequired = Boolean(data.user && !data.session)

  return {
    ok: true,
    confirmationRequired,
    message: confirmationRequired
      ? emailConfirmationRequiredMessage
      : 'Account created and signed in.',
    session: data.session,
    user: data.user,
  }
}
