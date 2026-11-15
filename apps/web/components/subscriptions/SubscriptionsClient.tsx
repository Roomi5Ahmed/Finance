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
import { RefreshCw, MoreHorizontal, Trash2, XCircle, AlertTriangle, CreditCard, TrendingUp, Calendar, Plus } from 'lucide-react'
import { detectSubscriptions, updateSubscriptionStatus, deleteSubscription, createSubscription } from '@/app/(dashboard)/subscriptions/actions'
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ merchant: '', amount: '', cadence: 'monthly' })
  const [isAdding, setIsAdding] = useState(false)

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

  const handleAdd = async () => {
    if (!addForm.merchant.trim() || !addForm.amount) return
    setIsAdding(true)
    setMessage('')
    try {
      await createSubscription({
        merchant: addForm.merchant.trim(),
        amount: parseFloat(addForm.amount),
        cadence: addForm.cadence,
      })
      setAddForm({ merchant: '', amount: '', cadence: 'monthly' })
      setShowAddForm(false)
      setMessage(`Subscription "${addForm.merchant.trim()}" added!`)
    } catch (e: any) {
      setMessage(e.message || 'Failed to add subscription')
    } finally {
      setIsAdding(false)
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
    <div className="animate-in text-[#01472e]" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-2xl font-bold text-[#fefae0] tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>Subscriptions</h1>
          <p className="mt-1.5 text-sm text-[#ccd5ae]">
            Auto-detected recurring payments from your transaction history.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <GlowButton onClick={handleScan} disabled={isScanning} glowColor="purple"
            className="glow-on-shell inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#fefae0]">
            <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan for Subscriptions'}
          </GlowButton>
          <GlowButton onClick={() => setShowAddForm(!showAddForm)} glowColor="green"
            className="glow-on-shell inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#fefae0]">
            <Plus className="w-4 h-4 mr-2" />
            Add Subscription
          </GlowButton>
        </div>
      </div>

      {showAddForm && (
        <GlowCard glowColor="green" className="p-5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Service name (e.g. Netflix)"
                value={addForm.merchant}
                onChange={e => setAddForm(p => ({ ...p, merchant: e.target.value }))}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '11px', backgroundColor: '#ffffff', border: '1px solid #333', color: '#01472e', fontSize: '14px', outline: 'none' }}
              />
              <input
                type="number"
                placeholder="Amount"
                value={addForm.amount}
                onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))}
                style={{ width: '120px', padding: '8px 12px', borderRadius: '11px', backgroundColor: '#ffffff', border: '1px solid #333', color: '#01472e', fontSize: '14px', outline: 'none' }}
              />
              <select
                value={addForm.cadence}
                onChange={e => setAddForm(p => ({ ...p, cadence: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '11px', backgroundColor: '#ffffff', border: '1px solid #333', color: '#01472e', fontSize: '14px', outline: 'none' }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', borderRadius: '11px', backgroundColor: 'transparent', border: '1px solid #333', color: '#64705f', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <GlowButton onClick={handleAdd} disabled={isAdding || !addForm.merchant.trim() || !addForm.amount} glowColor="green"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium">
                {isAdding ? 'Adding...' : 'Add'}
              </GlowButton>
            </div>
          </div>
        </GlowCard>
      )}

      {message && (
        <div className={`p-3 rounded-[0px] text-sm ${message.includes('Detected') ? 'bg-[#01472e]/10 text-[#01472e] border border-[#01472e]/20' : 'bg-[#01472e]/10 text-[#01472e] border border-[#01472e]/20'}`}>
          {message}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlowCard glowColor="purple" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#01472e]/10">
              <CreditCard className="w-4 h-4 text-[#01472e]" />
            </div>
            <div>
              <p className="text-xs text-[#64705f]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Monthly Cost</p>
              <p className="text-lg font-bold text-[#01472e]">{'\u20B9'}{totalMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="blue" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#01472e]/10">
              <TrendingUp className="w-4 h-4 text-[#01472e]" />
            </div>
            <div>
              <p className="text-xs text-[#64705f]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Annual Cost</p>
              <p className="text-lg font-bold text-[#01472e]">{'\u20B9'}{totalAnnual.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="green" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#01472e]/10">
              <Calendar className="w-4 h-4 text-[#01472e]" />
            </div>
            <div>
              <p className="text-xs text-[#64705f]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Active Subscriptions</p>
              <p className="text-lg font-bold text-[#01472e]">{activeSubs.length}</p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Subscription List */}
      {subscriptions.length === 0 ? (
        <GlowCard glowColor="blue" className="p-10">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <CreditCard className="w-12 h-12 text-[#64705f]/50" style={{ marginBottom: '16px' }} />
            <p className="text-[#64705f] text-sm" style={{ marginBottom: '8px' }}>No subscriptions yet.</p>
            <p className="text-[#64705f]/50 text-xs">Click &quot;Scan for Subscriptions&quot; to auto-detect from transactions, or &quot;Add Subscription&quot; to add one manually.</p>
          </div>
        </GlowCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeSubs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#ccd5ae] uppercase tracking-wider" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '8px' }}>Active ({activeSubs.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeSubs.map(sub => (
                  <SubscriptionRow key={sub.id} sub={sub} onStatusUpdate={handleStatusUpdate} onDelete={handleDelete} getCadenceLabel={getCadenceLabel} getMonthlyAmount={getMonthlyAmount} />
                ))}
              </div>
            </div>
          )}

          {lapsedSubs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#fefae0]/75 uppercase tracking-wider" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '8px' }}>Lapsed ({lapsedSubs.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lapsedSubs.map(sub => (
                  <SubscriptionRow key={sub.id} sub={sub} onStatusUpdate={handleStatusUpdate} onDelete={handleDelete} getCadenceLabel={getCadenceLabel} getMonthlyAmount={getMonthlyAmount} />
                ))}
              </div>
            </div>
          )}

          {cancelledSubs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#ccd5ae]/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '8px' }}>Cancelled ({cancelledSubs.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div className="w-11 h-11 rounded-[0px] flex items-center justify-center text-xl border border-[#dde3d0]"
              style={{ backgroundColor: `${sub.categories.color}15` }}>
              {sub.categories.icon}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-[0px] flex items-center justify-center bg-[#01472e]/10 border border-[#dde3d0]">
              <CreditCard className="w-5 h-5 text-[#01472e]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-[#01472e] capitalize" style={{ fontFamily: 'var(--font-inter)' }}>{sub.merchant_normalized}</h4>
              {sub.status === 'candidate' && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-[#01472e]/70 border-[#01472e]/30">Candidate</Badge>
              )}
              {hasPriceChange && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-[#01472e] border-[#01472e]/30">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Price change
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#64705f]" style={{ fontFamily: 'var(--font-roboto)' }}>
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
                      <stop offset="5%" stopColor="#01472e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#01472e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(1,71,46,0.12)', borderRadius: '11px', color: '#01472e', fontSize: '10px' }}
                    formatter={(v: any) => [`₹${v}`, 'Amount']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#01472e" fill={`url(#subgrad-${sub.id})`} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-right">
            <p className="text-base font-bold text-[#01472e]">₹{monthlyAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}<span className="text-xs font-normal text-[#64705f]">/mo</span></p>
            <p className="text-[10px] text-[#64705f]/50">
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
              <DropdownMenuItem onClick={() => onDelete(sub.id)} className="text-[#01472e] focus:text-[#01472e]">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </GlowCard>
  )
}
