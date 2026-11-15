import Link from 'next/link'
import SignUpForm from './SignUpForm'

export default async function SignUpPage(props: { searchParams: Promise<{ message?: string }> }) {
  const searchParams = await props.searchParams

  return (
    <div className="auth-page">
      <header className="auth-nav">
        <div className="auth-nav-inner">
          <Link href="/" className="auth-brand">
            <span className="auth-tile auth-tile-sm" aria-hidden="true">
              <span className="auth-monogram">S</span>
              <span className="auth-tile-dot" />
            </span>
            <span className="auth-wordmark">Smart Finance</span>
          </Link>

          <nav className="auth-nav-links" aria-label="Primary">
            <Link href="/#features">Features</Link>
            <Link href="/#how">How It Works</Link>
            <Link href="/#insights">Insights</Link>
          </nav>

          <div className="auth-nav-right">
            <Link className="auth-help" href="/#how">
              Need help?
            </Link>
            <Link className="auth-start" href="/auth/signin">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-grid-layer" aria-hidden="true" />
        <div className="auth-card-wrap">
          <div className="auth-card text-[#01472e]">
            <div className="auth-rail" aria-hidden="true" />
            <div className="auth-card-head">
              <span className="auth-tile auth-tile-lg" aria-hidden="true">
                <span className="auth-monogram">S</span>
                <span className="auth-tile-dot" />
              </span>
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-sub">Start tracking your money in minutes.</p>
            </div>
            <div className="auth-card-body">
              <SignUpForm message={searchParams?.message} />
            </div>
          </div>

          <div className="auth-below">
            <p>
              Already have an account? <Link href="/auth/signin">Sign in</Link>
            </p>
            <p className="auth-trust">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>
                Protected by Smart Finance security. By continuing you agree to our{' '}
                <Link href="/">Terms</Link>.
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
