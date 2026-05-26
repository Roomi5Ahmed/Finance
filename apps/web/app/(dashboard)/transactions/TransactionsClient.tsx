'use client'

import React, { useState, useMemo } from 'react'
import AddExpenseModal from '@/components/transactions/AddExpenseModal'
import CSVImportModal from '@/components/transactions/CSVImportModal'
import { GlowButton } from '@/components/ui/glow-button'
import { GlowCard } from '@/components/ui/spotlight-card'
import { autoCategoriseTransactions, triggerMockWebhook } from '@/app/(dashboard)/transactions/actions'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

type SortKey = 'date' | 'merchant' | 'category' | 'amount'

export default function TransactionsClient({ initialTransactions, categories }: { initialTransactions: any[], categories: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [isAutoCategorising, setIsAutoCategorising] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Table state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

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

  const handleSort = (column: SortKey) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const filteredAndSorted = useMemo(() => {
    let data = [...initialTransactions]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter((tx: any) =>
        tx.merchant?.toLowerCase().includes(q) ||
        tx.categories?.name?.toLowerCase().includes(q) ||
        tx.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      data = data.filter((tx: any) => tx.categories?.name === selectedCategory)
    }

    // Sort
    if (sortColumn) {
      data.sort((a: any, b: any) => {
        let aVal: any, bVal: any
        switch (sortColumn) {
          case 'date':
            aVal = new Date(a.date).getTime()
            bVal = new Date(b.date).getTime()
            break
          case 'merchant':
            aVal = (a.merchant || '').toLowerCase()
            bVal = (b.merchant || '').toLowerCase()
            break
          case 'category':
            aVal = (a.categories?.name || '').toLowerCase()
            bVal = (b.categories?.name || '').toLowerCase()
            break
          case 'amount':
            aVal = a.amount
            bVal = b.amount
            break
          default:
            return 0
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return data
  }, [initialTransactions, searchQuery, selectedCategory, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize))
  const paginatedData = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const SortableHeader = ({ column, children }: { column: SortKey, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(column)}
      className="h-8 px-2 text-xs uppercase tracking-wider font-semibold text-slate-400 hover:text-white"
    >
      {children}
      <ArrowUpDown className={`ml-1.5 h-3 w-3 ${sortColumn === column ? 'text-indigo-400' : 'text-slate-600'}`} />
    </Button>
  )

  return (
    <div className="space-y-4 animate-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your income and expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlowButton onClick={handleSyncBank} disabled={isSyncing} glowColor="green"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-emerald-400">
            <span className="mr-1.5">🏦</span> {isSyncing ? 'Syncing...' : 'Sync Bank'}
          </GlowButton>
          <GlowButton onClick={handleAutoCategorise} disabled={isAutoCategorising} glowColor="purple"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-indigo-400">
            <span className="mr-1.5">✨</span> {isAutoCategorising ? 'Categorising...' : 'Auto Categorise'}
          </GlowButton>
          <GlowButton onClick={() => setIsCsvModalOpen(true)} glowColor="blue"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white">
            <span className="mr-1.5">📄</span> Import CSV
          </GlowButton>
          <GlowButton onClick={() => setIsModalOpen(true)} glowColor="purple"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600/30">
            <span className="mr-1.5">➕</span> Add Transaction
          </GlowButton>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <GlowCard glowColor="blue" className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by merchant, category, or tag..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1) }}
            className="rounded-lg border border-white/10 bg-[#0B1121] h-9 pl-3 pr-8 text-sm text-white focus:border-indigo-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </GlowCard>

      {/* Data Table */}
      <GlowCard glowColor="purple" className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0B1121]/50 hover:bg-[#0B1121]/50">
              <TableHead>
                <SortableHeader column="date">Date</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader column="merchant">Merchant</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader column="category">Category</SortableHeader>
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>
                <SortableHeader column="amount">Amount</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-slate-500">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'No transactions match your filters.'
                    : 'No transactions found. Add one to get started!'}
                </TableCell>
              </TableRow>
            ) : paginatedData.map((tx: any) => (
              <TableRow key={tx.id}>
                <TableCell className="text-slate-400 text-xs">
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="font-medium text-white text-sm">
                  {tx.merchant}
                </TableCell>
                <TableCell>
                  {tx.categories ? (
                    <Badge variant="outline" className="gap-1">
                      <span>{tx.categories.icon}</span> {tx.categories.name}
                    </Badge>
                  ) : <span className="text-slate-600">—</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {tx.tags?.length > 0
                    ? tx.tags.map((t: string, i: number) => (
                        <Badge key={i} variant="secondary" className="mr-1 text-[10px]">#{t}</Badge>
                      ))
                    : <span className="text-slate-600">—</span>
                  }
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={tx.amount < 0 ? 'destructive' : 'success'} className="font-semibold text-xs tabular-nums">
                    {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tx.id)}>
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Edit transaction</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400 focus:text-red-400">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlowCard>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>
          Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} transaction{filteredAndSorted.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-slate-400 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} />
      <CSVImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} />
    </div>
  )
}
