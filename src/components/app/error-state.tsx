import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ErrorState({
  className,
  message,
}: {
  className?: string
  message: ReactNode
}) {
  return (
    <Card className={cn('border-destructive/35', className)} role="alert">
      <CardContent className="p-5 text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}
