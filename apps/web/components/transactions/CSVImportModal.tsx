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
            // Very simple template mapper
            let date = ''
            let merchant = ''
            let amount = 0
            
            if (template === 'HDFC') {
              // HDFC usually has "Date", "Narration", "Withdrawal Amount", "Deposit Amount"
              date = row['Date'] || row['Value Date']
              merchant = row['Narration'] || row['Description'] || 'Unknown'
              const withdrawal = parseFloat(row['Withdrawal Amount'] || '0')
              const deposit = parseFloat(row['Deposit Amount'] || '0')
              amount = deposit > 0 ? deposit : -withdrawal
            } else if (template === 'SBI') {
              // SBI usually has "Txn Date", "Description", "Debit", "Credit"
              date = row['Txn Date'] || row['Date']
              merchant = row['Description'] || 'Unknown'
              const debit = parseFloat(row['Debit'] || '0')
              const credit = parseFloat(row['Credit'] || '0')
              amount = credit > 0 ? credit : -debit
            }

            // Skip invalid rows
            if (!date || isNaN(amount)) continue

            // Parse DD/MM/YY or DD-MM-YYYY to YYYY-MM-DD
            // This is a naive parse, in a real app use a robust date library
            let parsedDate = new Date()
            const parts = date.split(/[-/]/)
            if (parts.length === 3) {
              const [d, m, y] = parts as [string, string, string]
              const year = y.length === 2 ? `20${y}` : y
              parsedDate = new Date(`${year}-${m}-${d}`)
            }

            parsedTransactions.push({
              date: parsedDate,
              merchant: merchant.substring(0, 255), // limit length
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#151D2C] border border-white/5 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Import CSV</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300">Bank Template</label>
            <select 
              value={template} 
              onChange={e => setTemplate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-white/10 bg-[#0B1121] py-2 pl-3 pr-10 text-base text-white focus:border-indigo-500 outline-none sm:text-sm"
            >
              <option value="HDFC">HDFC Bank</option>
              <option value="SBI">SBI</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">Select the bank template so we can map the columns automatically.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Upload File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-md bg-[#0B1121]">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-slate-400 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">{file ? file.name : 'CSV up to 10MB'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0B1121] px-6 py-4 flex items-center justify-end space-x-3 border-t border-white/5">
          <button onClick={onClose} className="rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 focus:outline-none transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            disabled={!file || isUploading} 
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Importing...' : 'Import Data'}
          </button>
        </div>

      </div>
    </div>
  )
}
