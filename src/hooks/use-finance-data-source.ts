import { useContext } from 'react'

import { FinanceDataSourceContext } from '@/providers/finance-data-source-context'

export function useFinanceDataSource() {
  const context = useContext(FinanceDataSourceContext)

  if (!context) {
    throw new Error(
      'useFinanceDataSource must be used within a FinanceDataProvider',
    )
  }

  return context
}
