import type { CloudHousehold } from '@/data/supabase/household-bootstrap'
import {
  defaultCurrency,
  defaultDateFormat,
  defaultLocale,
} from '@/lib/formatting'

export const fallbackHouseholdTitle = 'Household Finance'

function localeLabel(locale: string) {
  if (locale === 'en-PK') {
    return 'Pakistan locale'
  }

  return locale
}

export function getHouseholdDisplayName(
  household: Pick<CloudHousehold, 'name'> | null | undefined,
) {
  const name = household?.name.trim()

  return name || fallbackHouseholdTitle
}

export function getHouseholdWorkspaceSubtitle() {
  return 'Monthly budget workspace'
}

export function getHouseholdHeaderDetails(
  household:
    | Pick<CloudHousehold, 'currency' | 'locale'>
    | null
    | undefined,
) {
  const locale = household?.locale || defaultLocale
  const currency = household?.currency || defaultCurrency

  return `${localeLabel(locale)} | ${currency} | ${defaultDateFormat}`
}

export function getHouseholdOverviewTitle(
  household: Pick<CloudHousehold, 'name'> | null | undefined,
) {
  return `${getHouseholdDisplayName(household)} money snapshot`
}
