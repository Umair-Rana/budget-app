import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'

export function LoadingState({
  className,
  message = 'Loading...',
}: {
  className?: string
  message?: ReactNode
}) {
  return (
    <Card className={className} role="status" aria-live="polite">
      <CardContent className="p-5 text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}
