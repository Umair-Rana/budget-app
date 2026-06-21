import { createContext } from 'react'

import type { FinanceDataSource } from '@/data/contracts'
import type { CloudHousehold } from '@/data/supabase/household-bootstrap'

export type FinanceDataSourceContextValue = {
  cloudError: string | null
  cloudHousehold: CloudHousehold | null
  dataSource: FinanceDataSource
  dataSourceKey: string
  isCloudLoading: boolean
}

export const FinanceDataSourceContext = createContext<
  FinanceDataSourceContextValue | undefined
>(undefined)
