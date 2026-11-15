export type PayeeType = 'business' | 'person' | 'unknown'

// Editable list of tokens that mark a payee as a business (case-insensitive).
export const BUSINESS_TOKENS: string[] = [
  // legal / org suffixes
  'pvt', 'ltd', 'llp', 'inc', 'co', 'limited', 'private', 'company',
  'industries', 'works', 'enterprises', 'enterprise', 'agency', 'services',
  'solutions', 'technologies', 'traders', 'trading', 'textiles',
  // retail / food / health
  'store', 'stores', 'mart', 'supermarket', 'hypermarket', 'kirana',
  'general', 'provisions', 'restaurant', 'restro', 'cafe', 'cafeteria',
  'hotel', 'bakery', 'bakes', 'bakers', 'sweets', 'dhaba', 'eatery',
  'kitchen', 'pharmacy', 'chemist', 'medical', 'medicals', 'clinic',
  'hospital', 'diagnostics', 'laboratories',
  // everyday businesses
  'electricals', 'electrical', 'electronics', 'hardware', 'salon', 'unisex',
  'beauty', 'spa', 'gym', 'fitness', 'jewellers', 'jewelry', 'jewellery',
  'motors', 'tyres', 'tyre', 'furniture', 'interiors', 'printing',
  'stationery', 'stationers', 'gift', 'flowers', 'garments', 'fashion',
  'footwear', 'mobiles', 'computers', 'digital',
]

// Common Indian app/brand words: without these a brand like "Uber"
// would look like a one-word person name.
export const BRAND_TOKENS: string[] = [
  'uber', 'ola', 'rapido', 'zomato', 'swiggy', 'amazon', 'flipkart',
  'myntra', 'ajio', 'meesho', 'netflix', 'spotify', 'hotstar', 'prime',
  'bigbasket', 'blinkit', 'zepto', 'jiomart', 'dmart', 'croma',
  'reliance', 'airtel', 'jio', 'vodafone', 'irctc', 'makemytrip',
  'goibibo', 'oyo', 'dominos', 'mcdonald', 'kfc', 'starbucks', 'chaayos',
  'cult', 'lenskart', 'pharmeasy', 'apollo', 'tata',
]

// Tokens that are statement jargon, not person names.
const NON_NAME_TOKENS = new Set([
  'upi', 'neft', 'rtgs', 'imps', 'atm', 'pos', 'p2m', 'p2a', 'mmt',
  'ecom', 'salary', 'transfer', 'transfers', 'cashback', 'refund',
  'interest', 'payment', 'payments', 'account', 'acct',
])

const ALPHA_WORD_RE = /^[A-Za-z](?:[A-Za-z'.-]*[A-Za-z])?$/

/**
 * Normalise a payee/merchant name for cache matching: case- and
 * whitespace-insensitive, but never strips meaningful words.
 */
export function normalizePayee(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
}

function tokenise(name: string): string[] {
  return normalizePayee(name)
    .split(' ')
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(Boolean)
}

/**
 * Classify a payee as business / person / unknown.
 *
 * - business: contains a known business/brand token or legal suffix
 * - person:   1 to 3 purely alphabetic words with no business signal
 * - unknown:  everything else (digits, statement jargon, too many words)
 */
export function classifyPayee(name: string): PayeeType {
  const trimmed = (name || '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'unknown'

  const tokens = tokenise(trimmed)
  if (tokens.length === 0) return 'unknown'

  if (tokens.some(t => NON_NAME_TOKENS.has(t))) return 'unknown'
  if (tokens.some(t => BUSINESS_TOKENS.includes(t) || BRAND_TOKENS.includes(t))) {
    return 'business'
  }

  const words = trimmed.split(' ')
  if (words.length >= 1 && words.length <= 3 && words.every(w => ALPHA_WORD_RE.test(w))) {
    return 'person'
  }

  return 'unknown'
}
