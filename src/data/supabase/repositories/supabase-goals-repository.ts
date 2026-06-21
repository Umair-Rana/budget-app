import type {
  GoalMovementResult,
  GoalsRepositoryContract,
} from '@/data/contracts'
import type {
  AddGoalContributionInput,
  CreateGoalInput,
  Goal,
  UpdateGoalInput,
  WithdrawFromGoalInput,
} from '@/data/models/goal'
import { createRecordId, createTimestamp } from '@/data/models/common'
import { RepositoryRecordNotFoundError } from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import { fromSupabaseGoalRow } from '@/data/supabase/mappers/goal-mapper'
import { fromSupabaseTransactionRow } from '@/data/supabase/mappers/transaction-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import { throwSupabaseRepositoryError } from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type {
  GoalRow,
  TransactionRow,
} from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type GoalTableRow = Database['public']['Tables']['goals']['Row']

type SupabaseRpcResult = {
  data: unknown
  error: unknown
}

type SupabaseRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<SupabaseRpcResult>
}

type GoalMovementRpcPayload = {
  goal?: unknown
  transaction?: unknown
}

function goalStatusForAmount(
  goal: Pick<Goal, 'currentAmount' | 'targetAmount'>,
) {
  return goal.currentAmount >= goal.targetAmount ? 'completed' : 'active'
}

function withCurrentGoalStatus(goal: Goal): Goal {
  if (goal.archivedAt || goal.status === 'archived') {
    return {
      ...goal,
      status: 'archived',
    }
  }

  return {
    ...goal,
    status: goalStatusForAmount(goal),
  }
}

function mapGoalRow(row: GoalTableRow): Goal {
  return withCurrentGoalStatus(fromSupabaseGoalRow(row as GoalRow))
}

function normalizeRpcGoalData(operation: string, data: unknown): GoalTableRow {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throwSupabaseRepositoryError(operation, {
      message: 'No goal row was returned.',
    })
  }

  return row as GoalTableRow
}

function normalizeRpcGoalMovementData(
  operation: string,
  data: unknown,
): GoalMovementResult {
  const payload = data as GoalMovementRpcPayload

  if (
    !payload ||
    typeof payload !== 'object' ||
    !payload.goal ||
    !payload.transaction
  ) {
    throwSupabaseRepositoryError(operation, {
      message: 'No goal movement payload was returned.',
    })
  }

  return {
    goal: mapGoalRow(payload.goal as GoalTableRow),
    transaction: fromSupabaseTransactionRow(
      payload.transaction as TransactionRow,
    ),
  }
}

async function callGoalRpc(
  context: SupabaseFinanceRepositoryContext,
  operation: string,
  functionName: string,
  args: Record<string, unknown>,
) {
  const rpcClient = context.client as unknown as SupabaseRpcClient
  const { data, error } = await rpcClient.rpc(functionName, args)

  if (error) {
    throwSupabaseRepositoryError(operation, error)
  }

  return mapGoalRow(normalizeRpcGoalData(operation, data))
}

async function callGoalMovementRpc(
  context: SupabaseFinanceRepositoryContext,
  operation: string,
  functionName: string,
  args: Record<string, unknown>,
) {
  const rpcClient = context.client as unknown as SupabaseRpcClient
  const { data, error } = await rpcClient.rpc(functionName, args)

  if (error) {
    throwSupabaseRepositoryError(operation, error)
  }

  return normalizeRpcGoalMovementData(operation, data)
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}

function mergeGoalInput(current: Goal, input: UpdateGoalInput): CreateGoalInput {
  return {
    name: input.name ?? current.name,
    targetAmount: input.targetAmount ?? current.targetAmount,
    currentAmount: input.currentAmount ?? current.currentAmount,
    targetDate: 'targetDate' in input ? input.targetDate : current.targetDate,
    priority: input.priority ?? current.priority,
    icon: 'icon' in input ? input.icon : current.icon,
    color: 'color' in input ? input.color : current.color,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

async function getSupabaseGoalById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('goals')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('id', id)

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null)
  }

  if (!options?.includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throwSupabaseRepositoryError('goals.getById', error)
  }

  return data ? mapGoalRow(data) : undefined
}

async function requireSupabaseGoal(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const goal = await getSupabaseGoalById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!goal) {
    throw new RepositoryRecordNotFoundError('Goal', id)
  }

  return goal
}

export const supabaseGoalsRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async create() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async update() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async archive() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async deleteSoft() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async addContribution() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async withdraw() {
    return throwInactiveSupabaseFinanceRepository()
  },
} satisfies GoalsRepositoryContract

export function createSupabaseGoalsRepository(
  input: SupabaseFinanceRepositoryContextInput,
): GoalsRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('goals')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('target_date', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      if (error) {
        throwSupabaseRepositoryError('goals.getAll', error)
      }

      return (data ?? []).map(mapGoalRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseGoalById(context, id, options)
    },

    async create(input: CreateGoalInput) {
      const now = createTimestamp()

      return callGoalRpc(context, 'goals.create', 'create_finance_goal', {
        p_household_id: context.householdId,
        p_goal_id: createRecordId(),
        p_name: input.name,
        p_target_amount: input.targetAmount,
        p_current_amount: input.currentAmount,
        p_target_date: normalizeOptional(input.targetDate) ?? null,
        p_priority: input.priority,
        p_icon: normalizeOptional(input.icon) ?? null,
        p_color: normalizeOptional(input.color) ?? null,
        p_notes: normalizeNotes(input.notes) ?? null,
        p_created_at: now,
        p_updated_at: now,
      })
    },

    async update(id: string, input: UpdateGoalInput) {
      const current = await requireSupabaseGoal(context, id)
      const merged = mergeGoalInput(current, input)

      return callGoalRpc(context, 'goals.update', 'update_finance_goal', {
        p_household_id: context.householdId,
        p_goal_id: id,
        p_name: merged.name,
        p_target_amount: merged.targetAmount,
        p_current_amount: merged.currentAmount,
        p_target_date: normalizeOptional(merged.targetDate) ?? null,
        p_priority: merged.priority,
        p_icon: normalizeOptional(merged.icon) ?? null,
        p_color: normalizeOptional(merged.color) ?? null,
        p_notes: normalizeNotes(merged.notes) ?? null,
        p_updated_at: createTimestamp(),
      })
    },

    async archive(id: string) {
      return callGoalRpc(context, 'goals.archive', 'archive_finance_goal', {
        p_household_id: context.householdId,
        p_goal_id: id,
        p_updated_at: createTimestamp(),
      })
    },

    async deleteSoft(id: string) {
      return callGoalRpc(
        context,
        'goals.deleteSoft',
        'delete_finance_goal_soft',
        {
          p_household_id: context.householdId,
          p_goal_id: id,
          p_updated_at: createTimestamp(),
        },
      )
    },

    async addContribution(id: string, input: AddGoalContributionInput) {
      return callGoalMovementRpc(
        context,
        'goals.addContribution',
        'goal_contribute',
        {
          p_household_id: context.householdId,
          p_goal_id: id,
          p_transaction_id: createRecordId(),
          p_amount: input.amount,
          p_source_account_id: input.sourceAccountId,
          p_date: input.date,
          p_notes: normalizeNotes(input.notes) ?? null,
          p_updated_at: createTimestamp(),
        },
      )
    },

    async withdraw(id: string, input: WithdrawFromGoalInput) {
      return callGoalMovementRpc(context, 'goals.withdraw', 'goal_withdraw', {
        p_household_id: context.householdId,
        p_goal_id: id,
        p_transaction_id: createRecordId(),
        p_amount: input.amount,
        p_destination_account_id: input.destinationAccountId,
        p_date: input.date,
        p_notes: normalizeNotes(input.notes) ?? null,
        p_updated_at: createTimestamp(),
      })
    },
  }
}
