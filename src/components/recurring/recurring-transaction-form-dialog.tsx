import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  getTodayDateString,
  recurringTransactionFrequencyValues,
} from '@/data/domain/recurring-transactions'
import type { Account } from '@/data/models/account'
import type { Category, CategoryType } from '@/data/models/category'
import type {
  CreateRecurringTransactionInput,
  RecurringTransaction,
  RecurringTransactionType,
  UpdateRecurringTransactionInput,
} from '@/data/models/recurring-transaction'
import { getTransactionTypeLabel } from '@/data/display/transaction-options'

const recurringTransactionTypeValues = ['income', 'expense', 'transfer'] as const

const recurringTransactionSchema = z
  .object({
    type: z.enum(recurringTransactionTypeValues, {
      message: 'Type is required.',
    }),
    name: z.string().trim().min(1, 'Name is required.'),
    amount: z
      .number({ message: 'Amount must be a valid number.' })
      .finite('Amount must be a valid number.')
      .positive('Amount must be greater than 0.'),
    categoryId: z.string().optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    frequency: z.enum(recurringTransactionFrequencyValues, {
      message: 'Frequency is required.',
    }),
    interval: z
      .number({ message: 'Interval must be a valid number.' })
      .int('Interval must be a whole number.')
      .min(1, 'Interval must be at least 1.'),
    startDate: z.string().trim().min(1, 'Start date is required.'),
    nextRunDate: z.string().trim().min(1, 'Next run date is required.'),
    endDate: z.string().optional(),
    isActive: z.boolean(),
    notes: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.endDate && values.endDate < values.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date cannot be before start date.',
      })
    }

    if (values.nextRunDate < values.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['nextRunDate'],
        message: 'Next run date cannot be before start date.',
      })
    }

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
  })

type RecurringTransactionFormValues = z.infer<
  typeof recurringTransactionSchema
>

type RecurringTransactionFormDialogProps = {
  open: boolean
  recurringTransaction?: RecurringTransaction
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onCreate: (input: CreateRecurringTransactionInput) => Promise<void>
  onUpdate: (id: string, input: UpdateRecurringTransactionInput) => Promise<void>
}

function optionalValue(value: string | undefined) {
  return value?.trim() ? value : undefined
}

function getDefaultValues(
  recurringTransaction?: RecurringTransaction,
): RecurringTransactionFormValues {
  const today = getTodayDateString()

  return {
    type: recurringTransaction?.type ?? 'expense',
    name: recurringTransaction?.name ?? '',
    amount: recurringTransaction?.amount ?? 0,
    categoryId: recurringTransaction?.categoryId ?? '',
    fromAccountId: recurringTransaction?.fromAccountId ?? '',
    toAccountId: recurringTransaction?.toAccountId ?? '',
    frequency: recurringTransaction?.frequency ?? 'monthly',
    interval: recurringTransaction?.interval ?? 1,
    startDate: recurringTransaction?.startDate ?? today,
    nextRunDate: recurringTransaction?.nextRunDate ?? today,
    endDate: recurringTransaction?.endDate ?? '',
    isActive: recurringTransaction?.isActive ?? true,
    notes: recurringTransaction?.notes ?? '',
  }
}

function categoryTypeForRecurring(
  type: RecurringTransactionType,
): CategoryType | undefined {
  return type === 'transfer' ? undefined : type
}

function buildRecurringTransactionInput(
  values: RecurringTransactionFormValues,
): CreateRecurringTransactionInput {
  const common = {
    type: values.type,
    name: values.name,
    amount: values.amount,
    frequency: values.frequency,
    interval: values.interval,
    startDate: values.startDate,
    nextRunDate: values.nextRunDate,
    endDate: optionalValue(values.endDate),
    isActive: values.isActive,
    notes: optionalValue(values.notes),
  }

  if (values.type === 'income') {
    return {
      ...common,
      categoryId: optionalValue(values.categoryId),
      fromAccountId: undefined,
      toAccountId: optionalValue(values.toAccountId),
    }
  }

  if (values.type === 'expense') {
    return {
      ...common,
      categoryId: optionalValue(values.categoryId),
      fromAccountId: optionalValue(values.fromAccountId),
      toAccountId: undefined,
    }
  }

  return {
    ...common,
    categoryId: undefined,
    fromAccountId: optionalValue(values.fromAccountId),
    toAccountId: optionalValue(values.toAccountId),
  }
}

function frequencyLabel(frequency: string) {
  return frequency[0].toUpperCase() + frequency.slice(1)
}

export function RecurringTransactionFormDialog({
  accounts,
  categories,
  onClose,
  onCreate,
  onUpdate,
  open,
  recurringTransaction,
}: RecurringTransactionFormDialogProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: getDefaultValues(recurringTransaction),
  })
  const selectedType = useWatch({ control, name: 'type' }) ?? 'expense'
  const selectedCategoryType = categoryTypeForRecurring(selectedType)
  const categoryOptions = useMemo(
    () =>
      selectedCategoryType
        ? categories.filter((category) => category.type === selectedCategoryType)
        : [],
    [categories, selectedCategoryType],
  )

  useEffect(() => {
    reset(getDefaultValues(recurringTransaction))
  }, [open, recurringTransaction, reset])

  if (!open) {
    return null
  }

  async function submitForm(values: RecurringTransactionFormValues) {
    const input = buildRecurringTransactionInput(values)

    if (recurringTransaction) {
      await onUpdate(recurringTransaction.id, input)
    } else {
      await onCreate(input)
    }
  }

  return (
    <ModalDialogShell
      id="recurring-transaction-form-title"
      title={
        recurringTransaction
          ? 'Edit Recurring Transaction'
          : 'Add Recurring Transaction'
      }
      description="Due rules generate normal transactions when you run generation."
      maxWidthClassName="sm:max-w-2xl"
      closeDisabled={isSubmitting}
      onClose={onClose}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Type" error={errors.type?.message}>
            <select
              className={inputControlClassName}
              {...register('type', {
                onChange: () => {
                  setValue('categoryId', '')
                  setValue('fromAccountId', '')
                  setValue('toAccountId', '')
                },
              })}
            >
              {recurringTransactionTypeValues.map((type) => (
                <option key={type} value={type}>
                  {getTransactionTypeLabel(type)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Name" error={errors.name?.message}>
            <input
              className={inputControlClassName}
              placeholder="Salary, Rent, Subscription"
              {...register('name')}
            />
          </FormField>

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
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <FormField label="Frequency" error={errors.frequency?.message}>
            <select
              className={inputControlClassName}
              {...register('frequency')}
            >
              {recurringTransactionFrequencyValues.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequencyLabel(frequency)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Every" error={errors.interval?.message}>
            <input
              type="number"
              step="1"
              min="1"
              className={inputControlClassName}
              {...register('interval', { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Start Date" error={errors.startDate?.message}>
            <input
              type="date"
              className={inputControlClassName}
              {...register('startDate')}
            />
          </FormField>

          <FormField label="Next Run" error={errors.nextRunDate?.message}>
            <input
              type="date"
              className={inputControlClassName}
              {...register('nextRunDate')}
            />
          </FormField>
        </div>

        {selectedType === 'income' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Income Category" error={errors.categoryId?.message}>
              <select className={inputControlClassName} {...register('categoryId')}>
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="To Account" error={errors.toAccountId?.message}>
              <select className={inputControlClassName} {...register('toAccountId')}>
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
              <select className={inputControlClassName} {...register('categoryId')}>
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
              <select
                className={inputControlClassName}
                {...register('fromAccountId')}
              >
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
              <select
                className={inputControlClassName}
                {...register('fromAccountId')}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="To Account" error={errors.toAccountId?.message}>
              <select className={inputControlClassName} {...register('toAccountId')}>
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

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <FormField label="End Date" error={errors.endDate?.message}>
            <input
              type="date"
              className={inputControlClassName}
              {...register('endDate')}
            />
          </FormField>
          <label className="flex min-h-10 items-center gap-2 self-end rounded-md border bg-background px-3 text-sm text-foreground shadow-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...register('isActive')}
            />
            Active
          </label>
        </div>

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
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : recurringTransaction
                ? 'Save Changes'
                : 'Add Recurring'}
          </Button>
        </ModalDialogActions>
      </form>
    </ModalDialogShell>
  )
}
