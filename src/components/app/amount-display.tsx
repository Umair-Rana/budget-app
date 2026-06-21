import { formatPkr, defaultCurrency } from '@/lib/formatting'
import { cn } from '@/lib/utils'

export type AmountDisplayTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'

const toneClassNames: Record<AmountDisplayTone, string> = {
  danger: 'text-destructive',
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitCurrencyAmount(value: string, currencyCode: string) {
  const match = new RegExp(
    `^([+-]?)${escapeRegExp(currencyCode)}\\s+(.+)$`,
  ).exec(value)

  if (!match) {
    return {
      amount: value,
      prefix: undefined,
      sign: undefined,
    }
  }

  return {
    amount: match[2],
    prefix: currencyCode,
    sign: match[1] || undefined,
  }
}

export function AmountDisplay({
  amountClassName,
  className,
  currencyCode = defaultCurrency,
  prefixClassName,
  tone = 'default',
  value,
}: {
  amountClassName?: string
  className?: string
  currencyCode?: string
  prefixClassName?: string
  tone?: AmountDisplayTone
  value: number | string
}) {
  const formattedValue = typeof value === 'number' ? formatPkr(value) : value
  const display = splitCurrencyAmount(formattedValue, currencyCode)

  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 tracking-normal',
        toneClassNames[tone],
        className,
      )}
    >
      {display.sign ? <span>{display.sign}</span> : null}
      {display.prefix ? (
        <span
          className={cn(
            'text-[0.62em] font-medium text-muted-foreground',
            prefixClassName,
          )}
        >
          {display.prefix}
        </span>
      ) : null}
      <span className={amountClassName}>{display.amount}</span>
    </span>
  )
}
