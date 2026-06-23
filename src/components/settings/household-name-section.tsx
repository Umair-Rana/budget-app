import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Home } from 'lucide-react'

import { FormField, inputControlClassName } from '@/components/app/form-field'
import { SectionCard } from '@/components/app/section-card'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  canRenameHousehold,
  isHouseholdNameChanged,
  normalizeHouseholdName,
  validateHouseholdName,
} from '@/data/supabase/household-rename'
import {
  getHouseholdSharingOverview,
  type HouseholdMemberRole,
} from '@/data/supabase/household-sharing'
import { useAuth } from '@/hooks/use-auth'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { getSupabaseClient } from '@/lib/supabase/supabase-client'
import { useToast } from '@/providers/toast-context'

const householdNameRoleQueryKey = ['household-sharing'] as const

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

export function HouseholdNameSection() {
  const { user } = useAuth()
  const {
    cloudHousehold,
    dataSourceKey,
    renameCloudHousehold,
  } = useFinanceDataSource()
  const { showToast } = useToast()
  const client = getSupabaseClient()
  const householdId = cloudHousehold?.id
  const currentName = cloudHousehold?.name ?? ''
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(currentName)
  const [saving, setSaving] = useState(false)

  const sharingQuery = useQuery({
    enabled: Boolean(client && householdId),
    queryKey: [...householdNameRoleQueryKey, dataSourceKey],
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
  const canRename = canRenameHousehold(currentRole)
  const validationError = validateHouseholdName(draftName)
  const changed = isHouseholdNameChanged({
    currentName,
    nextName: draftName,
  })
  const saveDisabled = Boolean(validationError) || !changed || saving

  function startEditing() {
    setDraftName(currentName)
    setEditing(true)
  }

  function cancelEditing() {
    setDraftName(currentName)
    setEditing(false)
  }

  async function saveHouseholdName() {
    if (saveDisabled) {
      return
    }

    setSaving(true)

    try {
      await renameCloudHousehold(normalizeHouseholdName(draftName))
      setEditing(false)
      showToast({
        title: 'Household name updated.',
        variant: 'success',
      })
    } catch (error) {
      setDraftName(currentName)
      showToast({
        title: 'Could not rename household',
        description: getErrorMessage(error),
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      icon={Home}
      title="Household Name"
      description="This name appears in your sidebar, header, and household overview."
      action={
        currentRole ? (
          <StatusBadge tone={currentRole === 'owner' ? 'success' : 'neutral'}>
            {currentRole}
          </StatusBadge>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">
            Current household name
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentName || 'Cloud household'}
          </p>
        </div>

        {sharingQuery.error ? (
          <p className="text-sm text-destructive" role="alert">
            {getErrorMessage(sharingQuery.error)}
          </p>
        ) : null}

        {!canRename && currentRole ? (
          <p className="text-sm text-muted-foreground">
            Only the household owner can rename this household.
          </p>
        ) : null}

        {editing ? (
          <div className="grid gap-3 rounded-lg border bg-background p-4">
            <FormField
              label="Household name"
              error={validationError ?? undefined}
              required
            >
              <input
                className={inputControlClassName}
                value={draftName}
                maxLength={50}
                disabled={saving}
                onChange={(event) => setDraftName(event.target.value)}
              />
            </FormField>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={cancelEditing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saveDisabled}
                onClick={() => void saveHouseholdName()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : canRename ? (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={sharingQuery.isLoading}
            onClick={startEditing}
          >
            Edit
          </Button>
        ) : null}
      </div>
    </SectionCard>
  )
}
