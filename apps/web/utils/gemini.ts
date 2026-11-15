import { GoogleGenerativeAI } from '@google/generative-ai'
import type { PayeeContext } from '@/lib/categorisation/stats'
import { normalizePayee } from '@/lib/categorisation/payee'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/** Max payees per Gemini call (PRD 4.3). */
export const AI_BATCH_SIZE = 30

export interface GeminiPayeeResult {
  category_id: string | null
  confidence: number
  reason?: string
}

function buildPrompt(batch: PayeeContext[], categories: { id: string; name: string }[]): string {
  const categoryList = categories.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')

  return `You are a financial transaction categorisation AI.
For each payee below, choose the most appropriate category from the user's category list using ONLY the behavioural evidence in the context.

Available Categories:
${categoryList}

Payees (JSON array):
${JSON.stringify(batch, null, 1)}

Rules:
1. Return ONLY a valid JSON object. No markdown, no code blocks, no explanations.
2. Keys must be the EXACT payee names from the input array.
3. Each value must be an object: {"category_id": "<category ID or null>", "confidence": 0.0-1.0, "reason": "<short reason>"}.
4. Never guess. If the evidence does not justify a category, return "category_id": null with confidence below 0.5.
5. A payee_type_guess of "person" means an individual (personal UPI payee). Debits to a person are usually small services (auto/cab fare, tea, vegetables, small shop purchases) or personal transfers; judge from amounts, direction, time of day and weekday pattern. Credits from a person are transfers or reimbursements, never salary.
6. Only payees with very strong, specific evidence (clear brand/merchant semantics or a decisive pattern) should get confidence >= 0.8. Moderate evidence: 0.5-0.79. Otherwise return null with low confidence.
7. Direction matters: do not put credits into expense categories.

Example format:
{"Ramesh Kumar": {"category_id": "${categories[0]?.id ?? '<id>'}", "confidence": 0.85, "reason": "weekday morning auto fares"}}`
}

function parseResponse(text: string, batch: PayeeContext[]): Record<string, GeminiPayeeResult> {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  let raw: unknown
  try {
    raw = JSON.parse(cleaned)
  } catch {
    console.warn('Gemini returned non-JSON output; ignoring batch.')
    return {}
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn('Gemini returned unexpected JSON shape; ignoring batch.')
    return {}
  }

  const record = raw as Record<string, unknown>
  const byNormalized = new Map(batch.map(ctx => [normalizePayee(ctx.payee), ctx.payee]))
  const out: Record<string, GeminiPayeeResult> = {}

  for (const [key, value] of Object.entries(record)) {
    const payee = byNormalized.get(normalizePayee(key))
    if (!payee) continue
    if (!value || typeof value !== 'object') continue

    const entry = value as { category_id?: unknown; confidence?: unknown; reason?: unknown }
    const categoryId =
      typeof entry.category_id === 'string' && entry.category_id.trim()
        ? entry.category_id.trim()
        : null

    let confidence = 0
    if (typeof entry.confidence === 'number' && Number.isFinite(entry.confidence)) {
      confidence = entry.confidence
    } else if (typeof entry.confidence === 'string') {
      const parsed = parseFloat(entry.confidence)
      if (Number.isFinite(parsed)) confidence = parsed
    }
    confidence = Math.max(0, Math.min(1, confidence))

    out[payee] = {
      category_id: categoryId,
      confidence,
      ...(typeof entry.reason === 'string' ? { reason: entry.reason } : {}),
    }
  }

  return out
}

/**
 * Layer 3 of the pipeline: context-aware categorisation.
 * Returns a map keyed by the exact payee strings passed in `contexts`.
 * Missing keys (or an empty result on outage/missing key) mean "no confident
 * answer" — the caller sends those payees to the review queue.
 */
export async function categorizePayeesWithGemini(
  contexts: PayeeContext[],
  categories: { id: string; name: string }[]
): Promise<Record<string, GeminiPayeeResult>> {
  if (contexts.length === 0) return {}

  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is missing — skipping AI layer; payees go to review.')
    return {}
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const results: Record<string, GeminiPayeeResult> = {}

  for (let i = 0; i < contexts.length; i += AI_BATCH_SIZE) {
    const batch = contexts.slice(i, i + AI_BATCH_SIZE)
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(batch, categories) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      })
      Object.assign(results, parseResponse(result.response.text(), batch))
    } catch (error) {
      console.error('Gemini API Error:', error)
    }
  }

  return results
}
