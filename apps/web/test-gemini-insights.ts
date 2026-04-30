import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/)
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : ''

  if (!apiKey) {
    console.error('No API key found in .env.local')
    return
  }

  const prompt = `
You are an expert personal finance AI assistant. 
Analyze the following user's financial data for the last 30 days and provide exactly 3 short, actionable, and personalized insights or pieces of advice.

Data:
- Total Spent: ₹1000.00
- Total Income: ₹5000.00
- Spending by Category: Food & Dining: ₹500.00, Shopping: ₹500.00

Rules:
1. Provide exactly 3 insights.
2. Output ONLY a valid JSON array of objects.
3. Each object must have a "type" (choose from: "warning", "success", "tip") and a "text" (the insight string, max 150 characters).
4. Make it engaging, direct, and helpful. Do NOT include markdown formatting like \`\`\`json. Just the raw JSON array.
`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    let responseText = result.response.text()

    console.log('RAW RESPONSE:')
    console.log(responseText)

    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(responseText)
    console.log('PARSED SUCCESSFULLY:', parsed)
  } catch (err: any) {
    console.error('ERROR OCCURRED:')
    console.error(err.message || err)
  }
}

run()
