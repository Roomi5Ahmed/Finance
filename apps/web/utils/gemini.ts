import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function categorizeMerchantsWithGemini(
  merchants: string[],
  categories: { id: string; name: string }[]
): Promise<Record<string, string>> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is missing. Using fallback mock categorisation.');
    // Simple fallback for demo purposes if no API key is provided
    const mockMap: Record<string, string> = {};
    for (const merchant of merchants) {
      const lower = merchant.toLowerCase();
      let match = categories[0]?.id; // Default to first category
      if (lower.includes('uber')) match = categories.find(c => c.name.includes('Transport'))?.id || match;
      if (lower.includes('amazon')) match = categories.find(c => c.name.includes('Shopping'))?.id || match;
      if (lower.includes('zomato')) match = categories.find(c => c.name.includes('Food'))?.id || match;
      if (lower.includes('netflix')) match = categories.find(c => c.name.includes('Subscription'))?.id || match;
      if (lower.includes('salary')) match = categories.find(c => c.name.includes('Income'))?.id || match;
      
      if (match) mockMap[merchant] = match;
    }
    return mockMap;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const categoryList = categories.map((c) => `- ${c.name} (ID: ${c.id})`).join('\n');
  const merchantList = merchants.map((m) => `"${m}"`).join(', ');

  const prompt = `
You are a financial transaction categorization AI.
I have a list of merchant names extracted from bank statements. 
I need you to map each merchant to the most appropriate category ID from my provided list.

Available Categories:
${categoryList}

Merchants to categorize:
[${merchantList}]

Rules:
1. Return ONLY a valid JSON object. No markdown formatting, no code blocks, no explanations.
2. The JSON keys should be the EXACT merchant names provided.
3. The JSON values should be the EXACT category IDs.
4. If a merchant is highly ambiguous (like "UPI-1234"), assign it to a category that best fits "Transfer" or "Other", or just guess based on common patterns.
5. Example format: {"Starbucks": "uuid-for-food", "Amazon": "uuid-for-shopping"}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting if Gemini disobeys rule 1
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText) as Record<string, string>;
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {};
  }
}
