import { describe, expect, it } from 'vitest'
import { parseGooglePayLines } from './gpay-parser'

// Fixture: text lines as extracted from a Google Pay PDF statement full of
// personal-name payees (the PRD's core scenario). Statement layout mirrors
// the real GPay export: date line, "Paid to/Received from <name>", amount
// line, optional time (standalone or inline with the date).
const GPAY_STATEMENT_LINES = [
  'Google Pay',
  'Transaction activity',
  '12 Aug, 2025',
  'Paid to Ramesh Kumar',
  'UPI Transaction ID: 438251789032',
  '₹150',
  '04:32 PM',
  '13 Aug, 2025 | 09:15 AM',
  'Received from Sunita Devi',
  '₹1,200',
  '14 Aug, 2025',
  'Paid at Sri Lakshmi Kirana Store',
  '₹45.50 Dr',
  'Total',
  '15 Aug, 2025 | 07:45 PM',
  'Paid to Auto Driver Salim',
  '₹80',
  '16 Aug, 2025',
  'Paid to Vegetable Cart',
  '₹230',
  'Balance',
  '₹5,432.10',
]

describe('parseGooglePayLines (GPay PDF fixture)', () => {
  const rows = parseGooglePayLines(GPAY_STATEMENT_LINES)

  it('extracts every transaction with signed amounts', () => {
    expect(rows).toHaveLength(5)
    expect(rows.map(r => r.merchant)).toEqual([
      'Ramesh Kumar',
      'Sunita Devi',
      'Sri Lakshmi Kirana Store',
      'Auto Driver Salim',
      'Vegetable Cart',
    ])
    expect(rows.map(r => r.amount)).toEqual([-150, 1200, -45.5, -80, -230])
  })

  it('keeps the parsed time-of-day in txn_time (PRD 4.6)', () => {
    expect(rows[0]?.txn_time).toBe('16:32:00') // standalone 04:32 PM
    expect(rows[1]?.txn_time).toBe('09:15:00') // inline "| 09:15 AM"
    expect(rows[2]?.txn_time).toBeUndefined() // no time on this row
    expect(rows[3]?.txn_time).toBe('19:45:00') // inline 07:45 PM
    expect(rows[4]?.txn_time).toBeUndefined()
  })

  it('parses dates and credits correctly', () => {
    expect(rows[0]?.date.getFullYear()).toBe(2025)
    expect(rows[0]?.date.getMonth()).toBe(7) // August (0-based)
    expect(rows[0]?.date.getDate()).toBe(12)
    expect(rows[1]?.amount).toBeGreaterThan(0) // credit stays positive
  })

  it('ignores summary/junk lines (Total, Balance) as merchants', () => {
    expect(rows.map(r => r.merchant)).not.toContain('Total')
    expect(rows.map(r => r.merchant)).not.toContain('Balance')
    expect(rows.map(r => r.merchant)).not.toContain('Sent')
    expect(rows.map(r => r.merchant)).not.toContain('Received')
  })

  it('handles rows continuing after a page break (flat line array)', () => {
    const paged = [
      '16 Aug, 2025',
      'Paid to Ramesh Kumar',
      '₹60',
      // page 2 of the statement
      '17 Aug, 2025',
      'Paid to Ramesh Kumar',
      '₹60',
      '08:10 AM',
    ]
    const parsed = parseGooglePayLines(paged)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]?.amount).toBe(-60)
    expect(parsed[1]?.amount).toBe(-60)
    expect(parsed[1]?.txn_time).toBe('08:10:00')
  })

  it('does not leak a time into a following row without one', () => {
    const lines = [
      '12 Aug, 2025',
      'Paid to Ramesh Kumar',
      '₹100',
      '10:00 AM',
      '13 Aug, 2025',
      'Paid to Sunita Devi',
      '₹200',
    ]
    const parsed = parseGooglePayLines(lines)
    expect(parsed[0]?.txn_time).toBe('10:00:00')
    expect(parsed[1]?.txn_time).toBeUndefined()
  })

  it('truncates very long merchant names to 255 chars', () => {
    const longName = 'Paid to ' + 'A'.repeat(400)
    const parsed = parseGooglePayLines(['12 Aug, 2025', longName, '₹10'])
    expect(parsed[0]?.merchant.length).toBe(255)
  })
})
