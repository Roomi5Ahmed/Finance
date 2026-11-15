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
    const isCompleted = localStorage.getItem('onboardingCompleted') === 'true'
    if (!isCompleted) {
      setIsOpen(true)
    }
  }, [])

  if (!isOpen) return null

  const handleNext = () => setStep((prev) => prev + 1)
  const handleBack = () => setStep((prev) => prev - 1)

  const handleFinish = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,26,17,0.6)] p-4">
      <div className="bg-[#ffffff] text-[#01472e] border border-[#dde3d0] rounded-[11px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Progress Bar */}
        <div className="w-full bg-[#f6f8f1] h-1">
          <div
            className="bg-[#01472e] h-1 transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-2xl font-bold text-[#01472e]"
                  style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
                >
                  Welcome!
                </h2>
                <p className="text-[#64705f] mt-2">Let&apos;s personalize your experience. What&apos;s your primary currency?</p>
              </div>
              <div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-3 text-base bg-[#f6f8f1] border border-[#dde3d0] rounded-[11px] text-[#01472e] focus:outline-none focus:border-[#01472e] focus:ring-1 focus:ring-[#01472e]/20 transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
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
                <h2
                  className="text-2xl font-bold text-[#01472e]"
                  style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
                >
                  Monthly Income
                </h2>
                <p className="text-[#64705f] mt-2">This helps us calculate your budget targets. (Optional)</p>
              </div>
              <div>
                <div className="relative mt-1 rounded-[11px] shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-[#64705f] sm:text-sm">{currency === 'INR' ? '₹' : '$'}</span>
                  </div>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="block w-full rounded-[11px] border border-[#dde3d0] bg-[#f6f8f1] pl-7 pr-12 focus:border-[#01472e] focus:ring-1 focus:ring-[#01472e]/20 focus:outline-none text-[#01472e] sm:text-sm py-3 transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-2xl font-bold text-[#01472e]"
                  style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
                >
                  Your Goal
                </h2>
                <p className="text-[#64705f] mt-2">What do you want to achieve the most?</p>
              </div>
              <div className="space-y-3">
                {['Save money', 'Reduce subscriptions', 'Track spending', 'Debt paydown'].map((g) => (
                  <label
                    key={g}
                    className={`flex items-center p-4 border rounded-[11px] cursor-pointer transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${
                      goal === g
                        ? 'border-[#01472e] bg-[#01472e]/10'
                        : 'border-[#dde3d0] hover:bg-[#f6f8f1]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={g}
                      checked={goal === g}
                      onChange={() => setGoal(g)}
                      className="sr-only"
                    />
                    <span className={`text-sm font-medium ${goal === g ? 'text-[#01472e]' : 'text-[#01472e]'}`}>
                      {g}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step === 1 ? (
              <button
                onClick={handleSkip}
                className="text-sm font-medium text-[#64705f] hover:text-[#01472e] transition-colors duration-[0.6s]"
              >
                Skip for now
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="text-sm font-medium text-[#64705f] hover:text-[#01472e] transition-colors duration-[0.6s]"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="inline-flex justify-center rounded-[16px] border border-[#01472e] bg-[#01472e] py-2 px-6 text-sm font-medium text-white hover:bg-[#01472e]/90 focus:outline-none focus:ring-2 focus:ring-[#01472e] focus:ring-offset-2 focus:ring-offset-[#ffffff] transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!goal}
                className="inline-flex justify-center rounded-[16px] border border-[#01472e] bg-[#01472e] py-2 px-6 text-sm font-medium text-white hover:bg-[#01472e]/90 focus:outline-none focus:ring-2 focus:ring-[#01472e] focus:ring-offset-2 focus:ring-offset-[#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
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
