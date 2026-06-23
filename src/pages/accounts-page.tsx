import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { AccountCard } from '@/components/accounts/account-card'
import { AccountFormDialog } from '@/components/accounts/account-form-dialog'
import { Button } from '@/components/ui/button'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/data/models/account'
import { invalidateAccountMutationData } from '@/lib/query-invalidation'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const accountsQueryKey = ['accounts', 'include-archived']

type ConfirmAction =
  | {
      type: 'archive'
      account: Account
    }
  | {
      type: 'delete'
      account: Account
    }

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

function sortAccounts(accounts: Account[]) {
  return [...accounts].sort((first, second) => {
    if (Boolean(first.archivedAt) !== Boolean(second.archivedAt)) {
      return first.archivedAt ? 1 : -1
    }

    return first.name.localeCompare(second.name)
  })
}

export function AccountsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const accountsQuery = useQuery({
    queryKey: [...accountsQueryKey, dataSourceKey],
    queryFn: () => dataSource.accounts.getAll({ includeArchived: true }),
  })
  const accounts = useMemo(
    () => sortAccounts(accountsQuery.data ?? []),
    [accountsQuery.data],
  )

  const createAccountMutation = useMutation({
    mutationFn: (input: CreateAccountInput) => dataSource.accounts.create(input),
    onSuccess: async () => {
      await invalidateAccountMutationData(queryClient)
      showToast({
        title: 'Account created',
        description: 'The account was saved to your cloud household.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving account',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const updateAccountMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateAccountInput
    }) => dataSource.accounts.update(id, input),
    onSuccess: async () => {
      await invalidateAccountMutationData(queryClient)
      showToast({
        title: 'Account updated',
        description: 'The account changes were saved locally.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving account',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const archiveAccountMutation = useMutation({
    mutationFn: (id: string) => dataSource.accounts.archive(id),
    onSuccess: async () => {
      await invalidateAccountMutationData(queryClient)
      showToast({
        title: 'Account archived',
        description: 'Archived accounts remain in history and can be hidden later.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving account',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => dataSource.accounts.deleteSoft(id),
    onSuccess: async () => {
      await invalidateAccountMutationData(queryClient)
      showToast({
        title: 'Account deleted',
        description: 'The account was soft deleted from active views.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving account',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const confirmSubmitting =
    archiveAccountMutation.isPending || deleteAccountMutation.isPending

  function openAddAccount() {
    setEditingAccount(undefined)
    setFormOpen(true)
  }

  function openEditAccount(account: Account) {
    setEditingAccount(account)
    setFormOpen(true)
  }

  async function createAccount(input: CreateAccountInput) {
    try {
      await createAccountMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateAccount(id: string, input: UpdateAccountInput) {
    try {
      await updateAccountMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmAccountAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveAccountMutation.mutateAsync(confirmAction.account.id)
      } else {
        await deleteAccountMutation.mutateAsync(confirmAction.account.id)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      eyebrow="Accounts"
      title="Accounts"
      description="Manage cash, bank, wallet, credit card, savings, investment, loan, and other accounts stored locally on this device."
      breadcrumb={[{ label: 'More', href: '/more' }]}
      action={
        <Button type="button" onClick={openAddAccount}>
          <Plus className="size-4" aria-hidden="true" />
          Add Account
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Account Balances
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Current balances reflect account records and local transaction
              balance impact.
            </p>
          </div>
        </div>

        {accountsQuery.isLoading ? (
          <LoadingState message="Loading accounts..." />
        ) : null}

        {accountsQuery.error ? (
          <ErrorState message={getErrorMessage(accountsQuery.error)} />
        ) : null}

        {!accountsQuery.isLoading &&
        !accountsQuery.error &&
        accounts.length === 0 ? (
          <EmptyState
            icon={WalletCards}
            title="No accounts created yet."
            message="Add cash, bank, wallet, credit card, savings, investment, loan, or other accounts before entering transactions."
            action={
              <Button type="button" onClick={openAddAccount}>
                <Plus className="size-4" aria-hidden="true" />
                Create account
              </Button>
            }
          />
        ) : null}

        {!accountsQuery.isLoading &&
        !accountsQuery.error &&
        accounts.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={openEditAccount}
                onArchive={(nextAccount) =>
                  setConfirmAction({ type: 'archive', account: nextAccount })
                }
                onDelete={(nextAccount) =>
                  setConfirmAction({ type: 'delete', account: nextAccount })
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <AccountFormDialog
        open={formOpen}
        account={editingAccount}
        onClose={() => setFormOpen(false)}
        onCreate={createAccount}
        onUpdate={updateAccount}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive account?'
            : 'Delete account?'
        }
        description={
          confirmAction?.type === 'archive'
            ? 'Archived accounts may be hidden from future transaction forms later, but the account record remains available for history.'
            : 'Deleted accounts are soft deleted and may be hidden from future transaction forms later. This does not remove any transaction history because transactions are not implemented yet.'
        }
        confirmLabel={
          confirmAction?.type === 'archive' ? 'Archive Account' : 'Delete Account'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmAccountAction}
      />
    </PageShell>
  )
}
