import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { getTransactionFormTime } from '@/data/domain/transaction-datetime'
import type { Account } from '@/data/models/account'
import type { Category, CategoryType } from '@/data/models/category'
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/data/models/transaction'
import {
  getTransactionTypeLabel,
  transactionTypeOptions,
  transactionTypeValues,
} from '@/data/display/transaction-options'
import { renderIconByName } from '@/lib/icon-map'

type AdjustmentDirection = 'increase' | 'decrease'

const adjustmentDirectionValues = ['increase', 'decrease'] as const

const transactionFormSchema = z
  .object({
    type: z.enum(transactionTypeValues, {
      message: 'Type is required.',
    }),
    amount: z
      .number({ message: 'Amount must be a valid number.' })
      .finite('Amount must be a valid number.')
      .positive('Amount must be greater than 0.'),
    categoryId: z.string().optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    adjustmentDirection: z.enum(adjustmentDirectionValues),
    adjustmentAccountId: z.string().optional(),
    date: z.string().trim().min(1, 'Date is required.'),
    time: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.type === 'income') {
      if (!values.categoryId) {
        context.addIssue({
          code: 'custom',
          path: ['categoryId'],
          message: 'Income category is required.',
        })
      }

      if (!values.toAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Destination account is required.',
        })
      }
    }

    if (values.type === 'expense') {
      if (!values.categoryId) {
        context.addIssue({
          code: 'custom',
          path: ['categoryId'],
          message: 'Expense category is required.',
        })
      }

      if (!values.fromAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['fromAccountId'],
          message: 'Source account is required.',
        })
      }
    }

    if (values.type === 'transfer') {
      if (!values.fromAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['fromAccountId'],
          message: 'Source account is required.',
        })
      }

      if (!values.toAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Destination account is required.',
        })
      }

      if (
        values.fromAccountId &&
        values.toAccountId &&
        values.fromAccountId === values.toAccountId
      ) {
        context.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Transfer accounts must be different.',
        })
      }
    }

    if (values.type === 'adjustment') {
      if (!values.categoryId) {
        context.addIssue({
          code: 'custom',
          path: ['categoryId'],
          message: 'Adjustment reason is required.',
        })
      }

      if (!values.adjustmentAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['adjustmentAccountId'],
          message: 'Adjustment account is required.',
        })
      }
    }
  })

type TransactionFormValues = z.infer<typeof transactionFormSchema>

type TransactionFormDialogProps = {
  open: boolean
  transaction?: Transaction
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onCreate: (input: CreateTransactionInput) => Promise<void>
  onUpdate: (id: string, input: UpdateTransactionInput) => Promise<void>
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getAdjustmentDirection(
  transaction?: Transaction,
): AdjustmentDirection {
  if (transaction?.type !== 'adjustment') {
    return 'increase'
  }

  return transaction.toAccountId ? 'increase' : 'decrease'
}

function getDefaultValues(transaction?: Transaction): TransactionFormValues {
  return {
    type: transaction?.type ?? 'expense',
    amount: transaction?.amount ?? 0,
    categoryId: transaction?.categoryId ?? '',
    fromAccountId: transaction?.fromAccountId ?? '',
    toAccountId: transaction?.toAccountId ?? '',
    adjustmentDirection: getAdjustmentDirection(transaction),
    adjustmentAccountId:
      transaction?.type === 'adjustment'
        ? transaction.toAccountId ?? transaction.fromAccountId ?? ''
        : '',
    date: transaction?.date ?? getTodayInputValue(),
    time: getTransactionFormTime(transaction),
    notes: transaction?.notes ?? '',
  }
}

function transactionCategoryType(
  type: TransactionType,
): CategoryType | undefined {
  if (type === 'transfer') {
    return undefined
  }

  return type
}

function optionalValue(value: string | undefined) {
  return value?.trim() ? value : undefined
}

function buildTransactionInput(
  values: TransactionFormValues,
): CreateTransactionInput {
  const notes = optionalValue(values.notes)

  if (values.type === 'income') {
    return {
      type: values.type,
      amount: values.amount,
      categoryId: optionalValue(values.categoryId),
      toAccountId: optionalValue(values.toAccountId),
      date: values.date,
      time: optionalValue(values.time),
      notes,
    }
  }

  if (values.type === 'expense') {
    return {
      type: values.type,
      amount: values.amount,
      categoryId: optionalValue(values.categoryId),
      fromAccountId: optionalValue(values.fromAccountId),
      date: values.date,
      time: optionalValue(values.time),
      notes,
    }
  }

  if (values.type === 'transfer') {
    return {
      type: values.type,
      amount: values.amount,
      fromAccountId: optionalValue(values.fromAccountId),
      toAccountId: optionalValue(values.toAccountId),
      date: values.date,
      time: optionalValue(values.time),
      notes,
    }
  }

  return {
    type: values.type,
    amount: values.amount,
    categoryId: optionalValue(values.categoryId),
    fromAccountId:
      values.adjustmentDirection === 'decrease'
        ? optionalValue(values.adjustmentAccountId)
        : undefined,
    toAccountId:
      values.adjustmentDirection === 'increase'
        ? optionalValue(values.adjustmentAccountId)
        : undefined,
    date: values.date,
    time: optionalValue(values.time),
    notes,
  }
}

export function TransactionFormDialog({
  accounts,
  categories,
  onClose,
  onCreate,
  onUpdate,
  open,
  transaction,
}: TransactionFormDialogProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: getDefaultValues(transaction),
  })
  const selectedType = useWatch({ control, name: 'type' }) ?? 'expense'
  const selectedCategoryId = useWatch({ control, name: 'categoryId' })
  const selectedCategoryType = transactionCategoryType(selectedType)
  const categoryOptions = useMemo(
    () =>
      selectedCategoryType
        ? categories.filter((category) => category.type === selectedCategoryType)
        : [],
    [categories, selectedCategoryType],
  )
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  )

  useEffect(() => {
    reset(getDefaultValues(transaction))
  }, [open, reset, transaction])

  if (!open) {
    return null
  }

  async function submitForm(values: TransactionFormValues) {
    const input = buildTransactionInput(values)

    if (transaction) {
      await onUpdate(transaction.id, input)
    } else {
      await onCreate(input)
    }
  }

  return (
    <ModalDialogShell
      id="transaction-form-title"
      title={transaction ? 'Edit Transaction' : 'Add Transaction'}
      description="Balance impact is applied when this transaction is saved."
      maxWidthClassName="sm:max-w-2xl"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Type" error={errors.type?.message}>
              <select
                className={inputClassName}
                {...register('type', {
                  onChange: () => {
                    setValue('categoryId', '')
                    setValue('fromAccountId', '')
                    setValue('toAccountId', '')
                    setValue('adjustmentAccountId', '')
                  },
                })}
              >
                {transactionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

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

            <FormField label="Date" error={errors.date?.message}>
              <input type="date" className={inputClassName} {...register('date')} />
            </FormField>

            <FormField label="Time" error={errors.time?.message}>
              <input type="time" className={inputClassName} {...register('time')} />
            </FormField>
          </div>

          {selectedType === 'income' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Income Category" error={errors.categoryId?.message}>
                <select className={inputClassName} {...register('categoryId')}>
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="To Account" error={errors.toAccountId?.message}>
                <select className={inputClassName} {...register('toAccountId')}>
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {selectedType === 'expense' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Expense Category" error={errors.categoryId?.message}>
                <select className={inputClassName} {...register('categoryId')}>
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="From Account"
                error={errors.fromAccountId?.message}
              >
                <select className={inputClassName} {...register('fromAccountId')}>
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {selectedType === 'transfer' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="From Account"
                error={errors.fromAccountId?.message}
              >
                <select className={inputClassName} {...register('fromAccountId')}>
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="To Account" error={errors.toAccountId?.message}>
                <select className={inputClassName} {...register('toAccountId')}>
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {selectedType === 'adjustment' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Direction"
                error={errors.adjustmentDirection?.message}
              >
                <select
                  className={inputClassName}
                  {...register('adjustmentDirection')}
                >
                  <option value="increase">Increase Balance</option>
                  <option value="decrease">Decrease Balance</option>
                </select>
              </FormField>
              <FormField
                label="Account"
                error={errors.adjustmentAccountId?.message}
              >
                <select
                  className={inputClassName}
                  {...register('adjustmentAccountId')}
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Reason" error={errors.categoryId?.message}>
                <select className={inputClassName} {...register('categoryId')}>
                  <option value="">Select reason</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {selectedType !== 'transfer' && categoryOptions.length === 0 ? (
            <div className="rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
              No active {getTransactionTypeLabel(selectedType).toLowerCase()}{' '}
              categories are available. Check Settings categories before saving.
            </div>
          ) : null}

          {selectedCategory ? (
            <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: selectedCategory.color }}
              >
                {renderIconByName(selectedCategory.icon, 'size-4')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {selectedCategory.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Category icon and color will appear in transaction lists.
                </p>
              </div>
            </div>
          ) : null}

          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              className={textareaControlClassName}
              placeholder="Optional note"
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
                : transaction
                  ? 'Save Changes'
                  : 'Add Transaction'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
