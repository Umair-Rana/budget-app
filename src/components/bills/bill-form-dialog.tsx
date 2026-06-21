import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FormField,
  inputControlClassName as inputClassName,
  ReadOnlyField,
  textareaControlClassName,
} from '@/components/app/form-field'
import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { Button } from '@/components/ui/button'
import { billFrequencyOptions } from '@/data/display/bill-options'
import type { Bill, CreateBillInput, UpdateBillInput } from '@/data/models/bill'
import type { Category } from '@/data/models/category'
import { formatDisplayDate, formatPkr } from '@/lib/formatting'

const billFrequencyValues = [
  'none',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
] as const

const billFormSchema = z.object({
  name: z.string().trim().min(1, 'Bill name is required.'),
  amount: z
    .number({ message: 'Amount must be a valid number.' })
    .finite('Amount must be a valid number.')
    .positive('Amount must be greater than 0.'),
  categoryId: z.string().trim().min(1, 'Expense category is required.'),
  dueDate: z.string().trim().min(1, 'Due date is required.'),
  frequency: z.enum(billFrequencyValues, {
    message: 'Frequency is required.',
  }),
  notes: z.string().trim().optional(),
})

type BillFormValues = z.infer<typeof billFormSchema>

type BillFormDialogProps = {
  open: boolean
  bill?: Bill
  expenseCategories: Category[]
  onClose: () => void
  onCreate: (input: CreateBillInput) => Promise<void>
  onUpdate: (id: string, input: UpdateBillInput) => Promise<void>
}

function getDefaultValues(bill?: Bill): BillFormValues {
  return {
    name: bill?.name ?? '',
    amount: bill?.amount ?? 0,
    categoryId: bill?.categoryId ?? '',
    dueDate: bill?.dueDate ?? '',
    frequency: bill?.frequency ?? 'monthly',
    notes: bill?.notes ?? '',
  }
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

export function BillFormDialog({
  bill,
  expenseCategories,
  onClose,
  onCreate,
  onUpdate,
  open,
}: BillFormDialogProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: getDefaultValues(bill),
  })
  const isPaidBill = bill?.status === 'paid'
  const paidBillCategory = bill
    ? expenseCategories.find((category) => category.id === bill.categoryId)
    : undefined

  useEffect(() => {
    reset(getDefaultValues(bill))
  }, [bill, open, reset])

  if (!open) {
    return null
  }

  async function submitForm(values: BillFormValues) {
    const input: CreateBillInput = {
      name: values.name.trim(),
      amount: isPaidBill && bill ? bill.amount : values.amount,
      categoryId: isPaidBill && bill ? bill.categoryId : values.categoryId,
      dueDate: isPaidBill && bill ? bill.dueDate : values.dueDate,
      frequency: values.frequency,
      notes: normalizeNotes(values.notes),
    }

    if (bill) {
      await onUpdate(bill.id, input)
    } else {
      await onCreate(input)
    }
  }

  return (
    <ModalDialogShell
      id="bill-form-title"
      title={bill ? 'Edit Bill' : 'Add Bill'}
      description="Bills are planning records until marked as paid."
      maxWidthClassName="sm:max-w-2xl"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          {isPaidBill ? (
            <div className="rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
              Unmark as unpaid before editing payment details.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Bill name" error={errors.name?.message}>
              <input
                className={inputClassName}
                placeholder="Bill name"
                {...register('name')}
              />
            </FormField>

            <FormField label="Amount" error={errors.amount?.message}>
              {isPaidBill && bill ? (
                <>
                  <input
                    type="hidden"
                    {...register('amount', { valueAsNumber: true })}
                  />
                  <ReadOnlyField>{formatPkr(bill.amount)}</ReadOnlyField>
                </>
              ) : (
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="decimal"
                  className={inputClassName}
                  {...register('amount', { valueAsNumber: true })}
                />
              )}
            </FormField>

            <FormField label="Expense category" error={errors.categoryId?.message}>
              {isPaidBill && bill ? (
                <>
                  <input type="hidden" {...register('categoryId')} />
                  <ReadOnlyField>
                    {paidBillCategory?.name ?? 'Expense category'}
                  </ReadOnlyField>
                </>
              ) : (
                <select className={inputClassName} {...register('categoryId')}>
                  <option value="">Select category</option>
                  {expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Due date" error={errors.dueDate?.message}>
              {isPaidBill && bill ? (
                <>
                  <input type="hidden" {...register('dueDate')} />
                  <ReadOnlyField>{formatDisplayDate(bill.dueDate)}</ReadOnlyField>
                </>
              ) : (
                <input
                  type="date"
                  className={inputClassName}
                  {...register('dueDate')}
                />
              )}
            </FormField>

            <FormField label="Frequency" error={errors.frequency?.message}>
              <select className={inputClassName} {...register('frequency')}>
                {billFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {expenseCategories.length === 0 ? (
            <div className="rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
              No active expense categories are available. Default categories are
              checked automatically; review Settings if none appear.
            </div>
          ) : null}

          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              className={textareaControlClassName}
              placeholder="Optional notes"
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
              {isSubmitting ? 'Saving...' : bill ? 'Save Changes' : 'Add Bill'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
