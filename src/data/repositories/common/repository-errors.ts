export class RepositoryError extends Error {
  public readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'RepositoryError'
    this.cause = cause
  }
}

export class RepositoryRecordNotFoundError extends RepositoryError {
  constructor(recordType: string, id: string) {
    super(`${recordType} record was not found: ${id}`)
    this.name = 'RepositoryRecordNotFoundError'
  }
}

export class RepositoryDuplicateRecordError extends RepositoryError {
  constructor(recordType: string, fieldLabel: string) {
    super(`${recordType} with this ${fieldLabel} already exists.`)
    this.name = 'RepositoryDuplicateRecordError'
  }
}
