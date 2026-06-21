import { getFinanceDb } from '@/data/db/finance-db'
import type { LocalBackupFile } from '@/data/backup/backup-types'

export async function restoreBackupFullReplace(backup: LocalBackupFile) {
  const db = await getFinanceDb()
  const transaction = db.transaction(
    [
      'accounts',
      'categories',
      'transactions',
      'bills',
      'goals',
      'loans',
      'budgets',
      'metadata',
    ],
    'readwrite',
  )

  try {
    const accountsStore = transaction.objectStore('accounts')
    const categoriesStore = transaction.objectStore('categories')
    const transactionsStore = transaction.objectStore('transactions')
    const billsStore = transaction.objectStore('bills')
    const goalsStore = transaction.objectStore('goals')
    const loansStore = transaction.objectStore('loans')
    const budgetsStore = transaction.objectStore('budgets')
    const metadataStore = transaction.objectStore('metadata')
    const requests: Array<Promise<unknown>> = [
      accountsStore.clear(),
      categoriesStore.clear(),
      transactionsStore.clear(),
      billsStore.clear(),
      goalsStore.clear(),
      loansStore.clear(),
      budgetsStore.clear(),
      metadataStore.clear(),
    ]

    requests.push(
      ...backup.stores.accounts.map((account) => accountsStore.add(account)),
      ...backup.stores.categories.map((category) =>
        categoriesStore.add(category),
      ),
      ...backup.stores.transactions.map((nextTransaction) =>
        transactionsStore.add(nextTransaction),
      ),
      ...backup.stores.bills.map((bill) => billsStore.add(bill)),
      ...backup.stores.goals.map((goal) => goalsStore.add(goal)),
      ...backup.stores.loans.map((loan) => loansStore.add(loan)),
      ...backup.stores.budgets.map((budget) => budgetsStore.add(budget)),
      ...backup.stores.metadata.map((metadata) =>
        metadataStore.add(metadata),
      ),
    )

    await Promise.all(requests)
    await transaction.done
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction may already have aborted after a failed request.
    }

    throw error
  }
}
