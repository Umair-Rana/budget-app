import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { AuthScreen } from '@/components/auth/auth-screen'
import { LoadingState } from '@/components/app/loading-state'
import type { FinanceDataSource } from '@/data/contracts'
import {
  bootstrapSupabaseHousehold,
  type CloudHousehold,
} from '@/data/supabase/household-bootstrap'
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
  const [cloudState, setCloudState] = useState<CloudBootstrapState>({
    status: 'idle',
  })
  const signedIn = Boolean(session && user)

  useEffect(() => {
    if (!configured || authLoading || !session || !user || !supabase) {
      return undefined
    }

    const cloudClient = supabase
    const cloudUser = user
    let cancelled = false

    async function initializeCloudFinanceData() {
      setCloudState({ status: 'loading', userId: cloudUser.id })

      try {
        const result = await bootstrapSupabaseHousehold({
          client: cloudClient,
          user: cloudUser,
        })

        if (!cancelled) {
          setCloudState({
            status: 'ready',
            dataSource: result.dataSource,
            household: result.household,
            userId: cloudUser.id,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setCloudState({
            status: 'error',
            message: bootstrapErrorMessage(error),
            userId: cloudUser.id,
          })
        }
      }
    }

    void initializeCloudFinanceData()

    return () => {
      cancelled = true
    }
  }, [authLoading, configured, session, supabase, user])

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

  useEffect(() => {
    if (!cloudReady) {
      return undefined
    }

    void queryClient.invalidateQueries()
  }, [cloudReady, queryClient])

  if (!configured || authLoading || !signedIn) {
    return <AuthScreen />
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
      }}
    >
      {children}
    </FinanceDataSourceContext.Provider>
  )
}
