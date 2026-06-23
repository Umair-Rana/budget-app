import { localInitialSchemaStatements } from '@/data/local-sqlite/schema/local-sqlite-schema'
import type { LocalSqliteMigration } from '@/data/local-sqlite/local-sqlite-types'

export const initialLocalSqliteSchemaMigration = {
  id: '0001_initial_local_sqlite_schema',
  statements: localInitialSchemaStatements,
} as const satisfies LocalSqliteMigration
