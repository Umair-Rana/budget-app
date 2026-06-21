import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  FormField,
  inputControlClassName as inputClassName,
  ReadOnlyField,
} from '@/components/app/form-field'
import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { Button } from '@/components/ui/button'
import {
  categoryColorOptions,
  categoryIconOptions,
  categoryTypeOptions,
  categoryTypeValues,
  defaultCategoryColor,
  getCategoryTypeLabel,
} from '@/data/display/category-options'
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/data/models/category'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

const categoryFormBaseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  type: z.enum(categoryTypeValues, {
    message: 'Type is required.',
  }),
  icon: z.string().trim().min(1, 'Icon is required.'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a valid hex color.'),
})

type CategoryFormValues = z.infer<typeof categoryFormBaseSchema>

type CategoryFormDialogProps = {
  open: boolean
  category?: Category
  categories: Category[]
  onClose: () => void
  onCreate: (input: CreateCategoryInput) => Promise<void>
  onUpdate: (id: string, input: UpdateCategoryInput) => Promise<void>
}

function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase()
}

function createCategoryFormSchema(categories: Category[], category?: Category) {
  return categoryFormBaseSchema.superRefine((values, context) => {
    const duplicate = categories.find(
      (existingCategory) =>
        existingCategory.id !== category?.id &&
        !existingCategory.archivedAt &&
        !existingCategory.deletedAt &&
        existingCategory.type === values.type &&
        normalizeCategoryName(existingCategory.name) ===
          normalizeCategoryName(values.name),
    )

    if (duplicate) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'An active category with this name already exists for this type.',
      })
    }
  })
}

function getDefaultValues(category?: Category): CategoryFormValues {
  return {
    name: category?.name ?? '',
    type: category?.type ?? 'expense',
    icon: category?.icon ?? 'shopping-basket',
    color: category?.color ?? defaultCategoryColor,
  }
}

export function CategoryFormDialog({
  categories,
  category,
  onClose,
  onCreate,
  onUpdate,
  open,
}: CategoryFormDialogProps) {
  const formSchema = useMemo(
    () => createCategoryFormSchema(categories, category),
    [categories, category],
  )
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(category),
  })
  const selectedColor =
    useWatch({ control, name: 'color' }) ?? defaultCategoryColor
  const selectedIcon =
    useWatch({ control, name: 'icon' }) ?? 'shopping-basket'
  const isDefaultCategory = Boolean(category?.isDefault)

  useEffect(() => {
    reset(getDefaultValues(category))
  }, [category, open, reset])

  if (!open) {
    return null
  }

  async function submitForm(values: CategoryFormValues) {
    const normalizedValues: CreateCategoryInput = {
      name: values.name.trim(),
      type: category?.isDefault ? category.type : values.type,
      icon: values.icon.trim(),
      color: values.color.trim(),
    }

    if (category) {
      await onUpdate(category.id, normalizedValues)
    } else {
      await onCreate(normalizedValues)
    }
  }

  return (
    <ModalDialogShell
      id="category-form-title"
      title={category ? 'Edit Category' : 'Add Category'}
      description="Categories are local records prepared for future finance forms."
      maxWidthClassName="sm:max-w-xl"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitForm)}>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ backgroundColor: selectedColor }}
            >
              {renderIconByName(selectedIcon, 'size-5')}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Preview</p>
              <p className="text-xs text-muted-foreground">
                Icon and color are used in lists and future transaction forms.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" error={errors.name?.message}>
              <input
                className={inputClassName}
                placeholder="Category name"
                {...register('name')}
              />
            </FormField>

            <FormField label="Type" error={errors.type?.message}>
              {isDefaultCategory ? (
                <>
                  <input type="hidden" {...register('type')} />
                  <ReadOnlyField className="text-foreground">
                    {category ? getCategoryTypeLabel(category.type) : ''}
                  </ReadOnlyField>
                </>
              ) : (
                <select className={inputClassName} {...register('type')}>
                  {categoryTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Icon" error={errors.icon?.message}>
              <select className={inputClassName} {...register('icon')}>
                {categoryIconOptions.map((option) => (
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
                  aria-label="Category color"
                  {...register('color')}
                />
                <input
                  className={cn(inputClassName, 'font-mono')}
                  list="category-color-options"
                  {...register('color')}
                />
              </div>
              <datalist id="category-color-options">
                {categoryColorOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  />
                ))}
              </datalist>
            </FormField>
          </div>

          {isDefaultCategory ? (
            <div className="rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-sm leading-6 text-muted-foreground">
              This is a default category. Name, icon, and color can be adjusted,
              but the type is locked so future finance workflows stay stable.
            </div>
          ) : null}

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
                : category
                  ? 'Save Changes'
                  : 'Add Category'}
            </Button>
          </ModalDialogActions>
        </form>
    </ModalDialogShell>
  )
}
