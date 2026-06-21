import { FINANCE_DB_VERSION, getFinanceDb } from '@/data/db/finance-db'
import {
  backupAppName,
  backupVersion,
  type LocalBackupFile,
} from '@/data/backup/backup-types'
import { defaultCurrency, defaultLocale } from '@/lib/formatting'

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function createBackupFileName(now = new Date()) {
  const year = now.getFullYear()
  const month = padDatePart(now.getMonth() + 1)
  const day = padDatePart(now.getDate())
  const hours = padDatePart(now.getHours())
  const minutes = padDatePart(now.getMinutes())

  return `household-finance-backup-${year}-${month}-${day}-${hours}-${minutes}.json`
}

export async function createLocalBackup(): Promise<LocalBackupFile> {
  const db = await getFinanceDb()
  const [
    accounts,
    categories,
    transactions,
    bills,
    goals,
    loans,
    budgets,
    metadata,
  ] = await Promise.all([
    db.getAll('accounts'),
    db.getAll('categories'),
    db.getAll('transactions'),
    db.getAll('bills'),
    db.getAll('goals'),
    db.getAll('loans'),
    db.getAll('budgets'),
    db.getAll('metadata'),
  ])

  return {
    app: backupAppName,
    backupVersion,
    databaseVersion: FINANCE_DB_VERSION,
    exportedAt: new Date().toISOString(),
    currency: defaultCurrency,
    locale: defaultLocale,
    stores: {
      accounts,
      categories,
      transactions,
      bills,
      goals,
      loans,
      budgets,
      metadata,
    },
  }
}

export function downloadBackupFile(backup: LocalBackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = createBackupFileName(new Date(backup.exportedAt))
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
