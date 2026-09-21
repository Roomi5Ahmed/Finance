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

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#000000', overflow: 'hidden', color: '#8C8C8C' }}>
      <OnboardingModal />
      <Header />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 10 }}>
          <div style={{ padding: '32px 48px 160px 48px' }}>
            {children}
          </div>
      </main>
      <DockNav />
    </div>
  )
}
