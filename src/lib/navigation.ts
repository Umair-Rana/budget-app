import {
  ChartColumn,
  CircleEllipsis,
  ClipboardList,
  History,
  Landmark,
  LayoutDashboard,
  Receipt,
  ReceiptText,
  Settings,
  Target,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AppNavItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
}

export type MoreNavGroup = {
  title: string
  items: AppNavItem[]
}

export const primaryNavItems: AppNavItem[] = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
    description: 'Household money snapshot',
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: ReceiptText,
    description: 'Income and expense history',
  },
  {
    title: 'Bills',
    href: '/bills',
    icon: Receipt,
    description: 'Recurring household obligations',
  },
  {
    title: 'Goals',
    href: '/goals',
    icon: Target,
    description: 'Savings goals and progress',
  },
  {
    title: 'More',
    href: '/more',
    icon: CircleEllipsis,
    description: 'Planner, loans, accounts, reports, and settings',
  },
]

export const moreNavGroups: MoreNavGroup[] = [
  {
    title: 'Money',
    items: [
      {
        title: 'Planner',
        href: '/planner',
        icon: ClipboardList,
        description: 'Monthly budget planning',
      },
      {
        title: 'Loans',
        href: '/loans',
        icon: Landmark,
        description: 'Loan payable and receivable tracking',
      },
      {
        title: 'Accounts',
        href: '/accounts',
        icon: WalletCards,
        description: 'Cash, bank, and payment accounts',
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: ChartColumn,
        description: 'Charts and monthly analysis',
      },
      {
        title: 'Audit History',
        href: '/audit-history',
        icon: History,
        description: 'Record of important changes',
      },
    ],
  },
  {
    title: 'App',
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Theme and app preferences',
      },
    ],
  },
]

export const moreRouteHrefs = new Set(
  moreNavGroups.flatMap((group) => group.items.map((item) => item.href)),
)

export const desktopMoreRouteHrefs = new Set(
  moreNavGroups
    .flatMap((group) => group.items)
    .filter((item) => item.href !== '/settings')
    .map((item) => item.href),
)

export const desktopMoreNavItems = moreNavGroups
  .flatMap((group) => group.items)
  .filter((item) => item.href !== '/settings')

export const settingsNavItem: AppNavItem = {
  title: 'Settings',
  href: '/settings',
  icon: Settings,
  description: 'Theme and app preferences',
}
