import type {
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'
import type {
  WebSqliteDriverStatus,
  WebSqliteWorkerRequest,
  WebSqliteWorkerResponse,
} from '@/data/local-sqlite/drivers/web-sqlite-wasm-messages'

type PendingRequest = {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
}

export type WebLocalSqliteDriverOptions = {
  workerFactory?: () => Worker
}

function createDefaultWebSqliteWorker() {
  return new Worker(new URL('./web-sqlite-wasm-worker.ts', import.meta.url), {
    type: 'module',
  })
}

export class WebLocalSqliteWasmDriver implements LocalSqliteDriver {
  private nextRequestId = 1
  private readonly pendingRequests = new Map<number, PendingRequest>()
  private readonly worker: Worker

  constructor({ workerFactory = createDefaultWebSqliteWorker }: WebLocalSqliteDriverOptions = {}) {
    this.worker = workerFactory()
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleError)
  }

  async close() {
    try {
      await this.request({ id: 0, type: 'close' })
    } finally {
      this.worker.removeEventListener('message', this.handleMessage)
      this.worker.removeEventListener('error', this.handleError)
      this.worker.terminate()
    }
  }

  async exec(sql: string) {
    await this.request({ id: 0, sql, type: 'exec' })
  }

  async getStatus() {
    return this.request({ id: 0, type: 'status' }) as Promise<WebSqliteDriverStatus>
  }

  async query<T>(sql: string, params?: LocalSqliteStatementParams) {
    return this.request({
      id: 0,
      params,
      sql,
      type: 'query',
    }) as Promise<T[]>
  }

  async run(sql: string, params?: LocalSqliteStatementParams) {
    await this.request({
      id: 0,
      params,
      sql,
      type: 'run',
    })
  }

  async transaction<T>(work: () => Promise<T>) {
    await this.exec('begin transaction')

    try {
      const result = await work()
      await this.exec('commit')
      return result
    } catch (error) {
      await this.exec('rollback')
      throw error
    }
  }

  private handleError = (event: ErrorEvent) => {
    const error = new Error(event.message)

    for (const request of this.pendingRequests.values()) {
      request.reject(error)
    }

    this.pendingRequests.clear()
  }

  private handleMessage = (event: MessageEvent<WebSqliteWorkerResponse>) => {
    const response = event.data
    const pendingRequest = this.pendingRequests.get(response.id)

    if (!pendingRequest) {
      return
    }

    this.pendingRequests.delete(response.id)

    if (response.type === 'error') {
      pendingRequest.reject(new Error(response.message))
      return
    }

    pendingRequest.resolve(response.status ?? response.result)
  }

  private request(request: WebSqliteWorkerRequest) {
    const id = this.nextRequestId++
    const requestWithId = {
      ...request,
      id,
    } as WebSqliteWorkerRequest

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { reject, resolve })
      this.worker.postMessage(requestWithId)
    })
  }
}

export async function createWebLocalSqliteWasmDriver(
  options: WebLocalSqliteDriverOptions = {},
) {
  return new WebLocalSqliteWasmDriver(options)
}
