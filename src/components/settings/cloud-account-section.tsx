import { Cloud, LogOut } from 'lucide-react'
import { useState } from 'react'

import { SectionCard } from '@/components/app/section-card'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

export function CloudAccountSection() {
  const {
    clearAuthError,
    configured,
    error,
    loading,
    session,
    signOut,
    user,
  } = useAuth()
  const { cloudHousehold } = useFinanceDataSource()
  const { showToast } = useToast()
  const [pendingAction, setPendingAction] = useState<'sign-out' | null>(null)
  const signedIn = Boolean(session && user)
  const isBusy = loading || pendingAction !== null

  async function handleSignOut() {
    setPendingAction('sign-out')
    clearAuthError()

    const ok = await signOut()

    if (ok) {
      showToast({
        title: 'Signed out',
        description:
          'Sign in again to access your cloud household from another device.',
        variant: 'success',
      })
    }

    setPendingAction(null)
  }

  if (!configured) {
    return (
      <SectionCard
        icon={Cloud}
        title="Cloud Account"
        description="Supabase login will be available after environment setup."
        action={<StatusBadge tone="warning">Not configured</StatusBadge>}
      >
        <div className="rounded-md border border-warning/25 bg-warning/5 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Cloud is not configured yet.
          </p>
          <p className="mt-1">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
            to enable login and cloud persistence.
          </p>
        </div>
      </SectionCard>
    )
  }

  if (!signedIn) {
    return null
  }

  return (
    <SectionCard
      icon={Cloud}
      title="Cloud Account"
      description="Your household data is securely stored in the cloud."
      action={<StatusBadge tone="success">Signed in</StatusBadge>}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">
            {user?.email ?? 'Signed in account'}
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            User id: {user?.id}
          </p>
        </div>

        {cloudHousehold ? (
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">Household</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cloudHousehold.name}
            </p>
          </div>
        ) : null}

        <div className="rounded-md border border-info/25 bg-info/5 p-3 text-sm text-muted-foreground">
          Your finance data is securely stored in your cloud household and is
          available from any device after signing in.
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={handleSignOut}
          disabled={isBusy}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {pendingAction === 'sign-out' ? 'Signing Out...' : 'Sign Out'}
        </Button>
      </div>
    </SectionCard>
  )
}
