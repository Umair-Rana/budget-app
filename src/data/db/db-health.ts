import { getFinanceDb } from '@/data/db/finance-db'
import { createRecordId, createTimestamp } from '@/data/models/common'

export type DbHealthCheckResult =
  | {
      ok: true
      checkedAt: string
    }
  | {
      ok: false
      checkedAt: string
      message: string
    }

function toHealthMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'IndexedDB is unavailable.'
}

export async function runFinanceDbHealthCheck(): Promise<DbHealthCheckResult> {
  const checkedAt = createTimestamp()

  try {
    const db = await getFinanceDb()
    const testKey = `health-check-${createRecordId()}`
    const testRecord = {
      key: testKey,
      value: 'ok',
      updatedAt: checkedAt,
    }

    await db.put('metadata', testRecord)

    const savedRecord = await db.get('metadata', testKey)
    await db.delete('metadata', testKey)

    if (savedRecord?.value !== 'ok') {
      return {
        ok: false,
        checkedAt,
        message: 'IndexedDB opened, but the health check record was not readable.',
      }
    }

    return {
      ok: true,
      checkedAt,
    }
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      message: toHealthMessage(error),
    }
  }
}
