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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,26,17,0.6)] backdrop-blur-sm p-4">
      <div className="bg-[#ffffff] text-[#01472e] border border-[#dde3d0] rounded-[0px] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde3d0]">
          <h2
            className="text-xl font-bold text-[#01472e]"
            style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700 }}
          >
            Add Transaction
          </h2>
          <button onClick={onClose} className="text-[#64705f] hover:text-[#01472e] transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
            ✕
          </button>
        </div>

        <form action={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex rounded-[11px] bg-[#f6f8f1] p-1 border border-[#dde3d0]">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 rounded-[11px] py-2 text-sm font-medium transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${type === 'expense' ? 'bg-[#ffffff] text-[#01472e] shadow-sm ring-1 ring-white/10' : 'text-[#64705f] hover:text-[#01472e]'}`}
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 rounded-[11px] py-2 text-sm font-medium transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${type === 'income' ? 'bg-[#ffffff] text-[#01472e] shadow-sm ring-1 ring-white/10' : 'text-[#64705f] hover:text-[#01472e]'}`}
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                Income
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-[#01472e]"
                  style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                >
                  Amount
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-[#64705f] sm:text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    className="block w-full rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] pl-8 pr-3 py-3 text-lg text-[#01472e] focus:border-[#01472e] focus:ring-1 focus:ring-[#01472e] outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-[#01472e]"
                    style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                  >
                    Category
                  </label>
                  <select name="category_id" required className="mt-1 block w-full rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] py-2 pl-3 pr-10 text-base text-[#01472e] focus:border-[#01472e] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-[#01472e]"
                    style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] py-2 px-3 text-[#01472e] focus:border-[#01472e] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-[#01472e]"
                  style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                >
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  name="merchant"
                  required
                  placeholder="e.g. Amazon, Uber, Local Grocery"
                  className="mt-1 block w-full rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] py-2 px-3 text-[#01472e] placeholder:text-[#64705f]/50 focus:border-[#01472e] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-[#01472e]"
                  style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                >
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  placeholder="#business, #vacation"
                  className="mt-1 block w-full rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] py-2 px-3 text-[#01472e] placeholder:text-[#64705f]/50 focus:border-[#01472e] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#f6f8f1] px-6 py-4 flex items-center justify-end space-x-3 border-t border-[#dde3d0]">
            <button type="button" onClick={onClose} className="rounded-[11px] border border-[#dde3d0] bg-transparent px-4 py-2 text-sm font-medium text-[#01472e] hover:bg-[#f6f8f1] focus:outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-[11px] border border-transparent bg-[#01472e] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#01472e]/90 focus:outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
