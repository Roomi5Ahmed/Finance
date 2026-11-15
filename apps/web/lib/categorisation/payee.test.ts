import { describe, expect, it } from 'vitest'
import { classifyPayee, normalizePayee } from './payee'

describe('classifyPayee', () => {
  it('classifies plain person names as person', () => {
    expect(classifyPayee('Ramesh Kumar')).toBe('person')
    expect(classifyPayee('Sunita Devi')).toBe('person')
    expect(classifyPayee('Ramesh')).toBe('person')
    expect(classifyPayee('ramesh kumar')).toBe('person')
    expect(classifyPayee("D'Souza")).toBe('person')
  })

  it('classifies business tokens as business', () => {
    expect(classifyPayee('Lakshmi Kirana Store')).toBe('business')
    expect(classifyPayee('Sri Balaji Enterprises Pvt Ltd')).toBe('business')
    expect(classifyPayee('Apollo Pharmacy')).toBe('business')
    expect(classifyPayee('Ramesh Kumar Traders')).toBe('business')
    expect(classifyPayee('Hotel Sunrise')).toBe('business')
    expect(classifyPayee('Anjali Beauty Salon')).toBe('business')
  })

  it('treats known brands as business, not one-word people', () => {
    expect(classifyPayee('Uber')).toBe('business')
    expect(classifyPayee('Zomato')).toBe('business')
    expect(classifyPayee('AMAZON PAY INDIA')).toBe('business')
  })

  it('flags statement jargon and numeric names as unknown', () => {
    expect(classifyPayee('UPI-1234')).toBe('unknown')
    expect(classifyPayee('NEFT TRANSFER 8899')).toBe('unknown')
    expect(classifyPayee('12345')).toBe('unknown')
    expect(classifyPayee('PAYTM 889921')).toBe('unknown')
    expect(classifyPayee('')).toBe('unknown')
  })

  it('treats a self transfer as a person (routes to Personal Transfers)', () => {
    expect(classifyPayee('Self')).toBe('person')
  })

  it('does not classify 4+ word names as person', () => {
    expect(classifyPayee('Ramesh Kumar Sharma & Sons')).toBe('unknown')
  })
})

describe('normalizePayee', () => {
  it('is case- and whitespace-insensitive without dropping words', () => {
    expect(normalizePayee('  RAMESH   Kumar ')).toBe('ramesh kumar')
    expect(normalizePayee('Ramesh Kumar')).toBe(normalizePayee('RAMESH  KUMAR'))
    expect(normalizePayee('Sri Lakshmi Kirana')).toContain('lakshmi')
  })
})
