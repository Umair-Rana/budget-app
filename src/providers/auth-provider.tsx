import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase/supabase-client'
import { getSupabaseConfigStatus } from '@/lib/supabase/supabase-config'
import {
  createSignUpResult,
  getAuthErrorMessage,
  getSupabaseEmailRedirectTo,
  type AuthSignUpResult,
} from '@/lib/auth/auth-utils'
import { AuthContext, type AuthContextValue } from '@/providers/auth-context'

const unavailableMessage =
  'Cloud sync is not configured yet. Add Supabase environment variables to enable login.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), [])
  const configured = configStatus.configured
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    const authClient = supabase
    let cancelled = false

    async function loadInitialSession() {
      setLoading(true)

      try {
        const { data, error: sessionError } =
          await authClient.auth.getSession()

        if (cancelled) {
          return
        }

        if (sessionError) {
          setError(sessionError.message)
        }

        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (nextError) {
        if (!cancelled) {
          setError(getAuthErrorMessage(nextError))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setError(null)
      setLoading(false)
    })

    void loadInitialSession()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const clearAuthError = useCallback(() => {
    setError(null)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthSignUpResult> => {
      if (!supabase) {
        setError(unavailableMessage)

        return {
          ok: false,
          message: unavailableMessage,
        }
      }

      setLoading(true)
      setError(null)

      try {
        const emailRedirectTo = getSupabaseEmailRedirectTo()
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        })

        if (signUpError) {
          setError(signUpError.message)

          return {
            ok: false,
            message: signUpError.message,
          }
        }

        setSession(data.session)
        setUser(data.session?.user ?? null)

        return createSignUpResult({
          session: data.session,
          user: data.user,
        })
      } catch (nextError) {
        const message = getAuthErrorMessage(nextError)

        setError(message)

        return {
          ok: false,
          message,
        }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        setError(unavailableMessage)

        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (signInError) {
          setError(signInError.message)

          return false
        }

        setSession(data.session)
        setUser(data.session?.user ?? null)

        return true
      } catch (nextError) {
        setError(getAuthErrorMessage(nextError))

        return false
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const signOut = useCallback(async () => {
    if (!supabase) {
      setError(unavailableMessage)

      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        setError(signOutError.message)

        return false
      }

      setSession(null)
      setUser(null)

      return true
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError))

      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      configured,
      user,
      session,
      error,
      signUp,
      signIn,
      signOut,
      clearAuthError,
    }),
    [
      clearAuthError,
      configured,
      error,
      loading,
      session,
      signIn,
      signOut,
      signUp,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
