'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [currency, setCurrency] = useState('INR')
  const [income, setIncome] = useState('')
  const [goal, setGoal] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if onboarding is completed
    const isCompleted = localStorage.getItem('onboardingCompleted') === 'true'
    if (!isCompleted) {
      setIsOpen(true)
    }
  }, [])

  if (!isOpen) return null

  const handleNext = () => setStep((prev) => prev + 1)
  const handleBack = () => setStep((prev) => prev - 1)
  
  const handleFinish = async () => {
    // Here we would save to Supabase UserProfile table
    console.log({ currency, income, goal })
    localStorage.setItem('onboardingCompleted', 'true')
    setIsOpen(false)
    router.refresh()
  }

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    setIsOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-800 h-1">
          <div 
            className="bg-indigo-600 h-1 transition-all duration-300" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome!</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Let's personalize your experience. What's your primary currency?</p>
              </div>
              <div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="INR">🇮🇳 INR - Indian Rupee</option>
                  <option value="USD">🇺🇸 USD - US Dollar</option>
                  <option value="EUR">🇪🇺 EUR - Euro</option>
                  <option value="GBP">🇬🇧 GBP - British Pound</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Income</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">This helps us calculate your budget targets. (Optional)</p>
              </div>
              <div>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">{currency === 'INR' ? '₹' : '$'}</span>
                  </div>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 pl-7 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Goal</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">What do you want to achieve the most?</p>
              </div>
              <div className="space-y-3">
                {['Save money', 'Reduce subscriptions', 'Track spending', 'Debt paydown'].map((g) => (
                  <label key={g} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${goal === g ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <input type="radio" name="goal" value={g} checked={goal === g} onChange={() => setGoal(g)} className="sr-only" />
                    <span className={`text-sm font-medium ${goal === g ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-900 dark:text-gray-300'}`}>{g}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step === 1 ? (
              <button onClick={handleSkip} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Skip for now
              </button>
            ) : (
              <button onClick={handleBack} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={handleNext}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Next
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                disabled={!goal}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
