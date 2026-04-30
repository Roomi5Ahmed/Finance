import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Although middleware protects this, we double check server-side for safety
  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0B1121] overflow-hidden text-slate-300">
      <OnboardingModal />
      <Sidebar />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 bg-gray-50/50 dark:bg-[#0F1523]">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
