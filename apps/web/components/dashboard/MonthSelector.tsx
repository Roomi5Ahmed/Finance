'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays, Lock } from 'lucide-react'

export interface SelectorMonth {
  month: string
  txn_count: number
}

export function monthDisplay(month: string, long = false): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
    month: long ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function MonthSelector({
  month,
  months,
  isCurrentMonth,
  pathname,
  onMonthChange,
}: {
  month: string
  months: SelectorMonth[]
  isCurrentMonth: boolean
  pathname: string
  onMonthChange?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const keys = months.map(m => m.month)
  const earliest = keys[keys.length - 1] ?? month
  const newest = isCurrentMonth ? month : keys[0] || month
  const canPrev = month > earliest
  const canNext = month < newest

  const go = (target: string) => {
    setOpen(false)
    router.push(`${pathname}?month=${target}`)
    onMonthChange?.()
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(254,250,224,0.22)',
          borderRadius: '999px',
          padding: '4px 6px',
        }}
      >
        <SelectorArrow disabled={!canPrev} onClick={() => canPrev && go(shiftKey(month, -1))} dir="left" />
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: 'transparent',
            border: 'none',
            color: '#fefae0',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            padding: '5px 10px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="Pick a month"
        >
          <CalendarDays className="w-3.5 h-3.5" style={{ opacity: 0.7 }} />
          {monthDisplay(month, true)}
          {!isCurrentMonth && <Lock className="w-3 h-3" style={{ opacity: 0.55 }} />}
        </button>
        <SelectorArrow disabled={!canNext} onClick={() => canNext && go(shiftKey(month, 1))} dir="right" />
      </div>

      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 40,
            minWidth: '230px',
            maxHeight: '320px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(1,71,46,0.12)',
            borderRadius: '14px',
            boxShadow: '0 18px 44px rgba(16,21,36,0.22)',
            padding: '6px',
          }}
        >
          {months.map(m => {
            const active = m.month === month
            return (
              <button
                key={m.month}
                onClick={() => go(m.month)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: active ? '#01472e' : 'transparent',
                  color: active ? '#fefae0' : '#01472e',
                  fontSize: '13px',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  fontWeight: active ? 700 : 500,
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.backgroundColor = '#f6f8f1'
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span>{monthDisplay(m.month, true)}</span>
                <span style={{ fontSize: '11px', opacity: 0.65 }}>
                  {m.txn_count > 0 ? `${m.txn_count} txn${m.txn_count !== 1 ? 's' : ''}` : 'no data'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SelectorArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous month' : 'Next month'}
      style={{
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        border: 'none',
        backgroundColor: 'transparent',
        color: disabled ? 'rgba(254,250,224,0.3)' : '#fefae0',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {dir === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  )
}

function shiftKey(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
