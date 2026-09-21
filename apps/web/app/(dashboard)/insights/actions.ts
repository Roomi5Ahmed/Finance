'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface MerchantSpend {
  name: string
  spend: number
}

interface CategoryContext {
  name: string
  totalSpent: number
  budgetPercentage: number
  transactionCount: number
  avgTransactionSize: number
  momChange: number | null
  lastMonthSpent: number
  merchantSpend: MerchantSpend[]
  monthlyBudget: number
}

export async function generateCategoryInsights(ctx: CategoryContext) {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error("Not authenticated: " + (error?.message || 'No session found'))

  const merchantLines = ctx.merchantSpend
    .slice(0, 8)
    .map((m, i) => {
      const pct = Math.round((m.spend / ctx.totalSpent) * 100)
      return (i + 1) + ". " + m.name + ": Rs." + m.spend.toLocaleString('en-IN') + " (" + pct + "% of category)"
    })
    .join("\n")

  let momContext = ''
  if (ctx.momChange !== null) {
    const direction = ctx.momChange > 0 ? 'INCREASED' : 'DECREASED'
    momContext = "Month-over-month change: " + direction + " by " + Math.abs(ctx.momChange) + "% (last month: Rs." + ctx.lastMonthSpent.toLocaleString('en-IN') + ", this month: Rs." + ctx.totalSpent.toLocaleString('en-IN') + ")."
  } else {
    momContext = 'No previous month data available for comparison (new category or first month of tracking).'
  }

  const budgetStatus = ctx.budgetPercentage >= 80
    ? "WARNING: This category is at " + ctx.budgetPercentage + "% of the monthly budget — over budget risk."
    : "This category is at " + ctx.budgetPercentage + "% of the monthly budget — within limits."

  const prompt =
    'You are an expert personal finance advisor analysing a user spending in the "' + ctx.name + '" category. ' +
    'Use the real numbers below — do NOT give generic advice. Every recommendation MUST reference specific amounts, merchants, or percentages from the data.\n\n' +
    'THIS MONTHS SPENDING DATA\n' +
    '- Total spent: Rs.' + ctx.totalSpent.toLocaleString('en-IN') + '\n' +
    '- ' + budgetStatus + '\n' +
    '- Number of transactions: ' + ctx.transactionCount + '\n' +
    '- Average transaction size: Rs.' + ctx.avgTransactionSize.toLocaleString('en-IN') + '\n' +
    '- ' + momContext + '\n\n' +
    'TOP MERCHANTS (ranked by spend)\n' +
    (merchantLines || 'No merchant data available.') + '\n\n' +
    'INSTRUCTIONS\n' +
    'Based on the numbers above, provide exactly 3 insights. Each insight MUST:\n' +
    '1. Include at least one specific number (Rs. amount, percentage, or merchant name)\n' +
    '2. Be a concrete, actionable recommendation — not a generic platitude\n' +
    '3. Be 1-2 sentences max, written in second person ("you")\n\n' +
    'Output exactly 3 strings as a JSON array. No markdown. No code fences. Just the raw JSON array.\n\n' +
    'Example output:\n' +
    '["Your Uber spend of Rs.4,200 is 42% of your Transportation budget — consider carpooling or switching to metro to cut this by Rs.1,500 next month.",' +
    '"You made 8 Zomato orders totalling Rs.6,400. Ordering 3 fewer times per month would save approximately Rs.2,400.",' +
    '"At Rs.800 average per transaction, your Food & Dining spending is 3x your grocery budget. Cooking 2 more meals at home could save Rs.3,000/month."]'

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return [
      'GEMINI_API_KEY is not configured. Add it to .env.local',
      'This is a placeholder tip because the API key is missing.',
      'Once configured, you will get real AI-powered insights here.'
    ]
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    let responseText = result.response.text()

    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(responseText)
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return parsed.slice(0, 3)
    } else {
      throw new Error('Invalid JSON format returned from Gemini')
    }
  } catch (err) {
    console.warn("AI Insight API Error for " + ctx.name + ", using dynamic fallback:", err)

    // Dynamic fallback that uses the actual data
    const topMerchant = ctx.merchantSpend[0]
    const fallbacks: string[] = []

    if (topMerchant) {
      const merchantPct = Math.round((topMerchant.spend / ctx.totalSpent) * 100)
      fallbacks.push(
        "Your highest spend in " + ctx.name + " is at " + topMerchant.name + " (Rs." +
        topMerchant.spend.toLocaleString('en-IN') + ", " + merchantPct + "% of category). " +
        "Try setting a monthly cap here to reduce overall spend."
      )
    } else {
      fallbacks.push(
        "Set a monthly limit of Rs." + Math.round(ctx.totalSpent * 0.8).toLocaleString('en-IN') +
        " for " + ctx.name + " to bring spending under control."
      )
    }

    if (ctx.momChange !== null && ctx.momChange > 20) {
      fallbacks.push(
        "Your " + ctx.name + " spending " + (ctx.momChange > 0 ? "increased" : "decreased") +
        " by " + Math.abs(ctx.momChange) + "% month-over-month. " +
        (ctx.momChange > 0
          ? "Review your last " + ctx.transactionCount + " transactions to identify where costs crept up."
          : "Great progress — keep this trend going by maintaining current habits.")
      )
    } else if (ctx.budgetPercentage >= 80) {
      fallbacks.push(
        "At " + ctx.budgetPercentage + "% of your monthly budget, " + ctx.name +
        " needs attention. Prioritise the top 2 merchants to cut Rs." +
        Math.round(ctx.totalSpent * 0.15).toLocaleString('en-IN') + " next month."
      )
    } else {
      fallbacks.push(
        "You are at " + ctx.budgetPercentage + "% of budget for " + ctx.name +
        " with an average of Rs." + ctx.avgTransactionSize.toLocaleString('en-IN') +
        " per transaction. Keep monitoring to stay on track."
      )
    }

    fallbacks.push(
      "With " + ctx.transactionCount + " transactions this month averaging Rs." +
      ctx.avgTransactionSize.toLocaleString('en-IN') + ", look for recurring small purchases " +
      "that could be batched or eliminated to save 10-15%."
    )

    return fallbacks
  }
}
