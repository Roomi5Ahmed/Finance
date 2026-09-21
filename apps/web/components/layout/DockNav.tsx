'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Dock } from '@/components/ui/dock-two'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  PieChart,
  Receipt,
  Repeat,
  Settings
} from 'lucide-react'

const navigation = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ArrowLeftRight, label: 'Transactions', href: '/transactions' },
  { icon: Sparkles, label: 'Insights', href: '/insights' },
  { icon: PieChart, label: 'Budgets', href: '/budgets' },
  { icon: Repeat, label: 'Subscriptions', href: '/subscriptions' },
  { icon: Receipt, label: 'Bills', href: '/bills' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function DockNav() {
  const pathname = usePathname()
  const router = useRouter()

  const items = navigation.map((item) => ({
    icon: item.icon,
    label: item.label,
    isActive: pathname === item.href,
    onClick: () => router.push(item.href),
  }))

  return <Dock items={items} />
}
