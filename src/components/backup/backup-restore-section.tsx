import { Cloud, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type BackupRestoreSectionProps = {
  householdName?: string
  isExporting: boolean
  onExport: () => void
}

export function BackupRestoreSection({
  householdName,
  isExporting,
  onExport,
}: BackupRestoreSectionProps) {
  const exportDisabled = isExporting || !householdName

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloud Backup</CardTitle>
        <CardDescription>
          Export a JSON snapshot of the current cloud household.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Household</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {householdName ?? 'Cloud household is still loading.'}
          </p>
        </div>

        <div className="mt-4">
          <Button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="h-auto justify-start px-4 py-3"
          >
            <Download className="size-4" aria-hidden="true" />
            <span className="flex flex-col items-start">
              <span>
                {isExporting ? 'Exporting...' : 'Export Cloud Backup'}
              </span>
              <span className="text-xs font-normal opacity-85">
                Download household finance records as JSON
              </span>
            </span>
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-lg border bg-muted/35 px-3 py-2 text-sm leading-6 text-muted-foreground">
          <Cloud className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Export includes finance rows from this cloud household only.
            Import/restore will be added in a future update.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
