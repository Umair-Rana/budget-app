import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { FormField, inputControlClassName } from '@/components/app/form-field'
import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { SectionCard } from '@/components/app/section-card'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  broadcastHouseholdDeleted,
  canDeleteHousehold,
  deleteHouseholdAndCreateReplacement,
  isExactHouseholdNameConfirmation,
} from '@/data/supabase/household-deletion'
import {
  getHouseholdSharingOverview,
  type HouseholdMemberRole,
} from '@/data/supabase/household-sharing'
import { useAuth } from '@/hooks/use-auth'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { getSupabaseClient } from '@/lib/supabase/supabase-client'
import { useToast } from '@/providers/toast-context'

const householdDangerQueryKey = ['household-sharing'] as const

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

function getInitialOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus)

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return isOnline
}

export function DeleteHouseholdSection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    cloudHousehold,
    dataSourceKey,
    replaceCloudHousehold,
  } = useFinanceDataSource()
  const { showToast } = useToast()
  const client = getSupabaseClient()
  const householdId = cloudHousehold?.id
  const householdName = cloudHousehold?.name ?? ''
  const isOnline = useOnlineStatus()
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const sharingQuery = useQuery({
    enabled: Boolean(client && householdId),
    queryKey: [...householdDangerQueryKey, dataSourceKey],
    queryFn: () => {
      if (!client || !householdId) {
        throw new Error('Cloud household is not ready.')
      }

      return getHouseholdSharingOverview({
        client,
        householdId,
      })
    },
  })
  const currentRole = useMemo<HouseholdMemberRole | undefined>(() => {
    const currentMember = sharingQuery.data?.members.find(
      (member) => member.userId === user?.id,
    )

    return currentMember?.role
  }, [sharingQuery.data?.members, user?.id])
  const canDelete = canDeleteHousehold({
    isOnline,
    role: currentRole,
  })
  const confirmationMatches = isExactHouseholdNameConfirmation({
    confirmation,
    householdName,
  })

  const deleteHouseholdMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        throw new Error('Household deletion requires an internet connection.')
      }

      if (!client || !householdId) {
        throw new Error('Cloud household is not ready.')
      }

      if (currentRole !== 'owner') {
        throw new Error('Only the household owner can delete this household.')
      }

      const replacementHousehold = await deleteHouseholdAndCreateReplacement({
        client,
        householdId,
      })

      await replaceCloudHousehold(replacementHousehold)
      broadcastHouseholdDeleted({
        deletedHouseholdId: householdId,
        replacementHouseholdId: replacementHousehold.id,
      })

      return replacementHousehold
    },
    onSuccess: () => {
      setConfirmation('')
      setConfirmationOpen(false)
      showToast({
        title: 'Household deleted. New household created.',
        description: 'You are now in a clean household.',
        variant: 'success',
      })
      navigate('/', { replace: true })
    },
    onError: (error) => {
      showToast({
        title: 'Could not delete household',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const isDeleting = deleteHouseholdMutation.isPending
  const deleteDisabled =
    !canDelete || sharingQuery.isLoading || deleteHouseholdMutation.isPending

  function closeConfirmation() {
    if (isDeleting) {
      return
    }

    setConfirmation('')
    setConfirmationOpen(false)
  }

  return (
    <>
      <SectionCard
        icon={AlertTriangle}
        title="Danger Zone"
        titleClassName="text-destructive"
        description="Destructive household actions live here."
        action={
          currentRole ? (
            <StatusBadge tone={currentRole === 'owner' ? 'success' : 'neutral'}>
              {currentRole}
            </StatusBadge>
          ) : null
        }
      >
        <div className="grid gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete current household
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Permanently removes this household, its finance data, member
              access, and pending invites. A new clean household is created for
              you immediately after deletion.
            </p>
          </div>

          {sharingQuery.error ? (
            <p className="text-sm text-destructive" role="alert">
              {getErrorMessage(sharingQuery.error)}
            </p>
          ) : null}

          {!isOnline ? (
            <p className="text-sm text-destructive" role="alert">
              Household deletion requires an internet connection.
            </p>
          ) : null}

          {currentRole && currentRole !== 'owner' ? (
            <p className="text-sm text-muted-foreground">
              Only the household owner can delete this household.
            </p>
          ) : null}

          <Button
            type="button"
            variant="destructive"
            className="justify-self-start"
            disabled={deleteDisabled}
            onClick={() => setConfirmationOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete Household
          </Button>
        </div>
      </SectionCard>

      {confirmationOpen ? (
        <ModalDialogShell
          id="delete-household-dialog-title"
          title="Delete household permanently?"
          description="This action cannot be undone."
          closeDisabled={isDeleting}
          onClose={closeConfirmation}
        >
          <div className="grid gap-5 p-5">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-muted-foreground">
              <p>
                This will remove this household, its accounts, transactions,
                bills, goals, loans, budgets, reports, and member access.
              </p>
              <p className="mt-3 font-medium text-destructive">
                This action cannot be undone.
              </p>
            </div>

            <FormField
              label="Confirm household name"
              description={
                <>
                  Type <span className="font-medium">{householdName}</span> to
                  confirm.
                </>
              }
              required
            >
              <input
                className={inputControlClassName}
                value={confirmation}
                disabled={isDeleting}
                autoComplete="off"
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </FormField>

            {isDeleting ? (
              <p className="text-sm text-muted-foreground" role="status">
                Deleting household...
              </p>
            ) : null}

            <ModalDialogActions>
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={closeConfirmation}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!confirmationMatches || isDeleting}
                onClick={() => deleteHouseholdMutation.mutate()}
              >
                {isDeleting
                  ? 'Deleting household...'
                  : 'Delete household permanently'}
              </Button>
            </ModalDialogActions>
          </div>
        </ModalDialogShell>
      ) : null}
    </>
  )
}
