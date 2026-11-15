'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, loginWithOAuth } from '../actions'
import { createClient } from '@/utils/supabase/client'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="auth-cta" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  )
}

export default function SignInForm({ message }: { message?: string }) {
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [note, setNote] = useState('')

  async function handleForgot() {
    const email = (document.getElementById('auth-email') as HTMLInputElement | null)?.value ?? ''
    if (!email) {
      setNote('Enter your email above first, then request a reset link.')
      return
    }
    setNote('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    })
    setNote(error ? 'Could not send the reset link. Try again.' : `Reset link sent to ${email}.`)
  }

  const errMsg = message || ''

  return (
    <>
      <div className="auth-social-row">
        <button type="button" className="auth-social" onClick={() => loginWithOAuth('google')}>
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          Google
        </button>
        <button type="button" className="auth-social" onClick={() => loginWithOAuth('github')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="auth-divider">
        <span>or with email</span>
      </div>

      {errMsg && <div className="auth-error">{errMsg}</div>}
      {note && <div className="auth-note">{note}</div>}

      <form className="auth-form" action={login}>
        <div className="auth-field">
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder=" "
            className="auth-input"
          />
          <span className="auth-shell" aria-hidden="true" />
          <label className="auth-label" htmlFor="auth-email">Email address</label>
        </div>

        <div className="auth-field">
          <input
            id="auth-password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder=" "
            className="auth-input auth-input-pw"
          />
          <span className="auth-shell" aria-hidden="true" />
          <label className="auth-label" htmlFor="auth-password">Password</label>
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

        <div className="auth-row">
          <button
            type="button"
            className="auth-remember"
            role="checkbox"
            aria-checked={remember}
            onClick={() => setRemember((v) => !v)}
          >
            <span className={`auth-check${remember ? ' on' : ''}`} aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            Remember me
          </button>
          <button type="button" className="auth-forgot" onClick={handleForgot}>
            Forgot password?
          </button>
        </div>

        <SubmitButton />
      </form>
    </>
  )
}
