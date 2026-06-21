import { Link } from 'react-router-dom'

import { PageShell } from '@/components/app/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <PageShell
      eyebrow="Not Found"
      title="Page not found"
      description="The page you opened is not part of the Household Finance shell."
    >
      <Card>
        <CardContent className="flex min-h-56 flex-col items-start justify-center gap-4 p-6">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Return to the overview to continue through the approved app
            navigation.
          </p>
          <Button asChild>
            <Link to="/">Go to Overview</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  )
}
