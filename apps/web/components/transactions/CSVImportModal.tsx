'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { bulkAddTransactions } from '@/app/(dashboard)/transactions/actions'

export default function CSVImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [template, setTemplate] = useState('HDFC')
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen) return null

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedTransactions = []

          for (const row of results.data as any[]) {
            let date = ''
            let merchant = ''
            let amount = 0
            
            if (template === 'HDFC') {
              date = row['Date'] || row['Value Date']
              merchant = row['Narration'] || row['Description'] || 'Unknown'
              const withdrawal = parseFloat(row['Withdrawal Amount'] || '0')
              const deposit = parseFloat(row['Deposit Amount'] || '0')
              amount = deposit > 0 ? deposit : -withdrawal
            } else if (template === 'SBI') {
              date = row['Txn Date'] || row['Date']
              merchant = row['Description'] || 'Unknown'
              const debit = parseFloat(row['Debit'] || '0')
              const credit = parseFloat(row['Credit'] || '0')
              amount = credit > 0 ? credit : -debit
            }

            if (!date || isNaN(amount)) continue

            let parsedDate = new Date()
            const parts = date.split(/[-/]/)
            if (parts.length === 3) {
              const [d, m, y] = parts as [string, string, string]
              const year = y.length === 2 ? `20${y}` : y
              parsedDate = new Date(`${year}-${m}-${d}`)
            }

            parsedTransactions.push({
              date: parsedDate,
              merchant: merchant.substring(0, 255),
              amount: amount,
              notes: 'Imported via CSV',
            })
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
          alert('Error saving imported transactions.')
        } finally {
          setIsUploading(false)
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error)
        alert('Failed to parse CSV file.')
        setIsUploading(false)
      }
    })
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
            Import CSV
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
          {/* Bank Template */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900, fontSize: '11px', color: '#64705f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Bank Template
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
              <option value="HDFC">HDFC Bank</option>
              <option value="SBI">SBI</option>
            </select>
            <p style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontSize: '12px', color: '#666', marginTop: '8px', margin: '8px 0 0' }}>
              Select the bank template so we can map the columns automatically.
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
                <label htmlFor="file-upload" style={{ cursor: 'pointer', color: '#01472e', fontWeight: 600, transition: 'color 0.3s' }}
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
                  'CSV up to 10MB'
                )}
              </p>
              <input id="file-upload" name="file-upload" type="file" accept=".csv"
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
            onMouseLeave={e => { e.currentTarget.style.boxShadow = !file || isUploading ? 'none' : '0 4px 16px rgba(1,71,46,0.25)' }}
          >
            {isUploading ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
