import Link from 'next/link'
import Image from 'next/image'
import SignInForm from './SignInForm'

export default async function SignInPage(props: { searchParams: Promise<{ message?: string }> }) {
  const searchParams = await props.searchParams

  return (
    <div className="auth-page">
      <header className="auth-nav">
        <div className="auth-nav-inner">
          <Link href="/" className="auth-brand">
            <span className="auth-tile auth-tile-sm" aria-hidden="true">
              <Image src="/sf-logo.svg" alt="" width={30} height={29} unoptimized priority />
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
            <Link className="auth-start" href="/auth/signup">
              Start free
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
                <Image src="/sf-logo.svg" alt="" width={44} height={43} unoptimized priority />
              </span>
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-sub">Sign in to keep tracking your money.</p>
            </div>
            <div className="auth-card-body">
              <SignInForm message={searchParams?.message} />
            </div>
          </div>

          <div className="auth-below">
            <p>
              New to Smart Finance? <Link href="/auth/signup">Create an account</Link>
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
