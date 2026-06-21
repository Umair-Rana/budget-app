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
import {
  accountIconOptions,
  accountTypeOptions,
  accountTypeValues,
  defaultAccountColor,
} from '@/data/display/account-options'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/data/models/account'
import { cn } from '@/lib/utils'

const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  type: z.enum(accountTypeValues, {
    message: 'Type is required.',
  }),
  icon: z.string().trim().min(1, 'Icon is required.'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a valid hex color.'),
  currency: z.literal('PKR'),
  openingBalance: z
    .number({ message: 'Opening balance must be a valid number.' })
    .finite('Opening balance must be a valid number.'),
  notes: z.string().trim().optional(),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

type AccountFormDialogProps = {
  open: boolean
  account?: Account
  onClose: () => void
  onCreate: (input: CreateAccountInput) => Promise<void>
  onUpdate: (id: string, input: UpdateAccountInput) => Promise<void>
}

function getDefaultValues(account?: Account): AccountFormValues {
  return {
    name: account?.name ?? '',
    type: account?.type ?? 'bank',
    icon: account?.icon ?? 'wallet-cards',
    color: account?.color ?? defaultAccountColor,
    currency: account?.currency ?? 'PKR',
    openingBalance: account?.openingBalance ?? 0,
    notes: account?.notes ?? '',
  }
}

export function AccountFormDialog({
  open,
  account,
  onClose,
  onCreate,
  onUpdate,
}: AccountFormDialogProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: getDefaultValues(account),
  })

  useEffect(() => {
    reset(getDefaultValues(account))
  }, [account, open, reset])

  if (!open) {
    return null
  }

  async function submitForm(values: AccountFormValues) {
    const normalizedValues = {
      ...values,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    }

    if (account) {
      await onUpdate(account.id, normalizedValues)
    } else {
      await onCreate(normalizedValues)
    }
  }

  return (
    <ModalDialogShell
      id="account-form-title"
      title={account ? 'Edit Account' : 'Add Account'}
      description="Current balance reflects opening balance and saved transaction impact."
      maxWidthClassName="sm:max-w-2xl"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" error={errors.name?.message}>
              <input
                className={inputClassName}
                placeholder="Account name"
                {...register('name')}
              />
            </FormField>

            <FormField label="Type" error={errors.type?.message}>
              <select className={inputClassName} {...register('type')}>
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Icon" error={errors.icon?.message}>
              <select className={inputClassName} {...register('icon')}>
                {accountIconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Color" error={errors.color?.message}>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 rounded-md border bg-background p-1"
                  aria-label="Account color"
                  {...register('color')}
                />
                <input
                  className={cn(inputClassName, 'font-mono')}
                  {...register('color')}
                />
              </div>
            </FormField>

            <FormField label="Currency" error={errors.currency?.message}>
              <select className={inputClassName} {...register('currency')}>
                <option value="PKR">PKR</option>
              </select>
            </FormField>

            <FormField
              label="Opening Balance"
              error={errors.openingBalance?.message}
            >
              <input
                type="number"
                step="1"
                inputMode="decimal"
                className={inputClassName}
                {...register('openingBalance', { valueAsNumber: true })}
              />
            </FormField>
          </div>

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
              {isSubmitting ? 'Saving...' : account ? 'Save Changes' : 'Add Account'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
