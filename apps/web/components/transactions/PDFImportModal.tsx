'use client'

import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { bulkAddTransactions } from '@/app/(dashboard)/transactions/actions'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

const DATE_RE = /^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})\b/
const AMOUNT_RE = /(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(Dr|Cr)?/i
const DETAIL_RE = /(?:^|\s)((?:Paid\s+(?:to|at|for))|(?:Received\s+from)|(?:Sent\s+to))\s+(.+?)(?=\s+(?:₹|INR|Rs\.?)|$)/i
const TIME_RE = /^\d{1,2}:\d{2}\s*(?:AM|PM)$/i
const JUNK_MERCHANT_RE = /^(?:sent|received|amount|date|time|total|balance)$/i
const NUMERIC_MERCHANT_RE = /^[₹\d\s.,/:-]+$/

async function extractPdfLines(file: File): Promise<string[]> {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjsLib.getDocument({ data })
  const doc = await task.promise
  const lines: string[] = []

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()

      const frags: { x: number; y: number; w: number; s: string }[] = []
      for (const item of content.items) {
        if (!('str' in item) || !item.str) continue
        frags.push({ x: item.transform[4], y: item.transform[5], w: item.width, s: item.str })
      }
      frags.sort((a, b) => b.y - a.y || a.x - b.x)

      const rows: typeof frags[] = []
      for (const f of frags) {
        const last = rows[rows.length - 1]
        if (last && last[0] !== undefined && Math.abs(last[0].y - f.y) <= 2.5) last.push(f)
        else rows.push([f])
      }

      for (const row of rows) {
        row.sort((a, b) => a.x - b.x)
        let line = ''
        let prevEnd: number | null = null
        for (const f of row) {
          if (prevEnd !== null && f.x - prevEnd > 1.5) line += ' '
          line += f.s
          prevEnd = f.x + f.w
        }
        const trimmed = line.replace(/\s+/g, ' ').trim()
        if (trimmed) lines.push(trimmed)
      }
    }
  } finally {
    await task.destroy()
  }

  return lines
}

function parseGooglePayLines(lines: string[]) {
  const out: { date: Date; merchant: string; amount: number }[] = []
  let date: Date | null = null
  let merchant = ''
  let amount: number | null = null
  let isCredit: boolean | null = null

  const flush = () => {
    if (
      date && merchant && amount !== null && amount > 0 &&
      !JUNK_MERCHANT_RE.test(merchant) && !NUMERIC_MERCHANT_RE.test(merchant)
    ) {
      out.push({ date, merchant: merchant.substring(0, 255), amount: isCredit ? amount : -amount })
    }
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line || TIME_RE.test(line)) continue

    const dm = line.match(DATE_RE)
    const dayStr = dm?.[1]
    const monStr = dm?.[2]
    const yearStr = dm?.[3]
    if (dayStr && monStr && yearStr) {
      const month = MONTHS[monStr.toLowerCase().substring(0, 3)]
      if (month !== undefined) {
        const nextDate = new Date(parseInt(yearStr, 10), month, parseInt(dayStr, 10))
        if (!isNaN(nextDate.getTime())) {
          flush()
          date = nextDate
          merchant = ''
          amount = null
          isCredit = null
        }
      }
    }

    if (amount === null) {
      const am = line.match(AMOUNT_RE)
      const amountStr = am?.[1]
      if (am && amountStr) {
        const value = parseFloat(amountStr.replace(/,/g, ''))
        if (!isNaN(value) && value > 0) {
          amount = value
          const drCr = am[2]?.toLowerCase()
          if (drCr) isCredit = drCr === 'cr'
        }
      }
    }

    if (!merchant) {
      const detail = line.match(DETAIL_RE)
      const verb = detail?.[1]
      const rest = detail?.[2]
      if (verb && rest) {
        merchant = rest.trim()
        isCredit = verb.toLowerCase().startsWith('received')
      }
    }
  }
  flush()

  return out
}

export default function PDFImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [template, setTemplate] = useState('GPAY')
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen) return null

  const handleUpload = async () => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('PDF file is too large (max 10MB).')
      return
    }
    setIsUploading(true)

    try {
      const parsedTransactions = []

      if (template === 'GPAY') {
        const lines = await extractPdfLines(file)
        const rows = parseGooglePayLines(lines)

        for (const row of rows) {
          parsedTransactions.push({
            date: row.date,
            merchant: row.merchant,
            amount: row.amount,
            notes: 'Imported via PDF',
          })
        }
      }

      if (parsedTransactions.length === 0) {
        alert('Could not find any valid transactions in this file matching the template.')
        return
      }

      await bulkAddTransactions(parsedTransactions)
      alert(`Successfully imported ${parsedTransactions.length} transactions!`)
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to parse PDF file.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(8,26,17,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '480px', backgroundColor: '#ffffff',
        color: '#01472e',
        border: '1px solid rgba(1,71,46,0.1)', borderRadius: '16px', overflow: 'hidden',
        animation: 'fadeSlideIn 0.6s cubic-bezier(0.19,1,0.22,1)',
        boxShadow: '0 25px 60px rgba(16,21,36,0.18)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid rgba(1,71,46,0.1)' }}>
          <h2 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: '20px', color: '#01472e', margin: 0 }}>
            Import PDF
          </h2>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '10px', border: '1px solid rgba(1,71,46,0.12)', backgroundColor: 'transparent',
            color: '#64705f', fontSize: '16px', cursor: 'pointer', transition: 'all 0.3s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(1,71,46,0.08)'; e.currentTarget.style.color = '#01472e' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64705f' }}
          >
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Statement Template */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900, fontSize: '11px', color: '#64705f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Statement Template
            </label>
            <select
              value={template}
              onChange={e => setTemplate(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '11px',
                border: '1px solid rgba(1,71,46,0.12)', backgroundColor: '#ffffff',
                color: '#01472e', fontSize: '14px', outline: 'none', cursor: 'pointer',
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238C8C8C' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
              }}
            >
              <option value="GPAY">Google Pay</option>
            </select>
            <p style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontSize: '12px', color: '#666', marginTop: '8px', margin: '8px 0 0' }}>
              Select the statement format so we can map the columns automatically.
            </p>
          </div>

          {/* Upload Area */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900, fontSize: '11px', color: '#64705f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Upload File
            </label>
            <div style={{
              border: '2px dashed rgba(1,71,46,0.12)', borderRadius: '14px',
              backgroundColor: '#ffffff', padding: '36px 24px', textAlign: 'center',
              transition: 'border-color 0.3s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(1,71,46,0.35)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(1,71,46,0.12)'}
            >
              {/* Upload icon */}
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke="#64705f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: '14px', color: '#64705f', marginBottom: '8px' }}>
                <label htmlFor="pdf-file-upload" style={{ cursor: 'pointer', color: '#01472e', fontWeight: 600, transition: 'color 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#64705f'}
                  onMouseLeave={e => e.currentTarget.style.color = '#01472e'}
                >
                  Upload a file
                </label>
                <span> or drag and drop</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64705f', margin: 0 }}>
                {file ? (
                  <span style={{ color: '#01472e', fontWeight: 600 }}>{file.name}</span>
                ) : (
                  'PDF up to 10MB'
                )}
              </p>
              <input id="pdf-file-upload" name="pdf-file-upload" type="file" accept=".pdf,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 28px 24px',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '11px', border: '1px solid rgba(1,71,46,0.12)',
            backgroundColor: 'transparent', color: '#64705f', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.3s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(1,71,46,0.08)'; e.currentTarget.style.color = '#01472e' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64705f' }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            style={{
              padding: '10px 24px', borderRadius: '11px', border: 'none',
              backgroundColor: '#01472e', color: '#ffffff', fontSize: '13px', fontWeight: 600,
              cursor: !file || isUploading ? 'not-allowed' : 'pointer',
              opacity: !file || isUploading ? 0.4 : 1,
              transition: 'all 0.3s',
              boxShadow: !file || isUploading ? 'none' : '0 4px 16px rgba(1,71,46,0.25)',
            }}
            onMouseEnter={e => { if (file && !isUploading) e.currentTarget.style.boxShadow = '0 6px 24px rgba(1,71,46,0.4)' }}
            onMouseLeave={e => { if (file && !isUploading) e.currentTarget.style.boxShadow = '0 4px 16px rgba(1,71,46,0.25)' }}
          >
            {isUploading ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
