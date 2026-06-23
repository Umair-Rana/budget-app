import { useState, type FormEvent } from 'react'
import { Cloud, LogIn, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormField, inputControlClassName } from '@/components/app/form-field'
import {
  emailConfirmationRequiredMessage,
  validateAuthCredentials,
} from '@/lib/auth/auth-utils'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/providers/toast-context'

type AuthStatusMessage = {
  message: string
  tone: 'success' | 'error'
}

export function AuthScreen() {
  const {
    configured,
    clearAuthError,
    error,
    loading,
    signIn,
    signUp,
    user,
  } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingAction, setPendingAction] = useState<
    'sign-in' | 'sign-up' | null
  >(null)
  const [statusMessage, setStatusMessage] =
    useState<AuthStatusMessage | null>(null)

  const signedIn = Boolean(user)
  const isBusy = loading || pendingAction !== null

  async function runAuthAction(action: 'sign-in' | 'sign-up') {
    if (isBusy) {
      return
    }

    const validationMessage = validateAuthCredentials(email, password)

    if (validationMessage) {
      setStatusMessage({
        message: validationMessage,
        tone: 'error',
      })
      showToast({
        title: 'Check your details',
        description: validationMessage,
        variant: 'error',
      })
      return
    }

    setPendingAction(action)
    clearAuthError()
    setStatusMessage(null)

    try {
      if (action === 'sign-in') {
        const ok = await signIn(email.trim(), password)

        if (ok) {
          setPassword('')
          showToast({
            title: 'Signed in',
            description:
              'Supabase session is active. Your cloud household will be prepared shortly.',
            variant: 'success',
          })
        }

        return
      }

      const result = await signUp(email.trim(), password)

      if (result.ok) {
        setPassword('')
        setStatusMessage({
          message: result.confirmationRequired
            ? emailConfirmationRequiredMessage
            : result.message,
          tone: 'success',
        })
        showToast({
          title: 'Account created',
          description: result.confirmationRequired
            ? emailConfirmationRequiredMessage
            : result.message,
          variant: 'success',
        })
      } else {
        setStatusMessage({
          message: result.message,
          tone: 'error',
        })
        showToast({
          title: 'Could not create account',
          description: result.message,
          variant: 'error',
        })
      }
    } finally {
      setPendingAction(null)
    }
  }

  if (!configured) {
    return (
      <div className="min-h-svh bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] text-foreground sm:p-8">
        <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-xl items-center justify-center sm:min-h-[calc(100svh-4rem)]">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Cloud configuration required</CardTitle>
              <CardDescription>
                Supabase is not configured. Add `VITE_SUPABASE_URL` and
                `VITE_SUPABASE_ANON_KEY` to `.env.local`, then restart the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Household Finance requires a Supabase backend to sign in and
                load your cloud household.
              </p>
              <div className="rounded-lg border border-warning/25 bg-warning/5 p-4 text-sm text-warning">
                <p className="font-medium">Not configured</p>
                <p className="mt-1">
                  Cloud-only mode is blocked until environment variables are
                  available.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (signedIn) {
    return (
      <div className="min-h-svh bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] text-foreground sm:p-8">
        <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-xl items-center justify-center sm:min-h-[calc(100svh-4rem)]">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Preparing your cloud household</CardTitle>
              <CardDescription>
                You are signed in and the app is finalizing your cloud session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cloud className="size-4" aria-hidden="true" />
                <span>Signed in as {user?.email ?? 'your account'}</span>
              </div>

              {error ? (
                <div className="rounded-md border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">Authentication error</p>
                  <p className="mt-1">{error}</p>
                </div>
              ) : null}

              <div className="rounded-md border border-info/25 bg-info/5 p-4 text-sm text-muted-foreground">
                Cloud household bootstrap is in progress. Your finances will be
                available once the backend setup completes.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] text-foreground sm:p-8">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-xl items-center justify-center sm:min-h-[calc(100svh-4rem)]">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sign in to Household Finance</CardTitle>
            <CardDescription>
              Sign in with your Supabase account to access your cloud household
              from any device.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {statusMessage ? (
              <div
                className={
                  statusMessage.tone === 'success'
                    ? 'rounded-md border border-success/25 bg-success/5 p-3 text-sm text-success'
                    : 'rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive'
                }
              >
                {statusMessage.message}
              </div>
            ) : null}

            <form
              className="grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                void runAuthAction('sign-in')
              }}
            >
              <FormField label="Email" required>
                <input
                  className={inputControlClassName}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setStatusMessage(null)
                  }}
                  disabled={isBusy}
                  required
                />
              </FormField>

              <FormField label="Password" required>
                <input
                  className={inputControlClassName}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setStatusMessage(null)
                  }}
                  disabled={isBusy}
                  minLength={6}
                  required
                />
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="submit" disabled={isBusy}>
                  <LogIn className="size-4" aria-hidden="true" />
                  {pendingAction === 'sign-in' ? 'Signing In...' : 'Sign In'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void runAuthAction('sign-up')}
                  disabled={isBusy || !email.trim() || !password}
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  {pendingAction === 'sign-up'
                    ? 'Creating...'
                    : 'Create Account'}
                </Button>
              </div>
            </form>

            <div className="rounded-md border border-muted-200 bg-muted/50 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Cloud className="size-4" aria-hidden="true" />
                <p>
                  Your finance data is securely stored in your cloud household
                  and is available from any device after signing in.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
