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
import { budgetGroupOptions } from '@/data/display/budget-options'
import type {
  BudgetAllocation,
  CreateBudgetAllocationInput,
  UpdateBudgetAllocationInput,
} from '@/data/models/budget'
import type { Category } from '@/data/models/category'

const budgetGroupValues = [
  'needs',
  'wants',
  'savings',
  'loans',
  'custom',
] as const

const budgetFormSchema = z.object({
  month: z.string().trim().min(1, 'Month is required.'),
  categoryId: z.string().trim().min(1, 'Expense category is required.'),
  plannedAmount: z
    .number({ message: 'Planned amount must be a valid number.' })
    .finite('Planned amount must be a valid number.')
    .min(0, 'Planned amount must be greater than or equal to 0.'),
  group: z.union([z.enum(budgetGroupValues), z.literal('')]).optional(),
  notes: z.string().trim().optional(),
})

type BudgetFormValues = z.infer<typeof budgetFormSchema>

type BudgetFormDialogProps = {
  open: boolean
  budget?: BudgetAllocation
  expenseCategories: Category[]
  initialCategoryId?: string
  month: string
  onClose: () => void
  onCreate: (input: CreateBudgetAllocationInput) => Promise<void>
  onUpdate: (id: string, input: UpdateBudgetAllocationInput) => Promise<void>
}

function getDefaultValues({
  budget,
  initialCategoryId,
  month,
}: {
  budget?: BudgetAllocation
  initialCategoryId?: string
  month: string
}): BudgetFormValues {
  return {
    month: budget?.month ?? month,
    categoryId: budget?.categoryId ?? initialCategoryId ?? '',
    plannedAmount: budget?.plannedAmount ?? 0,
    group: budget?.group ?? '',
    notes: budget?.notes ?? '',
  }
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

export function BudgetFormDialog({
  budget,
  expenseCategories,
  initialCategoryId,
  month,
  onClose,
  onCreate,
  onUpdate,
  open,
}: BudgetFormDialogProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: getDefaultValues({ budget, initialCategoryId, month }),
  })

  useEffect(() => {
    reset(getDefaultValues({ budget, initialCategoryId, month }))
  }, [budget, initialCategoryId, month, open, reset])

  if (!open) {
    return null
  }

  async function submitForm(values: BudgetFormValues) {
    const input: CreateBudgetAllocationInput = {
      month: values.month,
      categoryId: values.categoryId,
      plannedAmount: values.plannedAmount,
      group: values.group || undefined,
      notes: normalizeNotes(values.notes),
    }

    if (budget) {
      await onUpdate(budget.id, input)
    } else {
      await onCreate(input)
    }
  }

  return (
    <ModalDialogShell
      id="budget-form-title"
      title={budget ? 'Edit Budget Allocation' : 'Add Budget Category'}
      description="Plan one expense category for a specific month."
      maxWidthClassName="sm:max-w-2xl"
      closeDisabled={isSubmitting}
      onClose={onClose}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Month" error={errors.month?.message}>
            <input
              type="month"
              className={inputControlClassName}
              {...register('month')}
            />
          </FormField>

          <FormField
            label="Expense category"
            error={errors.categoryId?.message}
          >
            <select className={inputControlClassName} {...register('categoryId')}>
              <option value="">Select category</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Planned amount"
            error={errors.plannedAmount?.message}
          >
            <input
              type="number"
              step="1"
              min="0"
              inputMode="decimal"
              className={inputControlClassName}
              {...register('plannedAmount', { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Group" error={errors.group?.message}>
            <select className={inputControlClassName} {...register('group')}>
              <option value="">No group</option>
              {budgetGroupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {expenseCategories.length === 0 ? (
          <div className="rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
            No active expense categories are available. Review Settings before
            planning budgets.
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
            {isSubmitting
              ? 'Saving...'
              : budget
                ? 'Save Changes'
                : 'Add Budget Category'}
          </Button>
        </ModalDialogActions>
      </form>
    </ModalDialogShell>
  )
}
