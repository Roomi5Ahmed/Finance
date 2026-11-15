'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { signup } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="auth-cta" disabled={pending}>
      {pending ? 'Creating account…' : 'Create account'}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  )
}

export default function SignUpForm({ message }: { message?: string }) {
  const [showPw, setShowPw] = useState(false)

  const errMsg = message || ''

  return (
    <>
      {errMsg && <div className="auth-error">{errMsg}</div>}

      <form className="auth-form" action={signup}>
        <div className="auth-field">
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder=" "
            className="auth-input"
          />
          <span className="auth-shell" aria-hidden="true" />
          <label className="auth-label" htmlFor="signup-email">Email address</label>
        </div>

        <div className="auth-field">
          <input
            id="signup-password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={6}
            placeholder=" "
            className="auth-input auth-input-pw"
          />
          <span className="auth-shell" aria-hidden="true" />
          <label className="auth-label" htmlFor="signup-password">Password</label>
          <button
            type="button"
            className="auth-eye"
            aria-label={showPw ? 'Hide password' : 'Show password'}
            onClick={() => setShowPw((v) => !v)}
          >
            {showPw ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <SubmitButton />
      </form>
    </>
  )
}
