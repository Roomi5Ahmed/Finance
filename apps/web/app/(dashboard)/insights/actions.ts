'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateCategoryInsights(categoryName: string, recentMerchants: string[]) {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error(`Not authenticated: ${error?.message || 'No session found'}`)

  const prompt = `
You are an expert personal finance AI assistant. 
The user has asked for advice on how to optimize their spending in the "${categoryName}" category.
Recently, they have spent money at these specific merchants: ${recentMerchants.join(', ') || 'Various places'}.

Based on this category and these specific merchants, provide exactly 2 short, highly actionable tips to optimize or reduce expenses in this specific category.
For example, if the category is "Subscriptions" and the merchant is "Netflix", suggest getting an annual plan or checking for unused subscriptions.

Rules:
1. Provide exactly 2 tips.
2. Output ONLY a valid JSON array of strings.
3. Keep each tip under 120 characters and very direct. Do NOT include markdown formatting like \`\`\`json. Just the raw JSON array.

Example Output:
[
  "Switch your Adobe and Netflix plans to annual billing to save up to 20%.",
  "Review your subscription list and cancel any services you haven't used in the last 30 days."
]
`

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return [
      'GEMINI_API_KEY is not configured. Add it to .env.local',
      'This is a placeholder tip because the API key is missing.'
    ]
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    let responseText = result.response.text()

    // Clean up potential markdown blocks
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(responseText)
    if (Array.isArray(parsed) && parsed.length === 2) {
      return parsed
    } else {
      throw new Error('Invalid JSON format returned from Gemini')
    }
  } catch (err) {
    console.warn(`AI Insight API Error for ${categoryName}, using dynamic fallback:`, err)
    
    // Dynamic Fallback
    return [
      `Review your recent purchases at ${recentMerchants[0] || 'various merchants'} to ensure they align with your budget goals.`,
      `Consider setting a strict monthly limit for the ${categoryName} category.`
    ]
  }
}
