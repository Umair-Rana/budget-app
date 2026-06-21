import {
  Banknote,
  Bolt,
  Briefcase,
  BriefcaseBusiness,
  Bus,
  Circle,
  CircleDollarSign,
  CircleMinus,
  CirclePlus,
  Clapperboard,
  Coins,
  CreditCard,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  ListChecks,
  PencilRuler,
  Phone,
  PiggyBank,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  TrendingUp,
  Utensils,
  WalletCards,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createElement } from 'react'

const iconMap: Record<string, LucideIcon> = {
  banknote: Banknote,
  bolt: Bolt,
  briefcase: Briefcase,
  'briefcase-business': BriefcaseBusiness,
  bus: Bus,
  'circle-dollar-sign': CircleDollarSign,
  'circle-minus': CircleMinus,
  'circle-plus': CirclePlus,
  clapperboard: Clapperboard,
  coins: Coins,
  'credit-card': CreditCard,
  ellipsis: Ellipsis,
  fuel: Fuel,
  gift: Gift,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  home: Home,
  landmark: Landmark,
  'list-checks': ListChecks,
  'pencil-ruler': PencilRuler,
  phone: Phone,
  'piggy-bank': PiggyBank,
  'shopping-bag': ShoppingBag,
  'shopping-basket': ShoppingBasket,
  smartphone: Smartphone,
  sparkles: Sparkles,
  'trending-up': TrendingUp,
  utensils: Utensils,
  'wallet-cards': WalletCards,
  wifi: Wifi,
}

export function getIconByName(iconName: string) {
  return iconMap[iconName] ?? Circle
}

export function renderIconByName(iconName: string, className: string) {
  return createElement(getIconByName(iconName), {
    'aria-hidden': true,
    className,
  })
}
