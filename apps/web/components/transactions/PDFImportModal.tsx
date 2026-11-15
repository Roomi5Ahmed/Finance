'use client'

import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { bulkAddTransactions } from '@/app/(dashboard)/transactions/actions'
import { parseGooglePayLines } from '@/lib/pdf/gpay-parser'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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

export default function PDFImportModal({ isOpen, onClose, onReview, onImported }: { isOpen: boolean; onClose: () => void; onReview?: () => void; onImported?: (months: string[]) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [template, setTemplate] = useState('GPAY')
  const [isUploading, setIsUploading] = useState(false)
  const [summary, setSummary] = useState<{ imported: number; categorised: number; pendingReview: number } | null>(null)

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
            txn_time: row.txn_time,
            notes: 'Imported via PDF',
          })
        }
      }

      if (parsedTransactions.length === 0) {
        alert('Could not find any valid transactions in this file matching the template.')
        return
      }

      const result = await bulkAddTransactions(parsedTransactions)
      onImported?.(result.months)
      // Post-import summary with a path into the review queue (PRD 4.6).
      setSummary({
        imported: result.imported,
        categorised: result.categorised,
        pendingReview: result.pendingReview,
      })
    } catch (err) {
      console.error(err)
      alert('Failed to parse PDF file.')
    } finally {
      setIsUploading(false)
    }
  }

  const closeAll = () => {
    setSummary(null)
    setFile(null)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(8,26,17,0.6)', backdropFilter: 'blur(4px)' }} onClick={closeAll} />

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
          <button onClick={closeAll} style={{
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
          {summary ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 16px',
                backgroundColor: 'rgba(1,71,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
              }}>
                &#x2713;
              </div>
              <h3 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 700, fontSize: '17px', color: '#01472e', margin: '0 0 8px' }}>
                Import complete
              </h3>
              <p style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontSize: '14px', color: '#64705f', margin: 0, lineHeight: 1.6 }}>
                {summary.imported} imported, {summary.categorised} auto-categorised,{' '}
                {summary.pendingReview} need review.
              </p>
              {summary.pendingReview > 0 && (
                <p style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontSize: '13px', color: '#64705f', margin: '12px 0 0' }}>
                  A few taps in the review queue will clear them — payees are grouped so you
                  categorise each person once.
                </p>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 28px 24px',
        }}>
          {summary ? (
            <>
              <button onClick={closeAll} style={{
                padding: '10px 20px', borderRadius: '11px', border: '1px solid rgba(1,71,46,0.12)',
                backgroundColor: 'transparent', color: '#64705f', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(1,71,46,0.08)'; e.currentTarget.style.color = '#01472e' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64705f' }}
              >
                Done
              </button>
              {summary.pendingReview > 0 && (
                <button
                  onClick={() => { closeAll(); onReview?.() }}
                  style={{
                    padding: '10px 24px', borderRadius: '11px', border: 'none',
                    backgroundColor: '#01472e', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.3s',
                    boxShadow: '0 4px 16px rgba(1,71,46,0.25)',
                  }}
                >
                  Review {summary.pendingReview} transaction{summary.pendingReview !== 1 ? 's' : ''}
                </button>
              )}
            </>
          ) : (
            <>
          <button onClick={closeAll} style={{
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
