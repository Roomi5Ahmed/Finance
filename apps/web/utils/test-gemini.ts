import { categorizePayeesWithGemini } from './gemini'
import { buildPayeeStats } from '@/lib/categorisation/stats'
import { classifyPayee } from '@/lib/categorisation/payee'

async function run() {
  const categories = [
    { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Housing' },
    { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Transportation' },
  ]
  const sample = [
    { amount: -60, date: '2026-08-02T09:12:00Z', txn_time: '09:12:00' },
    { amount: -60, date: '2026-08-03T09:05:00Z', txn_time: '09:05:00' },
    { amount: -80, date: '2026-08-04T18:40:00Z', txn_time: '18:40:00' },
    { amount: -60, date: '2026-08-05T09:10:00Z', txn_time: '09:10:00' },
    { amount: -120, date: '2026-10-14T09:15:00Z', txn_time: '09:15:00' },
  ]

  const payee = 'Ramesh Kumar'
  const context = buildPayeeStats(payee, classifyPayee(payee), sample)
  console.log('Context:', JSON.stringify(context, null, 2))

  const results = await categorizePayeesWithGemini([context], categories)
  console.log(results)
}

run()
