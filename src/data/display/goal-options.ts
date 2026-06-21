import type { GoalPriority, GoalStatus } from '@/data/models/goal'

export type GoalPriorityOption = {
  value: GoalPriority
  label: string
}

export type GoalStatusOption = {
  value: GoalStatus
  label: string
}

export type GoalIconOption = {
  value: string
  label: string
}

export type GoalColorOption = {
  value: string
  label: string
}

export const goalPriorityValues = ['low', 'medium', 'high'] as const

export const goalPriorityOptions: GoalPriorityOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const goalStatusOptions: GoalStatusOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export const goalIconOptions: GoalIconOption[] = [
  { value: '', label: 'No icon' },
  { value: 'piggy-bank', label: 'Piggy bank' },
  { value: 'home', label: 'Home' },
  { value: 'gift', label: 'Gift' },
  { value: 'graduation-cap', label: 'Education' },
  { value: 'heart-pulse', label: 'Health' },
  { value: 'landmark', label: 'Bank' },
  { value: 'sparkles', label: 'Special' },
  { value: 'trending-up', label: 'Growth' },
  { value: 'wallet-cards', label: 'Wallet' },
]

export const defaultGoalColor = '#047857'

export const goalColorOptions: GoalColorOption[] = [
  { value: '#047857', label: 'Emerald' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#d97706', label: 'Amber' },
  { value: '#be123c', label: 'Rose' },
  { value: '#0f766e', label: 'Teal' },
]

export function getGoalPriorityLabel(priority: GoalPriority) {
  return (
    goalPriorityOptions.find((option) => option.value === priority)?.label ??
    priority
  )
}

export function getGoalStatusLabel(status: GoalStatus) {
  return (
    goalStatusOptions.find((option) => option.value === status)?.label ?? status
  )
}
