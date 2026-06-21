import type { CreateCategoryInput } from '@/data/models/category'

export type DefaultCategorySeed = CreateCategoryInput & {
  defaultKey: string
}

function defaultCategory(
  defaultKey: string,
  category: CreateCategoryInput,
): DefaultCategorySeed {
  return {
    defaultKey,
    ...category,
  }
}

export const defaultCategories: DefaultCategorySeed[] = [
  defaultCategory('income-salary', {
    name: 'Salary',
    type: 'income',
    icon: 'banknote',
    color: '#16a34a',
  }),
  defaultCategory('income-bonus', {
    name: 'Bonus',
    type: 'income',
    icon: 'sparkles',
    color: '#22c55e',
  }),
  defaultCategory('income-freelance', {
    name: 'Freelance',
    type: 'income',
    icon: 'briefcase',
    color: '#14b8a6',
  }),
  defaultCategory('income-gift', {
    name: 'Gift',
    type: 'income',
    icon: 'gift',
    color: '#84cc16',
  }),
  defaultCategory('income-investment-return', {
    name: 'Investment Return',
    type: 'income',
    icon: 'trending-up',
    color: '#0d9488',
  }),
  defaultCategory('income-other-income', {
    name: 'Other Income',
    type: 'income',
    icon: 'circle-plus',
    color: '#65a30d',
  }),
  defaultCategory('expense-food', {
    name: 'Food',
    type: 'expense',
    icon: 'utensils',
    color: '#f97316',
  }),
  defaultCategory('expense-groceries', {
    name: 'Groceries',
    type: 'expense',
    icon: 'shopping-basket',
    color: '#ea580c',
  }),
  defaultCategory('expense-shopping', {
    name: 'Shopping',
    type: 'expense',
    icon: 'shopping-bag',
    color: '#db2777',
  }),
  defaultCategory('expense-transport', {
    name: 'Transport',
    type: 'expense',
    icon: 'bus',
    color: '#2563eb',
  }),
  defaultCategory('expense-fuel', {
    name: 'Fuel',
    type: 'expense',
    icon: 'fuel',
    color: '#0891b2',
  }),
  defaultCategory('expense-rent', {
    name: 'Rent',
    type: 'expense',
    icon: 'home',
    color: '#7c3aed',
  }),
  defaultCategory('expense-utilities', {
    name: 'Utilities',
    type: 'expense',
    icon: 'bolt',
    color: '#ca8a04',
  }),
  defaultCategory('expense-internet', {
    name: 'Internet',
    type: 'expense',
    icon: 'wifi',
    color: '#0284c7',
  }),
  defaultCategory('expense-mobile', {
    name: 'Mobile',
    type: 'expense',
    icon: 'smartphone',
    color: '#4f46e5',
  }),
  defaultCategory('expense-healthcare', {
    name: 'Healthcare',
    type: 'expense',
    icon: 'heart-pulse',
    color: '#dc2626',
  }),
  defaultCategory('expense-education', {
    name: 'Education',
    type: 'expense',
    icon: 'graduation-cap',
    color: '#9333ea',
  }),
  defaultCategory('expense-entertainment', {
    name: 'Entertainment',
    type: 'expense',
    icon: 'clapperboard',
    color: '#c026d3',
  }),
  defaultCategory('expense-gifts', {
    name: 'Gifts',
    type: 'expense',
    icon: 'gift',
    color: '#e11d48',
  }),
  defaultCategory('expense-loan', {
    name: 'Loan',
    type: 'expense',
    icon: 'landmark',
    color: '#475569',
  }),
  defaultCategory('expense-other-expense', {
    name: 'Other Expense',
    type: 'expense',
    icon: 'circle-minus',
    color: '#64748b',
  }),
  defaultCategory('adjustment-opening-balance', {
    name: 'Opening Balance',
    type: 'adjustment',
    icon: 'wallet-cards',
    color: '#059669',
  }),
  defaultCategory('adjustment-correction', {
    name: 'Correction',
    type: 'adjustment',
    icon: 'pencil-ruler',
    color: '#2563eb',
  }),
  defaultCategory('adjustment-reconciliation', {
    name: 'Reconciliation',
    type: 'adjustment',
    icon: 'list-checks',
    color: '#0f766e',
  }),
  defaultCategory('adjustment-other', {
    name: 'Other',
    type: 'adjustment',
    icon: 'ellipsis',
    color: '#64748b',
  }),
]
