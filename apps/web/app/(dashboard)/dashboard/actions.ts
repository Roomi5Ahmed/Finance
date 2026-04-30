'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateFinancialInsights() {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error(`Not authenticated: ${error?.message || 'No session found'}`)

  // Fetch transactions for the last 30 days to give context to the AI
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, merchant, date, categories(name)')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgo.toISOString())
    .order('date', { ascending: false })

  if (!transactions || transactions.length === 0) {
    return [
      { type: 'tip', text: 'You have no recent transactions. Start adding some to get personalized AI insights!' }
    ]
  }

  // Aggregate data for the prompt
  let totalSpend = 0
  let totalIncome = 0
  const categorySpend: Record<string, number> = {}

  transactions.forEach((tx: any) => {
    if (tx.amount < 0) {
      totalSpend += Math.abs(tx.amount)
      const cat = tx.categories?.name || 'Uncategorized'
      categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(tx.amount)
    } else {
      totalIncome += tx.amount
    }
  })

  // Format data for Gemini
  const spendingSummary = Object.entries(categorySpend)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => `${cat}: ₹${amount.toFixed(2)}`)
    .join(', ')

  const prompt = `
You are an expert personal finance AI assistant. 
Analyze the following user's financial data for the last 30 days and provide exactly 3 short, actionable, and personalized insights or pieces of advice.

Data:
- Total Spent: ₹${totalSpend.toFixed(2)}
- Total Income: ₹${totalIncome.toFixed(2)}
- Spending by Category: ${spendingSummary}

Rules:
1. Provide exactly 3 insights.
2. Output ONLY a valid JSON array of objects.
3. Each object must have a "type" (choose from: "warning", "success", "tip") and a "text" (the insight string, max 150 characters).
4. Make it engaging, direct, and helpful. Do NOT include markdown formatting like \`\`\`json. Just the raw JSON array.

Example Output:
[
  { "type": "warning", "text": "You spent 40% of your total budget on Food & Dining. Try cooking at home more often!" },
  { "type": "success", "text": "Great job keeping your Subscriptions under ₹1000 this month." },
  { "type": "tip", "text": "Consider moving 20% of your income to a savings account as soon as you get paid." }
]
`

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return [
      { type: 'warning', text: 'GEMINI_API_KEY is not configured in .env.local' }
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    } else {
      throw new Error('Invalid JSON format returned from Gemini')
    }
  } catch (err) {
    console.warn('AI Insight API Error (likely 503), using dynamic fallback:', err)
    
    // Fallback logic so the presentation never fails!
    const fallbacks = []
    
    // Insight 1: Budget Health
    if (totalSpend > totalIncome && totalIncome > 0) {
      fallbacks.push({ type: 'warning', text: `You've spent ₹${(totalSpend - totalIncome).toFixed(2)} more than you've earned this month. Try to limit non-essential purchases.` })
    } else if (totalSpend > 0) {
      fallbacks.push({ type: 'success', text: `Great job! You've kept your expenses below your income this month. Consider transferring the surplus to a savings account.` })
    } else {
      fallbacks.push({ type: 'tip', text: `Start tracking your expenses to get a better picture of your financial health.` })
    }

    // Insight 2: Top Category
    const topCat = Object.entries(categorySpend).sort((a, b) => b[1] - a[1])[0]
    if (topCat && topCat[1] > 0) {
      fallbacks.push({ type: 'tip', text: `Your highest spending category is ${topCat[0]} at ₹${topCat[1].toFixed(2)}. Look for ways to cut back here to maximize savings.` })
    } else {
      fallbacks.push({ type: 'tip', text: `Set up a monthly budget to ensure your spending stays aligned with your financial goals.` })
    }

    // Insight 3: General Advice
    fallbacks.push({ type: 'tip', text: `A good rule of thumb is the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings.` })

    return fallbacks
  }
}
