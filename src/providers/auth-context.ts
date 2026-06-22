import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AuthSignUpResult } from '@/lib/auth/auth-utils'

export type AuthContextValue = {
  loading: boolean
  configured: boolean
  user: User | null
  session: Session | null
  error: string | null
  signUp: (email: string, password: string) => Promise<AuthSignUpResult>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<boolean>
  clearAuthError: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
