'use client'

import React, { useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { GlowButton } from '@/components/ui/glow-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WalletCards, PieChart, Plus, MoreHorizontal, Trash2, Pencil, Calendar } from 'lucide-react'
import { createBudget, updateBudget, deleteBudget, updateBudgetProfile } from './actions'

interface BudgetProfile {
  monthly_income: number | null
  monthly_budget: number | null
}

interface Budget {
  id: string
  amount: number
  period: string
  start_date: string
  auto_renew: boolean
  alert_thresholds: number[]
  category_id: string | null
  categories: { id: string; name: string; icon: string; color: string } | null
  spent: number
  percentage: number
  daysLeft: number
  remaining: number
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export default function BudgetClient({
  profile,
  budgets,
  categories,
  totalMonthlySpend,
}: {
  profile: BudgetProfile | null
  budgets: Budget[]
  categories: Category[]
  totalMonthlySpend: number
}) {
  const [isAddingBudget, setIsAddingBudget] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

  const handleCreateBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    try {
      const formData = new FormData(e.currentTarget)
      const res = await createBudget(formData)
      if (res.success) {
        setMessage(res.message)
        setIsAddingBudget(false)
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to create budget')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingBudget) return
    setIsLoading(true)
    setMessage('')
    try {
      const formData = new FormData(e.currentTarget)
      const res = await updateBudget(editingBudget.id, formData)
      if (res.success) {
        setMessage(res.message)
        setEditingBudget(null)
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to update budget')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return
    try {
      await deleteBudget(budgetId)
    } catch (error: any) {
      alert(error.message || 'Failed to delete budget')
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setProfileMessage('')
    try {
      const formData = new FormData(e.currentTarget)
      const res = await updateBudgetProfile(formData)
      if (res.success) setProfileMessage(res.message)
    } catch (error: any) {
      setProfileMessage(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-[#FF98A2]'
    if (percentage >= 80) return 'bg-[#FF98A2]/50'
    return 'bg-[#EFEFEF]'
  }

  const getProgressText = (percentage: number) => {
    if (percentage >= 100) return 'text-[#FF98A2]'
    if (percentage >= 80) return 'text-[#FF98A2]/70'
    return 'text-[#EFEFEF]'
  }

  const usedCategories = new Set(budgets.filter(b => b.category_id).map(b => b.category_id))

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>Budgets</h1>
          <p className="mt-1.5 text-sm text-[#8C8C8C]">
            Set spending limits per category and track your progress in real-time.
          </p>
        </div>
        <GlowButton onClick={() => { setIsAddingBudget(true); setEditingBudget(null) }} glowColor="purple"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" /> Add Budget
        </GlowButton>
      </div>

      {message && (
        <div className={`p-3 rounded-[0px] text-sm ${message.includes('success') || message.includes('created') ? 'bg-[#EFEFEF]/10 text-[#EFEFEF] border border-[#EFEFEF]/20' : 'bg-[#FF98A2]/10 text-[#FF98A2] border border-[#FF98A2]/20'}`}>
          {message}
        </div>
      )}

      {/* Overall Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlowCard glowColor="blue" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <WalletCards className="w-4 h-4 text-[#FF98A2]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Monthly Income</p>
              <p className="text-lg font-bold text-white">{'\u20B9'}{(profile?.monthly_income || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="green" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#EFEFEF]/10">
              <PieChart className="w-4 h-4 text-[#EFEFEF]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Spent This Month</p>
              <p className="text-lg font-bold text-white">{'\u20B9'}{totalMonthlySpend.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="orange" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <Calendar className="w-4 h-4 text-[#FF98A2]/70" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Active Budgets</p>
              <p className="text-lg font-bold text-white">{budgets.length}</p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Profile Settings (inline) */}
      <GlowCard glowColor="purple" className="p-6">
        <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'var(--font-inter)' }}>Income & Overall Budget</h3>
        <form onSubmit={handleProfileSubmit} className="flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <Label htmlFor="monthly_income" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Monthly Income (₹)</Label>
            <Input id="monthly_income" name="monthly_income" type="number" step="0.01"
              defaultValue={profile?.monthly_income || ''} placeholder="e.g. 100000" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <Label htmlFor="monthly_budget" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Monthly Budget (₹)</Label>
            <Input id="monthly_budget" name="monthly_budget" type="number" step="0.01"
              defaultValue={profile?.monthly_budget || 50000} placeholder="e.g. 50000" />
          </div>
          <GlowButton type="submit" glowColor="blue" className="px-6">
            Save
          </GlowButton>
        </form>
        {profileMessage && (
          <p className={`text-xs mt-2 ${profileMessage.includes('success') ? 'text-[#EFEFEF]' : 'text-[#FF98A2]'}`}>
            {profileMessage}
          </p>
        )}
      </GlowCard>

      {/* Add / Edit Budget Form */}
      {(isAddingBudget || editingBudget) && (
        <GlowCard glowColor="blue" className="p-6">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'var(--font-inter)' }}>
            {editingBudget ? 'Edit Budget' : 'Create New Budget'}
          </h3>
          <form onSubmit={editingBudget ? handleUpdateBudget : handleCreateBudget} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category_id" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Category (leave empty for overall)</Label>
                <select name="category_id" id="category_id"
                  defaultValue={editingBudget?.category_id || ''}
                  className="rounded-[0px] border border-white/10 bg-[#000000] h-9 pl-3 pr-8 text-sm text-white focus:border-[#FF98A2] outline-none">
                  <option value="">Overall Budget</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} disabled={usedCategories.has(c.id) && editingBudget?.category_id !== c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Amount (₹)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required
                  defaultValue={editingBudget?.amount || ''} placeholder="e.g. 5000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Period</Label>
                <select name="period" id="period" defaultValue={editingBudget?.period || 'monthly'}
                  className="rounded-[0px] border border-white/10 bg-[#000000] h-9 pl-3 pr-8 text-sm text-white focus:border-[#FF98A2] outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alert_thresholds" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Alert Thresholds (%)</Label>
                <Input id="alert_thresholds" name="alert_thresholds" type="text"
                  defaultValue={editingBudget?.alert_thresholds?.join(',') || '80,100'}
                  placeholder="e.g. 80,100" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="hidden" name="auto_renew" value="true" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="auto_renew" defaultChecked={editingBudget?.auto_renew ?? true}
                  onChange={(e) => {
                    const hidden = (e.target.closest('form')?.querySelector('input[name="auto_renew"]') as HTMLInputElement)
                    if (hidden) hidden.value = e.target.checked ? 'true' : 'false'
                  }}
                  className="rounded border-white/20 bg-[#000000] text-[#FF98A2] focus:ring-[#FF98A2]"
                />
                <span className="text-xs text-[#EFEFEF]" style={{ fontFamily: 'var(--font-roboto)' }}>Auto-renew next month</span>
              </label>
            </div>
            <div className="flex gap-2">
              <GlowButton type="submit" glowColor="purple" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingBudget ? 'Update Budget' : 'Create Budget'}
              </GlowButton>
              <Button type="button" variant="ghost" onClick={() => { setIsAddingBudget(false); setEditingBudget(null) }}>
                Cancel
              </Button>
            </div>
          </form>
        </GlowCard>
      )}

      {/* Budget List */}
      {budgets.length === 0 ? (
        <GlowCard glowColor="blue" className="p-10">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <PieChart className="w-12 h-12 text-[#8C8C8C]/50" style={{ marginBottom: '16px' }} />
            <p className="text-[#8C8C8C] text-sm">No budgets set yet. Create one to start tracking your spending limits.</p>
          </div>
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {budgets.map((budget) => (
            <GlowCard key={budget.id} glowColor={budget.percentage >= 100 ? 'red' : budget.percentage >= 80 ? 'orange' : 'green'} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {budget.categories ? (
                    <div className="w-11 h-11 rounded-[0px] flex items-center justify-center text-xl border border-white/5"
                      style={{ backgroundColor: `${budget.categories.color}15` }}>
                      {budget.categories.icon}
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-[0px] flex items-center justify-center bg-[#FF98A2]/10 border border-white/5">
                      <PieChart className="w-5 h-5 text-[#FF98A2]" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-inter)' }}>
                      {budget.categories?.name || 'Overall Budget'}
                    </h3>
                    <p className="text-xs text-[#8C8C8C]">
                      {budget.period === 'monthly' ? 'Monthly' : 'Weekly'} · {budget.daysLeft} days left
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => { setEditingBudget(budget); setIsAddingBudget(false) }}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteBudget(budget.id)} className="text-[#FF98A2] focus:text-[#FF98A2]">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)' }}>
                    ₹{budget.spent.toLocaleString('en-IN')} spent
                  </span>
                  <span className={`font-semibold ${getProgressText(budget.percentage)}`}>
                    {budget.percentage}%
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${getProgressColor(budget.percentage)}`}
                    style={{ width: `${Math.min(100, budget.percentage)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#8C8C8C]/50 mt-1">
                  <span>₹{budget.remaining.toLocaleString('en-IN')} remaining</span>
                  <span>of ₹{budget.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Threshold badges */}
              <div className="flex gap-1.5 mt-2">
                {budget.alert_thresholds.sort((a, b) => a - b).map((t) => (
                  <Badge key={t} variant={budget.percentage >= t ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0">
                    {t}%
                  </Badge>
                ))}
                {budget.auto_renew && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-[#EFEFEF] border-[#EFEFEF]/30">
                    Auto-renew
                  </Badge>
                )}
              </div>
            </GlowCard>
          ))}
        </div>
      )}
    </div>
  )
}
