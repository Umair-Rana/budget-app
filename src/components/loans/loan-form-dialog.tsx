import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  FormField,
  inputControlClassName,
  ReadOnlyField,
  textareaControlClassName,
} from '@/components/app/form-field'
import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { Button } from '@/components/ui/button'
import { loanTypeOptions, loanTypeValues } from '@/data/display/loan-options'
import type { Account } from '@/data/models/account'
import type {
  CreateLoanInput,
  Loan,
  UpdateLoanInput,
} from '@/data/models/loan'
import { formatPkr } from '@/lib/formatting'

const loanFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Loan name is required.'),
    type: z.enum(loanTypeValues, {
      message: 'Loan type is required.',
    }),
    counterparty: z.string().trim().optional(),
    principalAmount: z
      .number({ message: 'Principal amount must be a valid number.' })
      .finite('Principal amount must be a valid number.')
      .positive('Principal amount must be greater than 0.'),
    sourceAccountId: z.string().trim().optional(),
    receivingAccountId: z.string().trim().optional(),
    dueDate: z.string().trim().optional(),
    interestRate: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.type === 'given' && !values.sourceAccountId) {
      context.addIssue({
        code: 'custom',
        path: ['sourceAccountId'],
        message: 'Loan given requires a source account.',
      })
    }

    if (values.type === 'taken' && !values.receivingAccountId) {
      context.addIssue({
        code: 'custom',
        path: ['receivingAccountId'],
        message: 'Loan taken requires a receiving account.',
      })
    }

    if (values.interestRate) {
      const rate = Number(values.interestRate)

      if (!Number.isFinite(rate) || rate < 0) {
        context.addIssue({
          code: 'custom',
          path: ['interestRate'],
          message: 'Interest rate cannot be negative.',
        })
      }
    }
  })

type LoanFormValues = z.infer<typeof loanFormSchema>

type LoanFormDialogProps = {
  open: boolean
  loan?: Loan
  accounts: Account[]
  financialDetailsLocked?: boolean
  onClose: () => void
  onCreate: (input: CreateLoanInput) => Promise<void>
  onUpdate: (id: string, input: UpdateLoanInput) => Promise<void>
}

function getDefaultValues(loan?: Loan): LoanFormValues {
  return {
    name: loan?.name ?? '',
    type: loan?.type ?? 'given',
    counterparty: loan?.counterparty ?? '',
    principalAmount: loan?.principalAmount ?? 0,
    sourceAccountId: loan?.sourceAccountId ?? '',
    receivingAccountId: loan?.receivingAccountId ?? '',
    dueDate: loan?.dueDate ?? '',
    interestRate:
      loan?.interestRate === undefined ? '' : String(loan.interestRate),
    notes: loan?.notes ?? '',
  }
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}

function normalizeInterestRate(value: string | undefined) {
  const normalized = normalizeOptional(value)

  return normalized ? Number(normalized) : undefined
}

function getAccountName(accounts: Account[], accountId?: string) {
  return accounts.find((account) => account.id === accountId)?.name ?? 'Account'
}

export function LoanFormDialog({
  accounts,
  financialDetailsLocked,
  loan,
  onClose,
  onCreate,
  onUpdate,
  open,
}: LoanFormDialogProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: getDefaultValues(loan),
  })
  const selectedType = useWatch({ control, name: 'type' }) ?? 'given'
  const accountFieldName =
    selectedType === 'given' ? 'sourceAccountId' : 'receivingAccountId'
  const accountLabel =
    selectedType === 'given' ? 'Source account' : 'Receiving account'
  const lockedAccountId =
    selectedType === 'given' ? loan?.sourceAccountId : loan?.receivingAccountId

  useEffect(() => {
    reset(getDefaultValues(loan))
  }, [loan, open, reset])

  if (!open) {
    return null
  }

  async function submitForm(values: LoanFormValues) {
    const input: CreateLoanInput = {
      name: values.name.trim(),
      type: values.type,
      counterparty: normalizeOptional(values.counterparty),
      principalAmount: financialDetailsLocked && loan
        ? loan.principalAmount
        : values.principalAmount,
      interestRate: normalizeInterestRate(values.interestRate),
      dueDate: normalizeOptional(values.dueDate),
      sourceAccountId:
        values.type === 'given'
          ? financialDetailsLocked && loan
            ? loan.sourceAccountId
            : values.sourceAccountId
          : undefined,
      receivingAccountId:
        values.type === 'taken'
          ? financialDetailsLocked && loan
            ? loan.receivingAccountId
            : values.receivingAccountId
          : undefined,
      notes: normalizeOptional(values.notes),
    }

    if (loan) {
      await onUpdate(loan.id, input)
    } else {
      await onCreate(input)
    }
  }

  return (
    <ModalDialogShell
      id="loan-form-title"
      title={loan ? 'Edit Loan' : 'Add Loan'}
      description="Loan movements are linked transfers and do not count as income or expense."
      maxWidthClassName="sm:max-w-2xl"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Loan name" error={errors.name?.message}>
            <input
              className={inputControlClassName}
              placeholder="Family loan"
              {...register('name')}
            />
          </FormField>

          <FormField label="Loan type" error={errors.type?.message}>
            {financialDetailsLocked && loan ? (
              <>
                <input type="hidden" {...register('type')} />
                <ReadOnlyField>
                  {loan.type === 'given' ? 'Loan Given' : 'Loan Taken'}
                </ReadOnlyField>
              </>
            ) : (
              <select className={inputControlClassName} {...register('type')}>
                {loanTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField
            label="Counterparty"
            error={errors.counterparty?.message}
          >
            <input
              className={inputControlClassName}
              placeholder="Optional person or organization"
              {...register('counterparty')}
            />
          </FormField>

          <FormField
            label="Principal amount"
            error={errors.principalAmount?.message}
          >
            {financialDetailsLocked && loan ? (
              <>
                <input
                  type="hidden"
                  {...register('principalAmount', { valueAsNumber: true })}
                />
                <ReadOnlyField>{formatPkr(loan.principalAmount)}</ReadOnlyField>
              </>
            ) : (
              <input
                type="number"
                step="1"
                min="0"
                inputMode="decimal"
                className={inputControlClassName}
                {...register('principalAmount', { valueAsNumber: true })}
              />
            )}
          </FormField>

          <FormField
            label={accountLabel}
            error={
              selectedType === 'given'
                ? errors.sourceAccountId?.message
                : errors.receivingAccountId?.message
            }
          >
            {financialDetailsLocked && loan ? (
              <>
                <input type="hidden" {...register(accountFieldName)} />
                <ReadOnlyField>
                  {getAccountName(accounts, lockedAccountId)}
                </ReadOnlyField>
              </>
            ) : (
              <select
                className={inputControlClassName}
                {...register(accountFieldName)}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label="Due date" error={errors.dueDate?.message}>
            <input
              type="date"
              className={inputControlClassName}
              {...register('dueDate')}
            />
          </FormField>

          <FormField
            label="Interest rate"
            error={errors.interestRate?.message}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className={inputControlClassName}
              placeholder="Optional %"
              {...register('interestRate')}
            />
          </FormField>
        </div>

        {financialDetailsLocked ? (
          <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
            This loan has linked movements. Reverse or delete linked movements
            before editing financial details.
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
            {isSubmitting ? 'Saving...' : loan ? 'Save Changes' : 'Add Loan'}
          </Button>
        </ModalDialogActions>
      </form>
    </ModalDialogShell>
  )
}
