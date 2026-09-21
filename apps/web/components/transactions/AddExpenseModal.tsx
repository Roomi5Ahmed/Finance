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
      <div className="bg-[#181818] border border-white/5 rounded-[0px] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2
            className="text-xl font-bold text-[#EFEFEF]"
            style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700 }}
          >
            Add Transaction
          </h2>
          <button onClick={onClose} className="text-[#8C8C8C] hover:text-[#EFEFEF] transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
            ✕
          </button>
        </div>

        <form action={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex rounded-[11px] bg-[#000000] p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 rounded-[11px] py-2 text-sm font-medium transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${type === 'expense' ? 'bg-[#181818] text-[#EFEFEF] shadow-sm ring-1 ring-white/10' : 'text-[#8C8C8C] hover:text-[#EFEFEF]'}`}
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 rounded-[11px] py-2 text-sm font-medium transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${type === 'income' ? 'bg-[#181818] text-[#EFEFEF] shadow-sm ring-1 ring-white/10' : 'text-[#8C8C8C] hover:text-[#EFEFEF]'}`}
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                Income
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-[#EFEFEF]"
                  style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                >
                  Amount
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-[#8C8C8C] sm:text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    className="block w-full rounded-[11px] border border-white/5 bg-[#000000] pl-8 pr-3 py-3 text-lg text-[#EFEFEF] focus:border-[#FF98A2] focus:ring-1 focus:ring-[#FF98A2] outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-[#EFEFEF]"
                    style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                  >
                    Category
                  </label>
                  <select name="category_id" required className="mt-1 block w-full rounded-[11px] border border-white/5 bg-[#000000] py-2 pl-3 pr-10 text-base text-[#EFEFEF] focus:border-[#FF98A2] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-[#EFEFEF]"
                    style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full rounded-[11px] border border-white/5 bg-[#000000] py-2 px-3 text-[#EFEFEF] focus:border-[#FF98A2] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-[#EFEFEF]"
                  style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                >
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  name="merchant"
                  required
                  placeholder="e.g. Amazon, Uber, Local Grocery"
                  className="mt-1 block w-full rounded-[11px] border border-white/5 bg-[#000000] py-2 px-3 text-[#EFEFEF] placeholder:text-[#8C8C8C]/50 focus:border-[#FF98A2] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-[#EFEFEF]"
                  style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
                >
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  placeholder="#business, #vacation"
                  className="mt-1 block w-full rounded-[11px] border border-white/5 bg-[#000000] py-2 px-3 text-[#EFEFEF] placeholder:text-[#8C8C8C]/50 focus:border-[#FF98A2] outline-none sm:text-sm transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#000000] px-6 py-4 flex items-center justify-end space-x-3 border-t border-white/5">
            <button type="button" onClick={onClose} className="rounded-[11px] border border-white/5 bg-transparent px-4 py-2 text-sm font-medium text-[#EFEFEF] hover:bg-white/5 focus:outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-[11px] border border-transparent bg-[#FF98A2] px-4 py-2 text-sm font-medium text-[#000000] shadow-sm hover:bg-[#FF98A2]/90 focus:outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
