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
import type { Bill, MarkBillPaidInput } from '@/data/models/bill'
import { formatPkr } from '@/lib/formatting'

const paymentFormSchema = z.object({
  paymentAccountId: z.string().trim().min(1, 'Payment account is required.'),
  paymentDate: z.string().trim().min(1, 'Payment date is required.'),
  notes: z.string().trim().optional(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

type BillPaymentDialogProps = {
  open: boolean
  bill?: Bill
  accounts: Account[]
  onClose: () => void
  onSubmit: (billId: string, input: MarkBillPaidInput) => Promise<void>
}

function todayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function BillPaymentDialog({
  accounts,
  bill,
  onClose,
  onSubmit,
  open,
}: BillPaymentDialogProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentAccountId: '',
      paymentDate: todayInputValue(),
      notes: '',
    },
  })

  useEffect(() => {
    reset({
      paymentAccountId: '',
      paymentDate: todayInputValue(),
      notes: bill?.notes ?? '',
    })
  }, [bill, open, reset])

  if (!open || !bill) {
    return null
  }

  async function submitForm(values: PaymentFormValues) {
    if (!bill) {
      return
    }

    await onSubmit(bill.id, {
      paymentAccountId: values.paymentAccountId,
      paymentDate: values.paymentDate,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    })
  }

  return (
    <ModalDialogShell
      id="bill-payment-title"
      title="Mark Bill Paid"
      description={`This creates a linked expense transaction for ${formatPkr(
        bill.amount,
      )}.`}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          <FormField
            label="Payment account"
            error={errors.paymentAccountId?.message}
          >
            <select className={inputClassName} {...register('paymentAccountId')}>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Payment date" error={errors.paymentDate?.message}>
            <input
              type="date"
              className={inputClassName}
              {...register('paymentDate')}
            />
          </FormField>

          <FormField label="Payment notes" error={errors.notes?.message}>
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
              {isSubmitting ? 'Saving...' : 'Mark Paid'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
