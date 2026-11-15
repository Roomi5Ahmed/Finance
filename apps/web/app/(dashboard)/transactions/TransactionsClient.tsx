'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AddExpenseModal from '@/components/transactions/AddExpenseModal'
import CSVImportModal from '@/components/transactions/CSVImportModal'
import PDFImportModal from '@/components/transactions/PDFImportModal'
import ReviewQueueModal from '@/components/transactions/ReviewQueueModal'
import { GlowButton } from '@/components/ui/glow-button'
import { GlowCard } from '@/components/ui/spotlight-card'
import {
  autoCategoriseTransactions, triggerMockWebhook, setTransactionCategory, resolveReviewGroup,
} from '@/app/(dashboard)/transactions/actions'
import type { ReviewGroup } from '@/lib/api/review'
import { currentMonthKey, monthLabel } from '@/lib/api/dashboard'
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

interface CategoryOffer {
  payee: string
  count: number
  categoryId: string
}

interface TxnRow {
  id: string
  date: string
  amount: number
  merchant?: string | null
  tags?: string[] | null
  categories?: { name?: string | null; icon?: string | null } | null
}

interface CategoryRow {
  id: string
  name: string
  icon: string
  color: string
}

export default function TransactionsClient({
  initialTransactions,
  categories,
  initialReviewGroups = [],
}: {
  initialTransactions: TxnRow[]
  categories: CategoryRow[]
  initialReviewGroups?: ReviewGroup[]
}) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewGroups, setReviewGroups] = useState<ReviewGroup[]>(initialReviewGroups)
  const [categoryOffer, setCategoryOffer] = useState<CategoryOffer | null>(null)
  const [isAutoCategorising, setIsAutoCategorising] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [importToast, setImportToast] = useState<{ month: string; label: string } | null>(null)

  useEffect(() => {
    if (!importToast) return
    const timer = setTimeout(() => setImportToast(null), 8000)
    return () => clearTimeout(timer)
  }, [importToast])

  const handleImported = React.useCallback((months: string[]) => {
    router.refresh()
    const current = currentMonthKey()
    if (months.length === 1 && months[0] && months[0] < current) {
      setImportToast({ month: months[0], label: monthLabel(months[0]) })
    }
  }, [router])

  useEffect(() => setReviewGroups(initialReviewGroups), [initialReviewGroups])

  const reviewTxnCount = reviewGroups.reduce((sum, g) => sum + g.count, 0)

  const handleAutoCategorise = async () => {
    setIsAutoCategorising(true)
    setSyncMessage('')
    try {
      const result = await autoCategoriseTransactions()
      setSyncMessage(result.message)
      router.refresh()
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : 'Error running auto-categorisation')
    } finally {
      setIsAutoCategorising(false)
    }
  }

  const handleSyncBank = async () => {
    setIsSyncing(true)
    setSyncMessage('')
    try {
      const result = await triggerMockWebhook()
      setSyncMessage(result.message)
      router.refresh()
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : 'Error syncing bank')
    } finally {
      setIsSyncing(false)
    }
  }

  // Single-transaction category change (PRD 4.5) + apply-to-all offer.
  const handleCategoryChange = async (tx: TxnRow, categoryId: string | null) => {
    try {
      const result = await setTransactionCategory(tx.id, categoryId)
      router.refresh()
      if (result.payee && categoryId && result.count > 1) {
        setCategoryOffer({ payee: result.payee, count: result.count, categoryId })
      } else {
        setCategoryOffer(null)
      }
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : 'Failed to update category')
    }
  }

  const applyOfferToAll = async () => {
    if (!categoryOffer) return
    try {
      await resolveReviewGroup({
        payee: categoryOffer.payee,
        categoryId: categoryOffer.categoryId,
        applyToAll: true,
      })
      setCategoryOffer(null)
      setSyncMessage(
        `Applied to all transactions from ${categoryOffer.payee} — future ones will be categorised automatically.`
      )
      router.refresh()
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : 'Failed to apply to all')
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

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter(tx =>
        tx.merchant?.toLowerCase().includes(q) ||
        tx.categories?.name?.toLowerCase().includes(q) ||
        tx.tags?.some(t => t.toLowerCase().includes(q))
      )
    }

    if (selectedCategory !== 'all') {
      data = data.filter(tx => tx.categories?.name === selectedCategory)
    }

    if (sortColumn) {
      data.sort((a, b) => {
        let aVal: string | number = 0
        let bVal: string | number = 0
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
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }
        const cmp = String(aVal).localeCompare(String(bVal))
        return sortDirection === 'asc' ? cmp : -cmp
      })
    }

    return data
  }, [initialTransactions, searchQuery, selectedCategory, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize))
  const paginatedData = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const SortableHeader = ({ column, children }: { column: SortKey, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(column)}
      className="h-8 px-2 text-xs uppercase tracking-wider font-semibold text-[#64705f] hover:text-[#01472e] transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
      style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
    >
      {children}
      <ArrowUpDown className={`ml-1.5 h-3 w-3 ${sortColumn === column ? 'text-[#01472e]' : 'text-[#64705f]/50'}`} />
    </Button>
  )

  return (
    <div className="animate-in text-[#01472e]" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#fefae0] tracking-tight"
            style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700 }}
          >
            Transactions
          </h1>
          <p className="mt-1.5 text-sm text-[#ccd5ae]">
            Manage your income and expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlowButton onClick={handleSyncBank} disabled={isSyncing} glowColor="green"
            className="glow-on-shell inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-[#ccd5ae]">
            <span className="mr-1.5">🏦</span> {isSyncing ? 'Syncing...' : 'Sync Bank'}
          </GlowButton>
          <GlowButton onClick={handleAutoCategorise} disabled={isAutoCategorising} glowColor="purple"
            className="glow-on-shell inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-[#fefae0]">
            <span className="mr-1.5">✨</span> {isAutoCategorising ? 'Categorising...' : 'Auto Categorise'}
          </GlowButton>
          <GlowButton onClick={() => setIsCsvModalOpen(true)} glowColor="blue"
            className="glow-on-shell inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-[#fefae0]">
            <span className="mr-1.5">📄</span> Import CSV
          </GlowButton>
          <GlowButton onClick={() => setIsPdfModalOpen(true)} glowColor="orange"
            className="glow-on-shell inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-[#fefae0]">
            <span className="mr-1.5">📑</span> Import PDF
          </GlowButton>
          <GlowButton onClick={() => setIsModalOpen(true)} glowColor="purple"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-[#01472e] bg-[#fefae0]">
            <span className="mr-1.5">➕</span> Add Transaction
          </GlowButton>
        </div>
      </div>

      {/* Review queue banner (PRD 4.4) */}
      {reviewTxnCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: '12px 16px', borderRadius: '11px',
          backgroundColor: 'rgba(233,237,201,0.16)',
          border: '1px solid rgba(254,250,224,0.3)',
          fontSize: '13px', color: '#fefae0', flexWrap: 'wrap',
        }}>
          <span>
            <strong>{reviewTxnCount}</strong> transaction{reviewTxnCount !== 1 ? 's' : ''} from{' '}
            <strong>{reviewGroups.length}</strong> payee{reviewGroups.length !== 1 ? 's' : ''} need
            a category — assign each payee once and it sticks.
          </span>
          <button
            onClick={() => setIsReviewOpen(true)}
            style={{
              padding: '8px 16px', borderRadius: '9px', border: 'none',
              backgroundColor: '#fefae0', color: '#01472e', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Review now
          </button>
        </div>
      )}

      {/* Apply-to-all offer after a single change (PRD 4.5) */}
      {categoryOffer && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: '12px 16px', borderRadius: '11px',
          backgroundColor: 'rgba(254,250,224,0.1)',
          border: '1px solid rgba(254,250,224,0.22)',
          fontSize: '13px', color: '#fefae0', flexWrap: 'wrap',
        }}>
          <span>
            Apply to all <strong>{categoryOffer.count}</strong> transactions from{' '}
            <strong>“{categoryOffer.payee}”</strong> too? Future payments will get this category
            automatically.
          </span>
          <span style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={applyOfferToAll}
              style={{
                padding: '8px 16px', borderRadius: '9px', border: 'none',
                backgroundColor: '#fefae0', color: '#01472e', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Apply to all
            </button>
            <button
              onClick={() => setCategoryOffer(null)}
              style={{
                padding: '8px 14px', borderRadius: '9px',
                border: '1px solid rgba(254,250,224,0.35)',
                backgroundColor: 'transparent', color: '#fefae0', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Just this one
            </button>
          </span>
        </div>
      )}

      {syncMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: '11px',
          backgroundColor: syncMessage.toLowerCase().includes('error') ? 'rgba(254,250,224,0.12)' : 'rgba(254,250,224,0.08)',
          border: syncMessage.toLowerCase().includes('error') ? '1px solid rgba(254,250,224,0.35)' : '1px solid rgba(254,250,224,0.18)',
          fontSize: '13px',
          color: syncMessage.toLowerCase().includes('error') ? '#fefae0' : '#fefae0',
        }}>
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage('')} style={{ background: 'none', border: 'none', color: '#ccd5ae', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>&#x2715;</button>
        </div>
      )}

      <GlowCard glowColor="blue" className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute text-[#64705f]" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', pointerEvents: 'none' }} />
            <Input
              placeholder="Search by merchant, category, or tag..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1) }}
            className="rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] h-9 pl-3 pr-8 text-sm text-[#01472e] focus:border-[#01472e] outline-none transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
            style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </GlowCard>

      <GlowCard glowColor="purple" className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#ffffff]/50 hover:bg-[#ffffff]/50">
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
                <TableCell colSpan={6} className="text-center h-24 text-[#64705f]">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'No transactions match your filters.'
                    : 'No transactions found. Add one to get started!'}
                </TableCell>
              </TableRow>
            ) : paginatedData.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-[#64705f] text-xs">
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="font-medium text-[#01472e] text-sm">
                  {tx.merchant}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 justify-start hover:bg-[#f6f8f1]"
                        title="Change category"
                      >
                        {tx.categories ? (
                          <Badge variant="outline" className="gap-1">
                            <span>{tx.categories.icon}</span> {tx.categories.name}
                          </Badge>
                        ) : (
                          <span className="text-xs font-normal text-[#64705f]/70">Set category…</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                      <DropdownMenuLabel>Assign category</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleCategoryChange(tx, null)}>
                        — None —
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {categories.map((c) => (
                        <DropdownMenuItem key={c.id} onClick={() => handleCategoryChange(tx, c.id)}>
                          {c.icon} {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-xs">
                  {tx.tags && tx.tags.length > 0
                    ? tx.tags.map((t: string, i: number) => (
                        <Badge key={i} variant="secondary" className="mr-1 text-[10px]">#{t}</Badge>
                      ))
                    : <span className="text-[#64705f]/50">—</span>
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
        </div>
      </GlowCard>

      <div className="flex items-center justify-between text-sm text-[#ccd5ae] pt-1">
        <div>
          Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} transaction{filteredAndSorted.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="border-[rgba(254,250,224,0.35)] text-[#fefae0] hover:bg-[rgba(254,250,224,0.1)] hover:border-[rgba(254,250,224,0.5)]"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-[#ccd5ae] px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="border-[rgba(254,250,224,0.35)] text-[#fefae0] hover:bg-[rgba(254,250,224,0.1)] hover:border-[rgba(254,250,224,0.5)]"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} />
      <CSVImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} onImported={handleImported} />
      <PDFImportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onReview={() => setIsReviewOpen(true)}
        onImported={handleImported}
      />
      <ReviewQueueModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        groups={reviewGroups}
        categories={categories}
        onResolved={() => router.refresh()}
      />

      {/* Post-import toast: jump to a past month that was just filled (PRD 4.1) */}
      {importToast && (
        <div
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 70,
            display: 'flex', alignItems: 'center', gap: '12px',
            backgroundColor: '#01472e', color: '#fefae0',
            borderRadius: '12px', padding: '12px 14px 12px 16px',
            boxShadow: '0 18px 44px rgba(16,21,36,0.35)',
            animation: 'fadeSlideIn 0.6s cubic-bezier(0.19,1,0.22,1)',
          }}
        >
          <span style={{ fontSize: '13px' }}>Imported to {importToast.label}.</span>
          <button
            onClick={() => {
              router.push(`/dashboard?month=${importToast.month}`)
              setImportToast(null)
            }}
            style={{
              padding: '7px 14px', borderRadius: '9px', border: 'none',
              backgroundColor: '#fefae0', color: '#01472e',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            View {importToast.label}
          </button>
          <button
            onClick={() => setImportToast(null)}
            aria-label="Dismiss"
            style={{
              background: 'transparent', border: 'none', color: '#ccd5ae',
              fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        </div>
      )}
    </div>
  )
}
