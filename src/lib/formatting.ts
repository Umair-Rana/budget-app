export const defaultLocale = 'en-PK'
export const defaultCurrency = 'PKR'
export const defaultDateFormat = 'DD/MM/YYYY'

export function formatPkr(amount: number) {
  return new Intl.NumberFormat(defaultLocale, {
    currency: defaultCurrency,
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
    style: 'currency',
  })
    .format(amount)
    .replace(/\s+/g, ' ')
}

export function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-')

  return `${day}/${month}/${year}`
}
