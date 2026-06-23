import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { AuthScreen } from '@/components/auth/auth-screen'
import { LoadingState } from '@/components/app/loading-state'
import { Button } from '@/components/ui/button'
import type { FinanceDataSource } from '@/data/contracts'
import {
  type CloudHousehold,
  prepareSupabaseHousehold,
} from '@/data/supabase/household-bootstrap'
import { householdDeletedStorageKey } from '@/data/supabase/household-deletion'
import {
  acceptHouseholdInvite,
  type PendingHouseholdInvite,
} from '@/data/supabase/household-sharing'
import { createSupabaseFinanceDataSource } from '@/data/supabase/supabase-finance-data-source'
import { getSupabaseClient } from '@/lib/supabase/supabase-client'
import { useAuth } from '@/hooks/use-auth'
import { FinanceDataSourceContext } from '@/providers/finance-data-source-context'

type CloudBootstrapState =
  | {
      status: 'idle'
      dataSource?: undefined
      household?: undefined
      message?: undefined
      userId?: undefined
    }
  | {
      status: 'loading'
      dataSource?: undefined
      household?: undefined
      message?: undefined
      userId: string
    }
  | {
      status: 'ready'
      dataSource: FinanceDataSource
      household: CloudHousehold
      message?: undefined
      userId: string
    }
  | {
      status: 'invite'
      dataSource?: undefined
      household?: undefined
      message?: undefined
      pendingInvites: PendingHouseholdInvite[]
      userId: string
    }
  | {
      status: 'error'
      dataSource?: undefined
      household?: undefined
      message: string
      userId: string
    }

function bootstrapErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Cloud household setup failed.'
}

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { configured, loading: authLoading, session, user } = useAuth()
  const supabase = getSupabaseClient()
  const bootstrappedUserIdRef = useRef<string | null>(null)
  const [cloudState, setCloudState] = useState<CloudBootstrapState>({
    status: 'idle',
  })
  const [pendingInviteAction, setPendingInviteAction] = useState<
    'join' | 'skip' | null
  >(null)
  const signedIn = Boolean(session && user)

  const activateHousehold = useCallback(
    async (cloudClient: NonNullable<typeof supabase>, cloudUser: typeof user, household: CloudHousehold) => {
      if (!cloudUser) {
        throw new Error('A signed-in user is required to load household data.')
      }

      const dataSource = createSupabaseFinanceDataSource({
        client: cloudClient,
        householdId: household.id,
        userId: cloudUser.id,
      })

      await dataSource.categories.seedDefaultsIfNeeded()

      setCloudState({
        status: 'ready',
        dataSource,
        household,
        userId: cloudUser.id,
      })
    },
    [],
  )

  const replaceCloudHousehold = useCallback(
    async (household: CloudHousehold) => {
      if (!supabase || !user) {
        throw new Error('A signed-in user is required to switch households.')
      }

      const dataSource = createSupabaseFinanceDataSource({
        client: supabase,
        householdId: household.id,
        userId: user.id,
      })

      bootstrappedUserIdRef.current = user.id
      queryClient.removeQueries()
      setCloudState({
        status: 'ready',
        dataSource,
        household,
        userId: user.id,
      })

      try {
        await dataSource.categories.seedDefaultsIfNeeded()
      } catch {
        // The replacement household is already the active safe state. A
        // transient default-category seeding failure should not make the
        // destructive delete flow look rolled back when it was not.
      } finally {
        void queryClient.invalidateQueries()
      }
    },
    [queryClient, supabase, user],
  )

  const initializeCloudFinanceData = useCallback(
    async ({
      cloudClient,
      cloudUser,
      skipInviteCheck = false,
    }: {
      cloudClient: NonNullable<typeof supabase>
      cloudUser: NonNullable<typeof user>
      skipInviteCheck?: boolean
    }) => {
      await Promise.resolve()

      setCloudState({ status: 'loading', userId: cloudUser.id })

      try {
        const gateResult = await prepareSupabaseHousehold({
          client: cloudClient,
          skipInviteCheck,
          user: cloudUser,
        })

        if (gateResult.status === 'pending-invites') {
          setCloudState({
            status: 'invite',
            pendingInvites: gateResult.pendingInvites,
            userId: cloudUser.id,
          })
          return
        }

        setCloudState({
          status: 'ready',
          dataSource: gateResult.result.dataSource,
          household: gateResult.result.household,
          userId: cloudUser.id,
        })
      } catch (error) {
        setCloudState({
          status: 'error',
          message: bootstrapErrorMessage(error),
          userId: cloudUser.id,
        })
      }
    },
    [],
  )

  useEffect(() => {
    if (!configured || authLoading || !session || !user || !supabase) {
      if (!session && bootstrappedUserIdRef.current !== null) {
        bootstrappedUserIdRef.current = null
        setCloudState({ status: 'idle' })
      }

      return undefined
    }

    const cloudClient = supabase
    const cloudUser = user
    const cloudUserId = cloudUser.id

    if (
      bootstrappedUserIdRef.current === cloudUserId &&
      cloudState.status !== 'idle' &&
      cloudState.userId === cloudUserId
    ) {
      return undefined
    }

    bootstrappedUserIdRef.current = cloudUserId

    const bootstrapTimer = window.setTimeout(() => {
      void initializeCloudFinanceData({
        cloudClient,
        cloudUser,
      })
    }, 0)

    return () => window.clearTimeout(bootstrapTimer)
  }, [
    authLoading,
    cloudState.status,
    cloudState.userId,
    configured,
    initializeCloudFinanceData,
    session,
    supabase,
    user,
  ])

  const stateBelongsToCurrentUser = signedIn && cloudState.userId === user?.id
  const cloudReady = cloudState.status === 'ready' && stateBelongsToCurrentUser
  const readyCloudState = cloudReady ? cloudState : null
  const cloudHousehold = readyCloudState?.household ?? null
  const dataSource = readyCloudState?.dataSource
  const dataSourceKey = readyCloudState
    ? `supabase:${readyCloudState.household.id}`
    : 'supabase:pending'
  const isCloudLoading =
    signedIn &&
    (cloudState.status === 'idle' ||
      cloudState.status === 'loading' ||
      !stateBelongsToCurrentUser)
  const cloudError =
    cloudState.status === 'error' && stateBelongsToCurrentUser
      ? cloudState.message
      : null
  const pendingInvites =
    cloudState.status === 'invite' && stateBelongsToCurrentUser
      ? cloudState.pendingInvites
      : []

  useEffect(() => {
    if (!cloudReady) {
      return undefined
    }

    void queryClient.invalidateQueries()
  }, [cloudReady, queryClient])

  useEffect(() => {
    function handleHouseholdDeleted(event: StorageEvent) {
      if (
        event.key !== householdDeletedStorageKey ||
        !event.newValue ||
        cloudState.status !== 'ready'
      ) {
        return
      }

      try {
        const payload = JSON.parse(event.newValue) as {
          deletedHouseholdId?: unknown
        }

        if (payload.deletedHouseholdId !== cloudState.household.id) {
          return
        }

        bootstrappedUserIdRef.current = null
        queryClient.removeQueries()
        setCloudState({ status: 'idle' })
      } catch {
        // Ignore malformed cross-tab notifications.
      }
    }

    window.addEventListener('storage', handleHouseholdDeleted)

    return () => window.removeEventListener('storage', handleHouseholdDeleted)
  }, [cloudState, queryClient])

  if (!configured || authLoading || !signedIn) {
    return <AuthScreen />
  }

  async function joinInvite(invite: PendingHouseholdInvite) {
    if (!supabase || !user) {
      return
    }

    setPendingInviteAction('join')

    try {
      const household = await acceptHouseholdInvite(supabase, invite.id)

      await activateHousehold(supabase, user, household)
      void queryClient.invalidateQueries()
    } catch (error) {
      setCloudState({
        status: 'error',
        message: bootstrapErrorMessage(error),
        userId: user.id,
      })
    } finally {
      setPendingInviteAction(null)
    }
  }

  async function skipInviteForNow() {
    if (!supabase || !user) {
      return
    }

    setPendingInviteAction('skip')

    try {
      await initializeCloudFinanceData({
        cloudClient: supabase,
        cloudUser: user,
        skipInviteCheck: true,
      })
    } finally {
      setPendingInviteAction(null)
    }
  }

  if (isCloudLoading) {
    return (
      <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-xl items-center justify-center sm:min-h-[calc(100svh-4rem)]">
          <LoadingState
            className="w-full"
            message="Preparing cloud household data..."
          />
        </div>
      </div>
    )
  }

  if (pendingInvites.length > 0) {
    const invite = pendingInvites[0]
    const additionalInviteCount = pendingInvites.length - 1
    const busy = pendingInviteAction !== null

    return (
      <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-xl flex-col items-center justify-center gap-4 sm:min-h-[calc(100svh-4rem)]">
          <div className="w-full rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <p className="text-lg font-semibold">Join household?</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You have been invited to join{' '}
              <span className="font-medium text-foreground">
                {invite.householdName}
              </span>
              . Joining lets you share the same accounts, transactions, bills,
              goals, loans, budgets, reports, recurring transactions, and
              notifications.
            </p>
            {additionalInviteCount > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {additionalInviteCount} additional invite
                {additionalInviteCount === 1 ? '' : 's'} can be handled after
                this one.
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={skipInviteForNow}
              >
                {pendingInviteAction === 'skip' ? 'Loading...' : 'Not Now'}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void joinInvite(invite)}
              >
                {pendingInviteAction === 'join'
                  ? 'Joining...'
                  : 'Join Household'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (cloudError || !dataSource || !cloudHousehold) {
    return (
      <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-xl flex-col items-center justify-center gap-4 sm:min-h-[calc(100svh-4rem)]">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            <p className="font-semibold">Cloud setup failed</p>
            <p className="mt-2">
              {cloudError ?? 'Unable to initialize your Supabase household.'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Refresh the page or sign out and sign back in to retry.
          </p>
        </div>
      </div>
    )
  }

  return (
    <FinanceDataSourceContext.Provider
      value={{
        cloudError,
        cloudHousehold,
        dataSource,
        dataSourceKey,
        isCloudLoading,
        replaceCloudHousehold,
      }}
    >
      {children}
    </FinanceDataSourceContext.Provider>
  )
}
