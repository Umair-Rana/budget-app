import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FormField,
  inputControlClassName,
  textareaControlClassName,
} from '@/components/app/form-field'
import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { Button } from '@/components/ui/button'
import type { Account } from '@/data/models/account'
import type { Loan, RecordLoanPaymentInput } from '@/data/models/loan'
import { formatPkr } from '@/lib/formatting'

const paymentFormSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a valid number.' })
    .finite('Amount must be a valid number.')
    .positive('Amount must be greater than 0.'),
  accountId: z.string().trim().min(1, 'Account is required.'),
  date: z.string().trim().min(1, 'Date is required.'),
  notes: z.string().trim().optional(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

type LoanPaymentDialogProps = {
  open: boolean
  loan?: Loan
  accounts: Account[]
  onClose: () => void
  onSubmit: (loanId: string, input: RecordLoanPaymentInput) => Promise<void>
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

export function LoanPaymentDialog({
  accounts,
  loan,
  onClose,
  onSubmit,
  open,
}: LoanPaymentDialogProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      accountId: '',
      date: todayInputValue(),
      notes: '',
    },
  })
  const isLoanGiven = loan?.type === 'given'
  const title = isLoanGiven ? 'Record Repayment' : 'Record Payment'
  const accountLabel = isLoanGiven ? 'Receiving account' : 'Payment account'
  const description = isLoanGiven
    ? 'Record money received against a loan you gave.'
    : 'Record money paid against a loan you took.'

  useEffect(() => {
    reset({
      amount: 0,
      accountId: '',
      date: todayInputValue(),
      notes: '',
    })
  }, [loan, open, reset])

  if (!open || !loan) {
    return null
  }

  async function submitForm(values: PaymentFormValues) {
    if (!loan) {
      return
    }

    await onSubmit(loan.id, {
      amount: values.amount,
      accountId: values.accountId,
      date: values.date,
      notes: normalizeNotes(values.notes),
    })
  }

  return (
    <ModalDialogShell
      id="loan-payment-title"
      title={title}
      description={`${description} Outstanding: ${formatPkr(
        loan.outstandingAmount,
      )}.`}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
        <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
          This creates a linked neutral loan movement and updates the selected
          account balance.
        </div>

        <FormField label="Amount" error={errors.amount?.message}>
          <input
            type="number"
            step="1"
            min="0"
            inputMode="decimal"
            className={inputControlClassName}
            {...register('amount', { valueAsNumber: true })}
          />
        </FormField>

        <FormField label={accountLabel} error={errors.accountId?.message}>
          <select className={inputControlClassName} {...register('accountId')}>
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Date" error={errors.date?.message}>
          <input type="date" className={inputControlClassName} {...register('date')} />
        </FormField>

        <FormField label="Notes" error={errors.notes?.message}>
          <textarea
            className={textareaControlClassName}
            placeholder="Optional payment note"
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
            {isSubmitting ? 'Saving...' : title}
          </Button>
        </ModalDialogActions>
      </form>
    </ModalDialogShell>
  )
}
