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
import { Plus, MoreHorizontal, Trash2, Pencil, CheckCircle, Clock, AlertTriangle, Receipt } from 'lucide-react'
import { createBill, updateBill, deleteBill, markBillAsPaid } from '@/app/(dashboard)/bills/actions'

interface BillPayment {
  id: string
  paid_at: string
  amount: number
}

interface Bill {
  id: string
  name: string
  amount_estimate: number | null
  due_rule: { recurrence: string; day_of_month: number }
  next_due_at: string
  reminder_lead_days: number
  status: string
  payments: BillPayment[]
  daysUntilDue: number
  isOverdue: boolean
  isDueSoon: boolean
}

export default function BillsClient({ bills }: { bills: Bill[] }) {
  const [isAddingBill, setIsAddingBill] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleCreateBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    try {
      const formData = new FormData(e.currentTarget)
      const res = await createBill(formData)
      if (res.success) {
        setMessage(res.message)
        setIsAddingBill(false)
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to create bill')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingBill) return
    setIsLoading(true)
    setMessage('')
    try {
      const formData = new FormData(e.currentTarget)
      const res = await updateBill(editingBill.id, formData)
      if (res.success) {
        setMessage(res.message)
        setEditingBill(null)
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to update bill')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return
    try {
      await deleteBill(billId)
    } catch (error: any) {
      alert(error.message || 'Failed to delete bill')
    }
  }

  const handleMarkPaid = async (billId: string) => {
    try {
      const res = await markBillAsPaid(billId)
      if (res.success) setMessage(res.message)
    } catch (error: any) {
      alert(error.message || 'Failed to mark as paid')
    }
  }

  const activeBills = bills.filter(b => b.status === 'active')
  const overdueBills = activeBills.filter(b => b.isOverdue)
  const dueSoonBills = activeBills.filter(b => b.isDueSoon && !b.isOverdue)
  const upcomingBills = activeBills.filter(b => !b.isOverdue && !b.isDueSoon)

  const totalMonthlyEstimate = activeBills.reduce((sum, b) => {
    const rule = b.due_rule
    if (rule?.recurrence === 'monthly') return sum + (b.amount_estimate || 0)
    if (rule?.recurrence === 'weekly') return sum + (b.amount_estimate || 0) * 4.33
    if (rule?.recurrence === 'quarterly') return sum + (b.amount_estimate || 0) / 3
    if (rule?.recurrence === 'annual') return sum + (b.amount_estimate || 0) / 12
    return sum + (b.amount_estimate || 0)
  }, 0)

  const getRecurrenceLabel = (recurrence: string) => {
    switch (recurrence) {
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      case 'quarterly': return 'Quarterly'
      case 'annual': return 'Annual'
      default: return recurrence
    }
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>Bill Reminders</h1>
          <p className="mt-1.5 text-sm text-[#8C8C8C]">
            Never miss a payment. Track rent, EMIs, premiums, and more.
          </p>
        </div>
        <GlowButton onClick={() => { setIsAddingBill(true); setEditingBill(null) }} glowColor="purple"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" /> Add Bill
        </GlowButton>
      </div>

      {message && (
        <div className={`p-3 rounded-[0px] text-sm ${message.includes('success') || message.includes('paid') || message.includes('created') ? 'bg-[#EFEFEF]/10 text-[#EFEFEF] border border-[#EFEFEF]/20' : 'bg-[#FF98A2]/10 text-[#FF98A2] border border-[#FF98A2]/20'}`}>
          {message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <GlowCard glowColor="blue" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <Receipt className="w-4 h-4 text-[#FF98A2]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Active Bills</p>
              <p className="text-lg font-bold text-white">{activeBills.length}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="orange" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <Clock className="w-4 h-4 text-[#FF98A2]/70" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Due Soon</p>
              <p className="text-lg font-bold text-white">{dueSoonBills.length}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="red" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#FF98A2]/10">
              <AlertTriangle className="w-4 h-4 text-[#FF98A2]" />
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Overdue</p>
              <p className="text-lg font-bold text-white">{overdueBills.length}</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="green" className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2.5 rounded-[0px] bg-[#EFEFEF]/10">
              <span className="text-[#EFEFEF] text-sm font-bold">{'\u20B9'}</span>
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '2px' }}>Monthly Estimate</p>
              <p className="text-lg font-bold text-white">{'\u20B9'}{totalMonthlyEstimate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Add / Edit Bill Form */}
      {(isAddingBill || editingBill) && (
        <GlowCard glowColor="blue" className="p-6">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'var(--font-inter)' }}>
            {editingBill ? 'Edit Bill' : 'Add New Bill'}
          </h3>
          <form onSubmit={editingBill ? handleUpdateBill : handleCreateBill} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Bill Name</Label>
                <Input id="name" name="name" required
                  defaultValue={editingBill?.name || ''} placeholder="e.g. Rent, Netflix, EMI" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount_estimate" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Estimated Amount (&#8377;, optional)</Label>
                <Input id="amount_estimate" name="amount_estimate" type="number" step="0.01"
                  defaultValue={editingBill?.amount_estimate || ''} placeholder="e.g. 15000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recurrence" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Recurrence</Label>
                <select name="recurrence" id="recurrence"
                  defaultValue={editingBill?.due_rule?.recurrence || 'monthly'}
                  className="rounded-[0px] border border-white/10 bg-[#000000] h-9 pl-3 pr-8 text-sm text-white focus:border-[#FF98A2] outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="day_of_month" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Due Day of Month</Label>
                <Input id="day_of_month" name="day_of_month" type="number" min="1" max="31"
                  defaultValue={editingBill?.due_rule?.day_of_month || 1} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reminder_lead_days" className="text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>Remind (days before)</Label>
                <Input id="reminder_lead_days" name="reminder_lead_days" type="number" min="0" max="30"
                  defaultValue={editingBill?.reminder_lead_days || 3} />
              </div>
            </div>
            <div className="flex gap-2">
              <GlowButton type="submit" glowColor="purple" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingBill ? 'Update Bill' : 'Create Bill'}
              </GlowButton>
              <Button type="button" variant="ghost" onClick={() => { setIsAddingBill(false); setEditingBill(null) }}>
                Cancel
              </Button>
            </div>
          </form>
        </GlowCard>
      )}

      {/* Bill List */}
      {bills.length === 0 ? (
        <GlowCard glowColor="blue" className="p-10">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <Receipt className="w-12 h-12 text-[#8C8C8C]/50" style={{ marginBottom: '16px' }} />
            <p className="text-[#8C8C8C] text-sm">No bills tracked yet. Add your first bill to get reminders.</p>
          </div>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {/* Overdue Section */}
          {overdueBills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#FF98A2] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-roboto)' }}>Overdue</h3>
              <div className="space-y-2">
                {overdueBills.map(bill => (
                  <BillRow key={bill.id} bill={bill} onPay={handleMarkPaid} onEdit={(b) => { setEditingBill(b); setIsAddingBill(false) }} onDelete={handleDeleteBill} getRecurrenceLabel={getRecurrenceLabel} />
                ))}
              </div>
            </div>
          )}

          {/* Due Soon Section */}
          {dueSoonBills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#FF98A2]/70 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-roboto)' }}>Due Soon</h3>
              <div className="space-y-2">
                {dueSoonBills.map(bill => (
                  <BillRow key={bill.id} bill={bill} onPay={handleMarkPaid} onEdit={(b) => { setEditingBill(b); setIsAddingBill(false) }} onDelete={handleDeleteBill} getRecurrenceLabel={getRecurrenceLabel} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingBills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8C8C8C] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-roboto)' }}>Upcoming</h3>
              <div className="space-y-2">
                {upcomingBills.map(bill => (
                  <BillRow key={bill.id} bill={bill} onPay={handleMarkPaid} onEdit={(b) => { setEditingBill(b); setIsAddingBill(false) }} onDelete={handleDeleteBill} getRecurrenceLabel={getRecurrenceLabel} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BillRow({
  bill,
  onPay,
  onEdit,
  onDelete,
  getRecurrenceLabel,
}: {
  bill: Bill
  onPay: (id: string) => void
  onEdit: (bill: Bill) => void
  onDelete: (id: string) => void
  getRecurrenceLabel: (r: string) => string
}) {
  const dueDate = new Date(bill.next_due_at)
  const formattedDate = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <GlowCard glowColor={bill.isOverdue ? 'red' : bill.isDueSoon ? 'orange' : 'blue'} className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-[0px] flex items-center justify-center border border-white/5 ${
            bill.isOverdue ? 'bg-[#FF98A2]/10' : bill.isDueSoon ? 'bg-[#FF98A2]/10' : 'bg-[#FF98A2]/10'
          }`}>
            {bill.isOverdue ? (
              <AlertTriangle className="w-5 h-5 text-[#FF98A2]" />
            ) : bill.isDueSoon ? (
              <Clock className="w-5 h-5 text-[#FF98A2]/70" />
            ) : (
              <Receipt className="w-5 h-5 text-[#FF98A2]" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-inter)' }}>{bill.name}</h4>
            <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)' }}>
              {getRecurrenceLabel(bill.due_rule?.recurrence)} · Due {formattedDate}
              {bill.amount_estimate ? ` · &#8377;${bill.amount_estimate.toLocaleString('en-IN')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={bill.isOverdue ? 'destructive' : bill.isDueSoon ? 'warning' : 'secondary'} className="text-[10px]">
            {bill.isOverdue ? `${Math.abs(bill.daysUntilDue)}d overdue` : bill.isDueSoon ? `${bill.daysUntilDue}d left` : `${bill.daysUntilDue}d`}
          </Badge>
          <GlowButton onClick={() => onPay(bill.id)} glowColor="green"
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[#EFEFEF]">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Paid
          </GlowButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(bill)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(bill.id)} className="text-[#FF98A2] focus:text-[#FF98A2]">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {bill.payments.length > 0 && bill.payments[0] && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-[10px] text-[#8C8C8C]/50">
            Last paid: {new Date(bill.payments[0].paid_at).toLocaleDateString('en-IN')}
            {(bill.payments[0].amount || 0) > 0 ? ` · &#8377;${(bill.payments[0].amount || 0).toLocaleString('en-IN')}` : ''}
          </p>
        </div>
      )}
    </GlowCard>
  )
}
