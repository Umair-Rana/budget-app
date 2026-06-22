import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailPlus, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { FormField, inputControlClassName } from '@/components/app/form-field'
import { SectionCard } from '@/components/app/section-card'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  createHouseholdInvite,
  getHouseholdSharingOverview,
  revokeHouseholdInvite,
  type HouseholdMember,
  type HouseholdOutgoingInvite,
} from '@/data/supabase/household-sharing'
import { getSupabaseClient } from '@/lib/supabase/supabase-client'
import { useAuth } from '@/hooks/use-auth'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const householdSharingQueryKey = ['household-sharing'] as const

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

function roleTone(role: string) {
  if (role === 'owner') {
    return 'success'
  }

  if (role === 'member') {
    return 'info'
  }

  return 'neutral'
}

function memberLabel(member: HouseholdMember) {
  return member.email ?? member.userId
}

function sortMembers(members: HouseholdMember[]) {
  return [...members].sort((first, second) => {
    if (first.role === 'owner' && second.role !== 'owner') {
      return -1
    }

    if (first.role !== 'owner' && second.role === 'owner') {
      return 1
    }

    return memberLabel(first).localeCompare(memberLabel(second))
  })
}

export function HouseholdMembersSection() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { cloudHousehold, dataSourceKey } = useFinanceDataSource()
  const { showToast } = useToast()
  const [inviteEmail, setInviteEmail] = useState('')
  const client = getSupabaseClient()
  const householdId = cloudHousehold?.id

  const sharingQuery = useQuery({
    enabled: Boolean(client && householdId),
    queryKey: [...householdSharingQueryKey, dataSourceKey],
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
  const members = useMemo(
    () => sortMembers(sharingQuery.data?.members ?? []),
    [sharingQuery.data?.members],
  )
  const pendingInvites = sharingQuery.data?.pendingInvites ?? []
  const currentMember = members.find((member) => member.userId === user?.id)
  const currentRole = currentMember?.role ?? 'member'
  const isOwner = currentRole === 'owner'

  const createInviteMutation = useMutation({
    mutationFn: (email: string) => {
      if (!client || !householdId) {
        throw new Error('Cloud household is not ready.')
      }

      return createHouseholdInvite({
        client,
        currentEmail: user?.email ?? undefined,
        householdId,
        invitedEmail: email,
      })
    },
    onSuccess: async (invite) => {
      setInviteEmail('')
      await queryClient.invalidateQueries({
        queryKey: householdSharingQueryKey,
      })
      showToast({
        title: 'Invite created',
        description: `${invite.invitedEmail} can now join this household after signing in.`,
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Could not create invite',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const revokeInviteMutation = useMutation({
    mutationFn: (invite: HouseholdOutgoingInvite) => {
      if (!client) {
        throw new Error('Cloud household is not ready.')
      }

      return revokeHouseholdInvite(client, invite.id)
    },
    onSuccess: async (invite) => {
      await queryClient.invalidateQueries({
        queryKey: householdSharingQueryKey,
      })
      showToast({
        title: 'Invite revoked',
        description: `${invite.invitedEmail} can no longer join from this invite.`,
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Could not revoke invite',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const isInviting = createInviteMutation.isPending
  const isRevoking = revokeInviteMutation.isPending

  function submitInvite() {
    createInviteMutation.mutate(inviteEmail)
  }

  return (
    <SectionCard
      icon={Users}
      title="Household Members"
      description="Invite a registered user by email so they can share this cloud household."
      action={<StatusBadge tone={roleTone(currentRole)}>{currentRole}</StatusBadge>}
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">
            {cloudHousehold?.name ?? 'Cloud household'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role: <span className="font-medium">{currentRole}</span>
          </p>
        </div>

        {sharingQuery.error ? (
          <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
            {getErrorMessage(sharingQuery.error)}
          </div>
        ) : null}

        <div className="grid gap-3">
          <p className="text-sm font-medium text-foreground">Members</p>
          {sharingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : null}
          {!sharingQuery.isLoading && members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No household members could be loaded.
            </p>
          ) : null}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {memberLabel(member)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  User id: {member.userId}
                </p>
              </div>
              <StatusBadge tone={roleTone(member.role)}>{member.role}</StatusBadge>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium text-foreground">Pending Invites</p>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending invites.
            </p>
          ) : null}
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {invite.invitedEmail}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Invited as {invite.role}
                </p>
              </div>
              {isOwner ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isRevoking}
                  aria-label={`Revoke invite for ${invite.invitedEmail}`}
                  title={`Revoke invite for ${invite.invitedEmail}`}
                  onClick={() => revokeInviteMutation.mutate(invite)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <StatusBadge>Pending</StatusBadge>
              )}
            </div>
          ))}
        </div>

        {isOwner ? (
          <div className="grid gap-3 rounded-lg border bg-background p-4">
            <FormField label="Invite email">
              <input
                className={inputControlClassName}
                type="email"
                value={inviteEmail}
                placeholder="person@example.com"
                disabled={isInviting}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </FormField>
            <Button
              type="button"
              className="justify-self-start"
              disabled={isInviting || !inviteEmail.trim()}
              onClick={submitInvite}
            >
              <MailPlus className="size-4" aria-hidden="true" />
              {isInviting ? 'Inviting...' : 'Invite Member'}
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-info/25 bg-info/5 p-3 text-sm text-muted-foreground">
            Members can view this household, but only owners can invite or
            revoke members.
          </div>
        )}
      </div>
    </SectionCard>
  )
}
