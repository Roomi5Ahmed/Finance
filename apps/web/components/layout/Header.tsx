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
    <header className="h-20 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search transactions..."
            className="block w-full rounded-lg border border-white/10 bg-[#1E293B]/50 py-2 pl-10 pr-3 text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <button className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <div className="flex items-center space-x-3 bg-[#1E293B]/50 px-3 py-1.5 rounded-full border border-white/5">
          <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            U
          </div>
          <button 
            onClick={handleSignOut}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors pr-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
