import type { WebSqlitePocWorkerMessage } from '@/data/local-sqlite/poc/web-sqlite-poc-worker'

export type WebSqlitePocResult = Extract<
  WebSqlitePocWorkerMessage,
  { type: 'success' }
>

export function runWebSqlitePoc({
  timeoutMs = 10_000,
}: {
  timeoutMs?: number
} = {}) {
  return new Promise<WebSqlitePocResult>((resolve, reject) => {
    const worker = new Worker(
      new URL('./web-sqlite-poc-worker.ts', import.meta.url),
      { type: 'module' },
    )
    const timeoutId = window.setTimeout(() => {
      worker.terminate()
      reject(new Error('Web SQLite POC timed out.'))
    }, timeoutMs)

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      worker.terminate()
    }

    worker.addEventListener('message', (event) => {
      const message = event.data as WebSqlitePocWorkerMessage
      cleanup()

      if (message.type === 'success') {
        resolve(message)
        return
      }

      reject(new Error(message.message))
    })

    worker.addEventListener('error', (event) => {
      cleanup()
      reject(new Error(event.message))
    })

    worker.postMessage({ type: 'run' })
  })
}
