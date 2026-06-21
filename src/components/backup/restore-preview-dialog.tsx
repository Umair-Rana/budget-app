import { AlertTriangle } from 'lucide-react'

import {
  ModalDialogActions,
  ModalDialogShell,
} from '@/components/app/modal-dialog-shell'
import { Button } from '@/components/ui/button'
import type {
  BackupPreview,
  LocalBackupFile,
} from '@/data/backup/backup-types'

type RestorePreviewDialogProps = {
  backup?: LocalBackupFile
  isRestoring: boolean
  onCancel: () => void
  onConfirm: () => void
  preview?: BackupPreview
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function RestorePreviewDialog({
  backup,
  isRestoring,
  onCancel,
  onConfirm,
  preview,
}: RestorePreviewDialogProps) {
  if (!backup || !preview) {
    return null
  }

  return (
    <ModalDialogShell
      id="restore-preview-title"
      title="Restore Backup"
      description="Review the backup metadata before replacing local data."
      maxWidthClassName="sm:max-w-2xl"
      closeDisabled={isRestoring}
      onClose={onCancel}
    >
      <div className="grid gap-4 p-5">
        <div className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">App</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {preview.app}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Exported
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {preview.exportedAtLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Backup Version
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {preview.backupVersion}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Database Version
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {preview.databaseVersion}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <CountRow label="Accounts" value={preview.counts.accounts} />
          <CountRow label="Categories" value={preview.counts.categories} />
          <CountRow label="Transactions" value={preview.counts.transactions} />
          <CountRow label="Bills" value={preview.counts.bills} />
          <CountRow label="Goals" value={preview.counts.goals} />
          <CountRow label="Loans" value={preview.counts.loans} />
          <CountRow label="Budgets" value={preview.counts.budgets} />
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-warning/35 bg-warning/10 px-3 py-3 text-sm leading-6 text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            Restoring this backup will replace your current local finance data.
            This cannot be undone unless you export your current data first.
            Continue?
          </p>
        </div>

        <ModalDialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isRestoring}
          >
            {isRestoring ? 'Restoring...' : 'Restore Backup'}
          </Button>
        </ModalDialogActions>
      </div>
    </ModalDialogShell>
  )
}
