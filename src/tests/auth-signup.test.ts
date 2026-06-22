import type { Session, User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import {
  createSignUpResult,
  emailConfirmationRequiredMessage,
  getAuthErrorMessage,
  getSupabaseEmailRedirectTo,
  validateAuthCredentials,
} from '@/lib/auth/auth-utils'

describe('auth signup helpers', () => {
  it('detects signup success that still requires email confirmation', () => {
    const result = createSignUpResult({
      session: null,
      user: { id: 'user-1', email: 'person@example.com' } as User,
    })

    expect(result).toMatchObject({
      confirmationRequired: true,
      message: emailConfirmationRequiredMessage,
      ok: true,
    })
  })

  it('detects signup success with an active session', () => {
    const result = createSignUpResult({
      session: { access_token: 'token' } as Session,
      user: { id: 'user-1', email: 'person@example.com' } as User,
    })

    expect(result).toMatchObject({
      confirmationRequired: false,
      message: 'Account created and signed in.',
      ok: true,
    })
  })

  it('returns safe auth error messages', () => {
    expect(getAuthErrorMessage(new Error('User already registered'))).toBe(
      'User already registered',
    )
    expect(getAuthErrorMessage('nope')).toBe('Authentication failed.')
  })

  it('uses the current origin for Supabase email redirects', () => {
    expect(getSupabaseEmailRedirectTo('https://budget.example.com')).toBe(
      'https://budget.example.com',
    )
  })

  it('validates signup credentials before calling Supabase', () => {
    expect(validateAuthCredentials('', 'secret1')).toBe('Email is required.')
    expect(validateAuthCredentials('person@example.com', '')).toBe(
      'Password is required.',
    )
    expect(validateAuthCredentials('person@example.com', '12345')).toBe(
      'Password must be at least 6 characters.',
    )
    expect(validateAuthCredentials('person@example.com', '123456')).toBeNull()
  })
})
