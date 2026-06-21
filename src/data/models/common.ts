export type EntityId = string
export type IsoDateString = string
export type IsoDateTimeString = string
export type CurrencyCode = 'PKR'

export type FinanceRecord = {
  id: EntityId
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
  archivedAt?: IsoDateTimeString
  deletedAt?: IsoDateTimeString
}

export type FinanceMetadataRecord = {
  key: string
  value: string
  updatedAt: IsoDateTimeString
}

export function createRecordId() {
  return crypto.randomUUID()
}

export function createTimestamp() {
  return new Date().toISOString()
}
