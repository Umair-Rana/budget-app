import { useEffect, useState } from 'react'
import { CheckCircle2, Cloud, Loader2, TriangleAlert } from 'lucide-react'

import {
  getConnectionStatusBannerView,
  type BannerTone,
  type ConnectionStatusBannerView,
} from '@/lib/connection-status-banner'
import { useNetworkStatus } from '@/hooks/use-network-status'

const onlineVisibleDurationMs = 4_000

function getToneClassName(tone: BannerTone) {
  switch (tone) {
    case 'error':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    case 'info':
      return 'border-info/30 bg-info/10 text-info'
    case 'success':
      return 'border-success/30 bg-success/10 text-success'
    case 'warning':
      return 'border-warning/30 bg-warning/10 text-warning'
  }
}

function BannerIcon({ icon }: { icon: ConnectionStatusBannerView['icon'] }) {
  const className = 'mt-0.5 h-4 w-4 shrink-0'

  switch (icon) {
    case 'check':
      return <CheckCircle2 className={className} aria-hidden="true" />
    case 'cloud':
      return <Cloud className={className} aria-hidden="true" />
    case 'loader':
      return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />
    case 'warning':
      return <TriangleAlert className={className} aria-hidden="true" />
  }
}

export function ConnectionStatusBanner() {
  const { isOnline, isReconnecting, syncState } = useNetworkStatus()
  const [hiddenTransientKey, setHiddenTransientKey] = useState<string | null>(
    null,
  )
  const view = getConnectionStatusBannerView({
    isOnline,
    isReconnecting,
    syncState,
  })
  const transientKey = `${view.title}:${view.tone}`
  const visible = view.persistent || hiddenTransientKey !== transientKey

  useEffect(() => {
    if (view.persistent) {
      return undefined
    }

    const timer = setTimeout(() => {
      setHiddenTransientKey(transientKey)
    }, onlineVisibleDurationMs)

    return () => clearTimeout(timer)
  }, [transientKey, view.persistent])

  if (!visible) {
    return null
  }

  return (
    <div
      aria-live={view.persistent ? 'assertive' : 'polite'}
      className="shrink-0 px-4 pt-3 sm:px-6 lg:px-8"
      role="status"
    >
      <div
        className={`mx-auto flex max-w-6xl items-start gap-2 rounded-full border px-3 py-2 text-sm shadow-sm ${getToneClassName(
          view.tone,
        )}`}
      >
        <BannerIcon icon={view.icon} />
        <div className="min-w-0">
          <p className="font-medium leading-5">{view.title}</p>
          {view.description ? (
            <p className="text-xs leading-5 opacity-90">{view.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
