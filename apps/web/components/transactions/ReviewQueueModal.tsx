'use client'

import { useEffect, useState } from 'react'
import {
  fetchPayeeTransactions,
  resolveReviewGroup,
  setTransactionCategory,
} from '@/app/(dashboard)/transactions/actions'
import type { PayeeTxn, ReviewGroup } from '@/lib/api/review'
import { PERSONAL_TRANSFERS_CATEGORY } from '@/lib/categorisation/rules'

const TYPE_LABEL: Record<string, string> = {
  person: 'Person',
  business: 'Business',
  unknown: 'Unclear',
}

const TYPE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  person: { bg: 'rgba(13,148,136,0.1)', border: 'rgba(13,148,136,0.35)', color: '#0f766e' },
  business: { bg: 'rgba(1,71,46,0.08)', border: 'rgba(1,71,46,0.25)', color: '#01472e' },
  unknown: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#475569' },
}

const DEFAULT_TYPE_STYLE = { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#475569' }

function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

interface CategoryOption {
  id: string
  name: string
  icon?: string | null
}

interface ReviewQueueModalProps {
  isOpen: boolean
  onClose: () => void
  groups: ReviewGroup[]
  categories: CategoryOption[]
  onResolved?: () => void
}

export default function ReviewQueueModal({
  isOpen,
  onClose,
  groups,
  categories,
  onResolved,
}: ReviewQueueModalProps) {
  const [items, setItems] = useState<ReviewGroup[]>(groups)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [payeeTxns, setPayeeTxns] = useState<PayeeTxn[]>([])
  const [loadingTxns, setLoadingTxns] = useState(false)

  useEffect(() => setItems(groups), [groups])

  if (!isOpen) return null

  const visible = items.filter(g => !skipped.has(g.key))
  const totalTxns = visible.reduce((sum, g) => sum + g.count, 0)

  const assignToAll = async (group: ReviewGroup, categoryId: string) => {
    setBusyKey(group.key)
    setError(null)
    try {
      await resolveReviewGroup({ payee: group.payee, categoryId, applyToAll: true })
      setItems(prev => prev.filter(g => g.key !== group.key))
      if (expandedKey === group.key) {
        setExpandedKey(null)
        setPayeeTxns([])
      }
      onResolved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply category')
    } finally {
      setBusyKey(null)
    }
  }

  const personalTransfers = categories.find(
    c => (c.name || '').toLowerCase() === PERSONAL_TRANSFERS_CATEGORY.toLowerCase()
  )

  const skipGroup = (group: ReviewGroup) => {
    setSkipped(prev => new Set(prev).add(group.key))
    if (expandedKey === group.key) {
      setExpandedKey(null)
      setPayeeTxns([])
    }
  }

  const toggleExpand = async (group: ReviewGroup) => {
    if (expandedKey === group.key) {
      setExpandedKey(null)
      setPayeeTxns([])
      return
    }
    setExpandedKey(group.key)
    setLoadingTxns(true)
    setError(null)
    try {
      setPayeeTxns(await fetchPayeeTransactions(group.payee))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions')
      setExpandedKey(null)
    } finally {
      setLoadingTxns(false)
    }
  }

  const changeOneTxn = async (group: ReviewGroup, txn: PayeeTxn, categoryId: string) => {
    setBusyKey(`${group.key}:${txn.id}`)
    setError(null)
    try {
      await setTransactionCategory(txn.id, categoryId || null)
      const cleared = txn.needs_review && !!categoryId
      setPayeeTxns(prev =>
        prev.map(t => (t.id === txn.id ? { ...t, category_id: categoryId || null, needs_review: false } : t))
      )
      if (cleared) {
        const nextCount = group.count - 1
        if (nextCount <= 0) {
          setItems(prev => prev.filter(g => g.key !== group.key))
          setExpandedKey(null)
          setPayeeTxns([])
        } else {
          setItems(prev => prev.map(g => (g.key === group.key ? { ...g, count: nextCount } : g)))
        }
      }
      onResolved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update transaction')
    } finally {
      setBusyKey(null)
    }
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 12px',
    borderRadius: '999px',
    border: active ? '1.5px solid #01472e' : '1px solid #dde3d0',
    backgroundColor: active ? '#01472e' : '#ffffff',
    color: active ? '#fefae0' : '#01472e',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '20px 16px' }}>
      <div
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(8,26,17,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div style={{
        position: 'relative', width: '100%', maxWidth: '600px', backgroundColor: '#ffffff',
        color: '#01472e', border: '1px solid rgba(1,71,46,0.1)', borderRadius: '16px',
        overflow: 'hidden', animation: 'fadeSlideIn 0.6s cubic-bezier(0.19,1,0.22,1)',
        boxShadow: '0 25px 60px rgba(16,21,36,0.18)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid rgba(1,71,46,0.1)',
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: '19px', color: '#01472e', margin: 0 }}>
              Needs review
            </h2>
            <p style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontSize: '13px', color: '#64705f', margin: '4px 0 0' }}>
              {visible.length === 0
                ? 'All clear'
                : `${visible.length} payee${visible.length !== 1 ? 's' : ''} · ${totalTxns} transaction${totalTxns !== 1 ? 's' : ''} — one tap assigns a payee`}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '10px', border: '1px solid rgba(1,71,46,0.12)', backgroundColor: 'transparent',
            color: '#64705f', fontSize: '16px', cursor: 'pointer',
          }}>
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
              backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
              color: '#b91c1c', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 14px',
                backgroundColor: 'rgba(1,71,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
              }}>
                &#x2713;
              </div>
              <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>
                Nothing needs a category
              </p>
              <p style={{ fontSize: '13px', color: '#64705f', margin: 0 }}>
                {skipped.size > 0
                  ? `${skipped.size} payee${skipped.size !== 1 ? 's' : ''} skipped — they reappear next time you open the queue.`
                  : 'Every transaction has a category. Nice.'}
              </p>
            </div>
          ) : (
            visible.map(group => {
              const busy = busyKey === group.key
              const type = TYPE_STYLE[group.payeeType] ?? DEFAULT_TYPE_STYLE
              const expanded = expandedKey === group.key

              return (
                <div key={group.key} style={{
                  border: '1px solid #dde3d0', borderRadius: '14px', padding: '16px',
                  marginBottom: '12px', backgroundColor: '#ffffff',
                  opacity: busy ? 0.6 : 1, transition: 'opacity 0.2s',
                }}>
                  {/* Row 1: name + badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#01472e' }}>
                          {group.payee}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '3px 8px', borderRadius: '999px',
                          backgroundColor: type.bg, border: `1px solid ${type.border}`, color: type.color,
                        }}>
                          {TYPE_LABEL[group.payeeType] || 'Unclear'}
                        </span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontSize: '12.5px', color: '#64705f', margin: '6px 0 0' }}>
                        {group.count} transaction{group.count !== 1 ? 's' : ''} · {formatINR(group.total)} total
                        {group.typical > 0 && ` · ~${formatINR(group.typical)} each`}
                        {group.firstDate && ` · ${group.firstDate}${group.lastDate && group.lastDate !== group.firstDate ? ` → ${group.lastDate}` : ''}`}
                      </p>
                    </div>
                    <button
                      onClick={() => skipGroup(group)}
                      disabled={busy}
                      title="Skip for now"
                      style={{
                        background: 'none', border: 'none', color: '#64705f', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600, padding: '4px 6px', whiteSpace: 'nowrap',
                      }}
                    >
                      Skip
                    </button>
                  </div>

                  {/* AI suggestion */}
                  {group.suggestion && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px',
                      padding: '8px 10px', borderRadius: '10px',
                      backgroundColor: 'rgba(233,237,201,0.6)', border: '1px solid rgba(1,71,46,0.15)',
                      fontSize: '12.5px', color: '#01472e',
                    }}>
                      <span style={{ fontWeight: 700 }}>AI suggests</span>
                      <span>{group.suggestion.icon} {group.suggestion.name}</span>
                      <span style={{ color: '#64705f' }}>{Math.round(group.suggestion.confidence * 100)}% sure</span>
                    </div>
                  )}

                  {/* Category chips — assign to ALL of this payee */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '12px' }}>
                    {personalTransfers && (
                      <button
                        onClick={() => assignToAll(group, personalTransfers.id)}
                        disabled={busy}
                        style={{ ...chipStyle(false), backgroundColor: '#f6f8f1', fontStyle: 'italic' }}
                      >
                        ⇄ Personal Transfer
                      </button>
                    )}
                                {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => assignToAll(group, c.id)}
                        disabled={busy}
                        style={chipStyle(group.suggestion?.categoryId === c.id)}
                      >
                        {c.icon} {c.name}
                      </button>
                    ))}
                  </div>

                  {/* Only-one path */}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => toggleExpand(group)}
                      disabled={busy}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: '#0f766e', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {expanded ? '▾ Hide individual transactions' : `Apply to just one transaction instead (${group.count})`}
                    </button>

                    {expanded && (
                      <div style={{ marginTop: '10px', borderTop: '1px dashed #dde3d0', paddingTop: '10px' }}>
                        {loadingTxns ? (
                          <p style={{ fontSize: '12.5px', color: '#64705f', margin: 0 }}>Loading…</p>
                        ) : (
                          payeeTxns.map(txn => (
                            <div key={txn.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: '10px', padding: '7px 0',
                            }}>
                              <span style={{ fontSize: '12.5px', color: '#64705f', whiteSpace: 'nowrap' }}>
                                {new Date(txn.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {' · '}
                                <span style={{ color: txn.amount < 0 ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                                  {txn.amount < 0 ? '-' : '+'}{formatINR(Math.abs(txn.amount))}
                                </span>
                                {txn.needs_review && ' · needs review'}
                              </span>
                              <select
                                value={txn.category_id || ''}
                                disabled={busyKey === `${group.key}:${txn.id}`}
                                onChange={e => changeOneTxn(group, txn, e.target.value)}
                                style={{
                                  padding: '6px 10px', borderRadius: '8px', border: '1px solid #dde3d0',
                                  backgroundColor: '#f6f8f1', color: '#01472e', fontSize: '12px',
                                  maxWidth: '170px', cursor: 'pointer',
                                }}
                              >
                                <option value="">— None —</option>
                    {categories.map((c) => (
                                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                ))}
                              </select>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
          padding: '14px 24px 20px', borderTop: '1px solid rgba(1,71,46,0.1)',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '11px', border: '1px solid rgba(1,71,46,0.12)',
            backgroundColor: 'transparent', color: '#64705f', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
