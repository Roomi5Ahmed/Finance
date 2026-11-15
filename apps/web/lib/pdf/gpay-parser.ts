// Google Pay PDF statement parser — pure line-level logic (no pdfjs), so it
// can be unit tested with a fixture (see gpay-parser.test.ts).

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

const DATE_RE = /^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})\b/
const AMOUNT_RE = /(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(Dr|Cr)?/i
const DETAIL_RE = /(?:^|\s)((?:Paid\s+(?:to|at|for))|(?:Received\s+from)|(?:Sent\s+to))\s+(.+?)(?=\s+(?:₹|INR|Rs\.?)|$)/i
const TIME_RE = /^\d{1,2}:\d{2}\s*(?:AM|PM)$/i
// Time embedded in any line ("15 Jan, 2026 | 04:32 PM").
const TIME_ANY_RE = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i
const JUNK_MERCHANT_RE = /^(?:sent|received|amount|date|time|total|balance)$/i
const NUMERIC_MERCHANT_RE = /^[₹\d\s.,/:-]+$/

export interface GPayRow {
  date: Date
  merchant: string
  amount: number
  /** Time-of-day from the statement as HH:MM:SS (24h), if present (PRD 4.6). */
  txn_time?: string
}

function to24h(hourStr: string, minuteStr: string, meridiem: string): string {
  let hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  const mer = meridiem.toUpperCase()
  if (Number.isNaN(hour) || Number.isNaN(minute)) return ''
  if (mer === 'PM' && hour !== 12) hour += 12
  if (mer === 'AM' && hour === 12) hour = 0
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

function extractTime(line: string): string | undefined {
  const m = TIME_ANY_RE.exec(line)
  if (!m) return undefined
  return to24h(m[1] ?? '', m[2] ?? '', m[3] ?? '') || undefined
}

/**
 * Parse joined PDF text lines into GPay transactions.
 * Rows are flushed on each new date line; times seen in between belong to
 * the row being built.
 */
export function parseGooglePayLines(lines: string[]): GPayRow[] {
  const out: GPayRow[] = []
  let date: Date | null = null
  let merchant = ''
  let amount: number | null = null
  let isCredit: boolean | null = null
  let txnTime: string | undefined

  const flush = () => {
    if (
      date && merchant && amount !== null && amount > 0 &&
      !JUNK_MERCHANT_RE.test(merchant) && !NUMERIC_MERCHANT_RE.test(merchant)
    ) {
      out.push({
        date,
        merchant: merchant.substring(0, 255),
        amount: isCredit ? amount : -amount,
        ...(txnTime ? { txn_time: txnTime } : {}),
      })
    }
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue

    if (TIME_RE.test(line)) {
      const time = extractTime(line)
      if (time) txnTime = time
      continue
    }

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
          txnTime = extractTime(line)
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
