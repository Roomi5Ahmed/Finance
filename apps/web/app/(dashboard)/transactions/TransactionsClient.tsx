'use client'

import { useState } from 'react'
import AddExpenseModal from '@/components/transactions/AddExpenseModal'
import CSVImportModal from '@/components/transactions/CSVImportModal'
import { autoCategoriseTransactions, triggerMockWebhook } from '@/app/(dashboard)/transactions/actions'

export default function TransactionsClient({ initialTransactions, categories }: { initialTransactions: any[], categories: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [isAutoCategorising, setIsAutoCategorising] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleAutoCategorise = async () => {
    setIsAutoCategorising(true)
    try {
      const result = await autoCategoriseTransactions()
      alert(result.message)
    } catch (e: any) {
      alert(e.message || 'Error running auto-categorisation')
    } finally {
      setIsAutoCategorising(false)
    }
  }

  const handleSyncBank = async () => {
    setIsSyncing(true)
    try {
      const result = await triggerMockWebhook()
      alert(result.message)
    } catch (e: any) {
      alert(e.message || 'Error syncing bank')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your income and expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncBank}
            disabled={isSyncing}
            className="inline-flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 shadow-sm hover:bg-emerald-500/20 transition-colors focus:outline-none disabled:opacity-50"
          >
            <span className="mr-1.5">🏦</span> {isSyncing ? 'Syncing...' : 'Sync Bank'}
          </button>
          <button
            onClick={handleAutoCategorise}
            disabled={isAutoCategorising}
            className="inline-flex items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 shadow-sm hover:bg-indigo-500/20 transition-colors focus:outline-none disabled:opacity-50"
          >
            <span className="mr-1.5">✨</span> {isAutoCategorising ? 'Categorising...' : 'Auto Categorise'}
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-white/5 transition-colors focus:outline-none"
          >
            <span className="mr-1.5">📄</span> Import CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none"
          >
            <span className="mr-1.5">➕</span> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#151D2C] rounded-xl shadow-sm border border-white/5 p-3">
        <div className="flex flex-wrap gap-2">
          <input 
            type="text" 
            placeholder="Search transactions..." 
            className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-[#0B1121] py-1.5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none"
          />
          <select className="rounded-lg border border-white/10 bg-[#0B1121] py-1.5 pl-3 pr-8 text-sm text-white focus:border-indigo-500 outline-none">
            <option>All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-[#151D2C] rounded-xl shadow-sm border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-[#0B1121]/50">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Merchant</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tags</th>
                <th scope="col" className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-[#151D2C] divide-y divide-white/5">
              {initialTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 text-sm">
                    No transactions found. Add one to get started!
                  </td>
                </tr>
              ) : initialTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-400">
                    {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-white">
                    {tx.merchant}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm">
                    {tx.categories ? (
                       <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1E293B] text-slate-300 border border-white/5">
                         <span className="mr-1">{tx.categories.icon}</span> {tx.categories.name}
                       </span>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-400">
                    {tx.tags?.map((t: string) => `#${t}`).join(', ') || '—'}
                  </td>
                  <td className={`px-5 py-3 whitespace-nowrap text-sm font-semibold text-right ${tx.amount < 0 ? 'text-white' : 'text-emerald-400'}`}>
                    {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} />
      <CSVImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} />
    </div>
  )
}
