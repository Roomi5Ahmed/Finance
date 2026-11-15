'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  PieChart,
  CreditCard,
  Settings,
  Receipt,
  Repeat
} from 'lucide-react'

const navigation = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ArrowLeftRight, label: 'Transactions', href: '/transactions' },
  { icon: Sparkles, label: 'Insights', href: '/insights' },
  { icon: PieChart, label: 'Budgets', href: '/budgets' },
  { icon: Repeat, label: 'Subscriptions', href: '/subscriptions' },
  { icon: Receipt, label: 'Bills', href: '/bills' },
  { icon: CreditCard, label: 'Accounts', href: '/accounts' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-[#f6f8f1] border-r border-[#dde3d0] p-5 pt-6">
      <div className="flex items-center gap-2 mb-10 px-3">
        <span className="text-lg font-bold text-[#01472e] tracking-wide">
          Smart <span className="text-[#01472e]">Finance</span>
        </span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]",
                isActive
                  ? "bg-[#01472e]/10 text-[#01472e]"
                  : "text-[#64705f] hover:bg-[#f6f8f1] hover:text-[#01472e]"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
