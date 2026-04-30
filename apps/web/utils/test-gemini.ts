import { categorizeMerchantsWithGemini } from './gemini'

async function run() {
  const categories = [
    { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Housing' },
    { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Transportation' }
  ]
  const merchants = ['AMAZON PAY INDIA', 'UBER INDIA SYSTEMS']
  
  const results = await categorizeMerchantsWithGemini(merchants, categories)
  console.log(results)
}

run()
