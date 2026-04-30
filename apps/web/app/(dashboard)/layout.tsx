import Header from '@/components/layout/Header'
import DockNav from '@/components/layout/DockNav'
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
    <div className="flex flex-col h-screen bg-[#0B1121] overflow-hidden text-slate-300">
      <OnboardingModal />
      <Header />
      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-28 md:px-8 md:pt-8 md:pb-32 bg-[#0F1523]">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
      <DockNav />
    </div>
  )
}
