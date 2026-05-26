'use client'

import React, { useState } from 'react'
import { ContactCard } from '@/components/ui/contact-card'
import { GlowButton } from '@/components/ui/glow-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WalletCards, PieChart } from 'lucide-react'
import { updateBudgetProfile } from './actions'

interface BudgetProfile {
  monthly_income: number | null
  monthly_budget: number | null
}

export default function BudgetClient({ profile }: { profile: BudgetProfile | null }) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const formData = new FormData(e.currentTarget)
      const res = await updateBudgetProfile(formData)
      if (res.success) {
        setMessage(res.message)
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex size-full min-h-[80vh] w-full items-center justify-center p-4 animate-in">
      <div className="mx-auto max-w-5xl w-full">
        <ContactCard
          title="Budgets & Income"
          description="Set your monthly income and budget limits to keep your financial goals on track across the dashboard."
          contactInfo={[
            {
              icon: WalletCards,
              label: 'Income Baseline',
              value: 'Your expected monthly earnings',
            },
            {
              icon: PieChart,
              label: 'Expense Limit',
              value: 'Your target maximum spending',
            }
          ]}
        >
          <form onSubmit={onSubmit} className="w-full space-y-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="monthly_income">Monthly Income (₹)</Label>
              <Input
                id="monthly_income"
                name="monthly_income"
                type="number"
                step="0.01"
                defaultValue={profile?.monthly_income || ''}
                placeholder="e.g. 100000"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="monthly_budget">Monthly Budget (₹)</Label>
              <Input
                id="monthly_budget"
                name="monthly_budget"
                type="number"
                step="0.01"
                defaultValue={profile?.monthly_budget || 50000}
                placeholder="e.g. 50000"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                This will be used to calculate your budget tracking across the dashboard.
              </p>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {message}
              </div>
            )}

            <GlowButton
              type="submit"
              disabled={isLoading}
              glowColor="purple"
              className="w-full"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </GlowButton>
          </form>
        </ContactCard>
      </div>
    </div>
  )
}
