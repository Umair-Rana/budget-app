import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FormField,
  inputControlClassName as inputClassName,
  textareaControlClassName,
} from '@/components/app/form-field'
import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { Button } from '@/components/ui/button'
import type { Account } from '@/data/models/account'
import type {
  AddGoalContributionInput,
  Goal,
  WithdrawFromGoalInput,
} from '@/data/models/goal'
import { formatPkr } from '@/lib/formatting'

type GoalMovementType = 'contribution' | 'withdrawal'

const movementFormSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a valid number.' })
    .finite('Amount must be a valid number.')
    .positive('Amount must be greater than 0.'),
  accountId: z.string().trim().min(1, 'Account is required.'),
  date: z.string().trim().min(1, 'Date is required.'),
  notes: z.string().trim().optional(),
})

type GoalMovementFormValues = z.infer<typeof movementFormSchema>

type GoalMovementDialogProps = {
  open: boolean
  goal?: Goal
  movementType: GoalMovementType
  accounts: Account[]
  onClose: () => void
  onContribute: (
    goalId: string,
    input: AddGoalContributionInput,
  ) => Promise<void>
  onWithdraw: (goalId: string, input: WithdrawFromGoalInput) => Promise<void>
}

function todayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

export function GoalMovementDialog({
  accounts,
  goal,
  movementType,
  onClose,
  onContribute,
  onWithdraw,
  open,
}: GoalMovementDialogProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<GoalMovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      amount: 0,
      accountId: '',
      date: todayInputValue(),
      notes: '',
    },
  })
  const isContribution = movementType === 'contribution'
  const title = isContribution ? 'Add Contribution' : 'Withdraw from Goal'
  const accountLabel = isContribution ? 'Source account' : 'Destination account'
  const helper = isContribution
    ? 'This creates a linked goal movement and decreases the source account.'
    : 'This creates a linked goal movement and increases the destination account.'

  useEffect(() => {
    reset({
      amount: 0,
      accountId: '',
      date: todayInputValue(),
      notes: '',
    })
  }, [goal, movementType, open, reset])

  if (!open || !goal) {
    return null
  }

  async function submitForm(values: GoalMovementFormValues) {
    if (!goal) {
      return
    }

    if (isContribution) {
      await onContribute(goal.id, {
        amount: values.amount,
        sourceAccountId: values.accountId,
        date: values.date,
        notes: normalizeNotes(values.notes),
      })
      return
    }

    await onWithdraw(goal.id, {
      amount: values.amount,
      destinationAccountId: values.accountId,
      date: values.date,
      notes: normalizeNotes(values.notes),
    })
  }

  return (
    <ModalDialogShell
      id="goal-movement-title"
      title={title}
      description={`${goal.name} has ${formatPkr(goal.currentAmount)} saved.`}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
            {helper}
          </div>

          <FormField label="Amount" error={errors.amount?.message}>
            <input
              type="number"
              step="1"
              min="0"
              inputMode="decimal"
              className={inputClassName}
              {...register('amount', { valueAsNumber: true })}
            />
          </FormField>

          <FormField label={accountLabel} error={errors.accountId?.message}>
            <select className={inputClassName} {...register('accountId')}>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Date" error={errors.date?.message}>
            <input type="date" className={inputClassName} {...register('date')} />
          </FormField>

          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              className={textareaControlClassName}
              placeholder="Optional movement note"
              {...register('notes')}
            />
          </FormField>

          <ModalDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isContribution
                  ? 'Add Contribution'
                  : 'Withdraw'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
