import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  defaultGoalColor,
  goalColorOptions,
  goalIconOptions,
  goalPriorityOptions,
  goalPriorityValues,
} from '@/data/display/goal-options'
import type {
  CreateGoalInput,
  Goal,
  UpdateGoalInput,
} from '@/data/models/goal'
import { formatPkr } from '@/lib/formatting'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Goal name is required.'),
    targetAmount: z
      .number({ message: 'Target amount must be a valid number.' })
      .finite('Target amount must be a valid number.')
      .positive('Target amount must be greater than 0.'),
    currentAmount: z
      .number({ message: 'Current amount must be a valid number.' })
      .finite('Current amount must be a valid number.')
      .min(0, 'Current amount cannot be negative.'),
    targetDate: z.string().trim().optional(),
    priority: z.enum(goalPriorityValues, {
      message: 'Priority is required.',
    }),
    icon: z.string().trim().optional(),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Use a valid hex color.')
      .optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.currentAmount > values.targetAmount) {
      context.addIssue({
        code: 'custom',
        path: ['currentAmount'],
        message: 'Current amount cannot exceed target amount.',
      })
    }
  })

type GoalFormValues = z.infer<typeof goalFormSchema>

type GoalFormDialogProps = {
  open: boolean
  goal?: Goal
  currentAmountLocked?: boolean
  onClose: () => void
  onCreate: (input: CreateGoalInput) => Promise<void>
  onUpdate: (id: string, input: UpdateGoalInput) => Promise<void>
}

function getDefaultValues(goal?: Goal): GoalFormValues {
  return {
    name: goal?.name ?? '',
    targetAmount: goal?.targetAmount ?? 0,
    currentAmount: goal?.currentAmount ?? 0,
    targetDate: goal?.targetDate ?? '',
    priority: goal?.priority ?? 'medium',
    icon: goal?.icon ?? 'piggy-bank',
    color: goal?.color ?? defaultGoalColor,
    notes: goal?.notes ?? '',
  }
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}

export function GoalFormDialog({
  currentAmountLocked,
  goal,
  onClose,
  onCreate,
  onUpdate,
  open,
}: GoalFormDialogProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: getDefaultValues(goal),
  })
  const selectedColor =
    useWatch({ control, name: 'color' }) ?? defaultGoalColor
  const selectedIcon = useWatch({ control, name: 'icon' }) ?? 'piggy-bank'
  const hasIcon = selectedIcon.trim().length > 0

  useEffect(() => {
    reset(getDefaultValues(goal))
  }, [goal, open, reset])

  const previewIcon = useMemo(
    () => (hasIcon ? renderIconByName(selectedIcon, 'size-5') : null),
    [hasIcon, selectedIcon],
  )

  if (!open) {
    return null
  }

  async function submitForm(values: GoalFormValues) {
    const input: CreateGoalInput = {
      name: values.name.trim(),
      targetAmount: values.targetAmount,
      currentAmount: values.currentAmount,
      targetDate: normalizeOptional(values.targetDate),
      priority: values.priority,
      icon: normalizeOptional(values.icon),
      color: normalizeOptional(values.color),
      notes: normalizeOptional(values.notes),
    }

    if (goal) {
      await onUpdate(goal.id, input)
    } else {
      await onCreate(input)
    }
  }

  return (
    <ModalDialogShell
      id="goal-form-title"
      title={goal ? 'Edit Goal' : 'Add Goal'}
      description="Goals track saved amounts without counting movements as income or expense."
      maxWidthClassName="sm:max-w-2xl"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
                !hasIcon && 'bg-muted text-muted-foreground',
              )}
              style={hasIcon ? { backgroundColor: selectedColor } : undefined}
            >
              {previewIcon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Preview</p>
              <p className="text-xs text-muted-foreground">
                Icon and color help distinguish goals in the list.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Goal name" error={errors.name?.message}>
              <input
                className={inputClassName}
                placeholder="Emergency fund"
                {...register('name')}
              />
            </FormField>

            <FormField label="Priority" error={errors.priority?.message}>
              <select className={inputClassName} {...register('priority')}>
                {goalPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Target amount"
              error={errors.targetAmount?.message}
            >
              <input
                type="number"
                step="1"
                min="0"
                inputMode="decimal"
                className={inputClassName}
                {...register('targetAmount', { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="Current amount"
              error={errors.currentAmount?.message}
            >
              {currentAmountLocked && goal ? (
                <>
                  <input
                    type="hidden"
                    {...register('currentAmount', { valueAsNumber: true })}
                  />
                  <ReadOnlyField>{formatPkr(goal.currentAmount)}</ReadOnlyField>
                </>
              ) : (
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="decimal"
                  className={inputClassName}
                  {...register('currentAmount', { valueAsNumber: true })}
                />
              )}
            </FormField>

            <FormField label="Target date" error={errors.targetDate?.message}>
              <input
                type="date"
                className={inputClassName}
                {...register('targetDate')}
              />
            </FormField>

            <FormField label="Icon" error={errors.icon?.message}>
              <select className={inputClassName} {...register('icon')}>
                {goalIconOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
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
                  aria-label="Goal color"
                  {...register('color')}
                />
                <input
                  className={cn(inputClassName, 'font-mono')}
                  list="goal-color-options"
                  {...register('color')}
                />
              </div>
              <datalist id="goal-color-options">
                {goalColorOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  />
                ))}
              </datalist>
            </FormField>
          </div>

          {currentAmountLocked ? (
            <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
              Current amount is controlled by linked contributions and
              withdrawals. Use those goal actions to change it.
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
              {isSubmitting ? 'Saving...' : goal ? 'Save Changes' : 'Add Goal'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
