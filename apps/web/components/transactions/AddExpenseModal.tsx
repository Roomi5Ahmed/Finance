'use client'

import { useState } from 'react'
import { addTransaction } from '@/app/(dashboard)/transactions/actions'

type Category = {
  id: string
  name: string
  icon: string
  color: string
}

export default function AddExpenseModal({ 
  isOpen, 
  onClose,
  categories = [] 
}: { 
  isOpen: boolean
  onClose: () => void
  categories?: Category[]
}) {
  const [type, setType] = useState('expense')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      formData.append('type', type)
      await addTransaction(formData)
      onClose()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Failed to add transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#151D2C] border border-white/5 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Add Transaction</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <form action={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex rounded-lg bg-[#0B1121] p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${type === 'expense' ? 'bg-[#1E293B] text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${type === 'income' ? 'bg-[#1E293B] text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Income
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Amount</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-500 sm:text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    className="block w-full rounded-md border border-white/10 bg-[#0B1121] pl-8 pr-3 py-3 text-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Category</label>
                  <select name="category_id" required className="mt-1 block w-full rounded-md border border-white/10 bg-[#0B1121] py-2 pl-3 pr-10 text-base text-white focus:border-indigo-500 outline-none sm:text-sm">
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full rounded-md border border-white/10 bg-[#0B1121] py-2 px-3 text-white focus:border-indigo-500 outline-none sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Merchant / Payee</label>
                <input
                  type="text"
                  name="merchant"
                  required
                  placeholder="e.g. Amazon, Uber, Local Grocery"
                  className="mt-1 block w-full rounded-md border border-white/10 bg-[#0B1121] py-2 px-3 text-white focus:border-indigo-500 outline-none sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Tags</label>
                <input
                  type="text"
                  name="tags"
                  placeholder="#business, #vacation"
                  className="mt-1 block w-full rounded-md border border-white/10 bg-[#0B1121] py-2 px-3 text-white focus:border-indigo-500 outline-none sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0B1121] px-6 py-4 flex items-center justify-end space-x-3 border-t border-white/5">
            <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 focus:outline-none transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none transition-colors disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
