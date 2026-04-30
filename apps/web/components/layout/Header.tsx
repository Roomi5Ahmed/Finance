'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Header() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 bg-[#0B1121]/80 backdrop-blur-xl border-b border-white/[0.03]">
      {/* Brand */}
      <span className="text-lg font-bold text-white tracking-wide">
        Smart <span className="text-indigo-400">Finance</span>
      </span>

      {/* Search & Actions */}
      <div className="flex items-center space-x-4">
        <div className="hidden sm:block relative max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search transactions..."
            className="block w-full rounded-lg border border-white/5 bg-[#1E293B]/40 py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white focus:outline-none"
          />
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <div className="flex items-center space-x-2 bg-[#1E293B]/40 px-2.5 py-1 rounded-full border border-white/5">
          <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
            U
          </div>
          <button 
            onClick={handleSignOut}
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors pr-0.5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
