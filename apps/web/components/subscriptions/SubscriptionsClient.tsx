'use client'

import React, { useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { GlowButton } from '@/components/ui/glow-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCw, MoreHorizontal, Trash2, XCircle, AlertTriangle, CreditCard, TrendingUp, Calendar } from 'lucide-react'
import { detectSubscriptions, updateSubscriptionStatus, deleteSubscription } from '@/app/(dashboard)/subscriptions/actions'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

interface Subscription {
  id: string
  merchant_normalized: string
  avg_amount: number
  cadence: string
  first_seen_at: string
  last_charged_at: string
  next_expected_at: string | null
  status: string
  price_history: any
  categories: { name: string; icon: string; color: string } | null
}

export default function SubscriptionsClient({
  subscriptions,
  totalMonthly,
  totalAnnual,
}: {
  subscriptions: Subscription[]
  totalMonthly: number
  totalAnnual: number
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [message, setMessage] = useState('')

  const handleScan = async () => {
    setIsScanning(true)
    setMessage('')
    try {
      const res = await detectSubscriptions()
      setMessage(res.message)
    } catch (e: any) {
      setMessage(e.message || 'Error scanning for subscriptions')
    } finally {
      setIsScanning(false)
    }
  }

  const handleStatusUpdate = async (subId: string, status: string) => {
    try {
      await updateSubscriptionStatus(subId, status)
    } catch (e: any) {
      alert(e.message || 'Failed to update')
    }
  }

  const handleDelete = async (subId: string) => {
    if (!confirm('Remove this subscription?')) return
    try {
      await deleteSubscription(subId)
    } catch (e: any) {
      alert(e.message || 'Failed to delete')
    }
  }

  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'candidate')
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled_by_user' || s.status === 'not_recurring')
  const lapsedSubs = subscriptions.filter(s => s.status === 'lapsed')

  const getCadenceLabel = (c: string) => {
    switch (c) {
      case 'weekly': return '/week'
      case 'quarterly': return '/quarter'
      case 'annual': return '/year'
      default: return '/month'
    }
  }

  const getMonthlyAmount = (sub: Subscription) => {
    const amt = Number(sub.avg_amount) || 0
    switch (sub.cadence) {
      case 'weekly': return amt * 4.33
      case 'quarterly': return amt / 3
      case 'annual': return amt / 12
      default: return amt
    }
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>Subscriptions</h1>
          <p className="mt-1.5 text-sm text-[#8C8C8C]">
            Auto-detected recurring payments from your transaction history.
          </p>
        </div>
        <GlowButton onClick={handleScan} disabled={isScanning} glowColor="purple"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium">
          <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan for Subscriptions'}
        </GlowButton>
      </div>

      {message && (
        <div className={`p-3 rounded-[0px] text-sm ${message.includes('Detected') ? 'bg-[#EFEFEF]/10 text-[#EFEFEF] border border-[#EFEFEF]/20' : 'bg-[#FF98A2]/10 text-[#FF98A2] border border-[#FF98A2]/20'}`}>
          {message}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlowCard glowColor="purple" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <CreditCard className="w-4 h-4 text-[#FF98A2]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Monthly Cost</p>
              <p className="text-lg font-bold text-white">{'\u20B9'}{totalMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="blue" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <TrendingUp className="w-4 h-4 text-[#FF98A2]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Annual Cost</p>
              <p className="text-lg font-bold text-white">{'\u20B9'}{totalAnnual.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="green" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#EFEFEF]/10">
              <Calendar className="w-4 h-4 text-[#EFEFEF]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Active Subscriptions</p>
              <p className="text-lg font-bold text-white">{activeSubs.length}</p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Subscription List */}
      {subscriptions.length === 0 ? (
        <GlowCard glowColor="blue" className="p-10">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <CreditCard className="w-12 h-12 text-[#8C8C8C]/50" style={{ marginBottom: '16px' }} />
            <p className="text-[#8C8C8C] text-sm" style={{ marginBottom: '8px' }}>No subscriptions detected yet.</p>
            <p className="text-[#8C8C8C]/50 text-xs">Click &quot;Scan for Subscriptions&quot; to analyze your transactions for recurring patterns.</p>
          </div>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {activeSubs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8C8C8C] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-roboto)' }}>Active ({activeSubs.length})</h3>
              <div className="space-y-2">
                {activeSubs.map(sub => (
                  <SubscriptionRow key={sub.id} sub={sub} onStatusUpdate={handleStatusUpdate} onDelete={handleDelete} getCadenceLabel={getCadenceLabel} getMonthlyAmount={getMonthlyAmount} />
                ))}
              </div>
            </div>
          )}

          {lapsedSubs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#FF98A2]/70 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-roboto)' }}>Lapsed ({lapsedSubs.length})</h3>
              <div className="space-y-2">
                {lapsedSubs.map(sub => (
                  <SubscriptionRow key={sub.id} sub={sub} onStatusUpdate={handleStatusUpdate} onDelete={handleDelete} getCadenceLabel={getCadenceLabel} getMonthlyAmount={getMonthlyAmount} />
                ))}
              </div>
            </div>
          )}

          {cancelledSubs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8C8C8C]/50 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-roboto)' }}>Cancelled ({cancelledSubs.length})</h3>
              <div className="space-y-2">
                {cancelledSubs.map(sub => (
                  <SubscriptionRow key={sub.id} sub={sub} onStatusUpdate={handleStatusUpdate} onDelete={handleDelete} getCadenceLabel={getCadenceLabel} getMonthlyAmount={getMonthlyAmount} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubscriptionRow({
  sub,
  onStatusUpdate,
  onDelete,
  getCadenceLabel,
  getMonthlyAmount,
}: {
  sub: Subscription
  onStatusUpdate: (id: string, status: string) => void
  onDelete: (id: string) => void
  getCadenceLabel: (c: string) => string
  getMonthlyAmount: (sub: Subscription) => number
}) {
  const monthlyAmount = getMonthlyAmount(sub)
  const lastCharged = new Date(sub.last_charged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const nextExpected = sub.next_expected_at
    ? new Date(sub.next_expected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null

  // Build chart data from price history
  const priceHistory = Array.isArray(sub.price_history) ? sub.price_history : []
  const chartData = priceHistory.slice(-6).map((p: any) => ({
    amount: p.amount,
    date: new Date(p.date).toLocaleDateString('en-IN', { month: 'short' }),
  }))

  // Check for price changes
  const hasPriceChange = priceHistory.length >= 2 &&
    Math.abs(priceHistory[priceHistory.length - 1].amount - priceHistory[priceHistory.length - 2].amount) > 0

  return (
    <GlowCard glowColor={sub.status === 'candidate' ? 'orange' : 'blue'} className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {sub.categories ? (
            <div className="w-11 h-11 rounded-[0px] flex items-center justify-center text-xl border border-white/5"
              style={{ backgroundColor: `${sub.categories.color}15` }}>
              {sub.categories.icon}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-[0px] flex items-center justify-center bg-[#FF98A2]/10 border border-white/5">
              <CreditCard className="w-5 h-5 text-[#FF98A2]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white capitalize" style={{ fontFamily: 'var(--font-inter)' }}>{sub.merchant_normalized}</h4>
              {sub.status === 'candidate' && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-[#FF98A2]/70 border-[#FF98A2]/30">Candidate</Badge>
              )}
              {hasPriceChange && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-[#FF98A2] border-[#FF98A2]/30">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Price change
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)' }}>
              ₹{Number(sub.avg_amount).toLocaleString('en-IN')}{getCadenceLabel(sub.cadence)} · {sub.categories?.name || 'Uncategorized'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini price chart */}
          {chartData.length > 1 && (
            <div className="w-16 h-8 hidden sm:block">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`subgrad-${sub.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF98A2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF98A2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', color: '#EFEFEF', fontSize: '10px' }}
                    formatter={(v: any) => [`₹${v}`, 'Amount']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#FF98A2" fill={`url(#subgrad-${sub.id})`} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-right">
            <p className="text-base font-bold text-white">₹{monthlyAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}<span className="text-xs font-normal text-[#8C8C8C]">/mo</span></p>
            <p className="text-[10px] text-[#8C8C8C]/50">
              {lastCharged}{nextExpected ? ` · Next: ${nextExpected}` : ''}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {sub.status === 'candidate' && (
                <DropdownMenuItem onClick={() => onStatusUpdate(sub.id, 'active')}>
                  <span className="mr-2">✓</span> Confirm as Subscription
                </DropdownMenuItem>
              )}
              {sub.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatusUpdate(sub.id, 'lapsed')}>
                  <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Mark as Lapsed
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onStatusUpdate(sub.id, 'cancelled_by_user')}>
                <XCircle className="w-3.5 h-3.5 mr-2" /> Mark as Cancelled
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusUpdate(sub.id, 'not_recurring')}>
                <span className="mr-2">🚫</span> Not Recurring
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(sub.id)} className="text-[#FF98A2] focus:text-[#FF98A2]">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </GlowCard>
  )
}
