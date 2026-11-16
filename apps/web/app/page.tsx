'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const HERO_WORD = 'FINANCE'.split('')

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Categorization',
    desc: 'Gemini sorts every transaction the moment it lands — no manual tagging.',
    gradient: 'linear-gradient(160deg, #a3b18a 0%, #01472e 100%)',
    light: false,
  },
  {
    icon: '🎯',
    title: 'Budget Alerts',
    desc: 'Cross 80% or 100% of any budget and know instantly — before you overspend.',
    gradient: 'linear-gradient(160deg, #e9edc9 0%, #a3b18a 100%)',
    light: true,
  },
  {
    icon: '📅',
    title: 'Bill Reminders',
    desc: 'Daily push checks fire before every due date, even with the app closed.',
    gradient: 'linear-gradient(160deg, #ccd5ae 0%, #01472e 100%)',
    light: false,
  },
  {
    icon: '🔄',
    title: 'Subscription Radar',
    desc: 'Detect recurring charges automatically and see your true monthly burn.',
    gradient: 'linear-gradient(160deg, #01472e 0%, #a3b18a 100%)',
    light: false,
  },
  {
    icon: '🏦',
    title: 'Bank Sync',
    desc: 'One-tap sync that simulates real account aggregation, ready for AA webhooks.',
    gradient: 'linear-gradient(160deg, #ccd5ae 0%, #a3b18a 100%)',
    light: true,
  },
  {
    icon: '📄',
    title: 'CSV Import',
    desc: 'Drop in an HDFC or SBI statement — parsed, categorized, imported in seconds.',
    gradient: 'linear-gradient(160deg, #e9edc9 0%, #ccd5ae 100%)',
    light: true,
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Connect',
    desc: 'Sign in securely with the same account across web and mobile — one Supabase session, every device.',
  },
  {
    num: '02',
    title: 'Track',
    desc: 'Sync bank activity, import a CSV statement, or add transactions by hand. Everything lands in one ledger.',
  },
  {
    num: '03',
    title: 'Optimize',
    desc: 'Let AI insights, budgets, bill reminders and subscription detection do the heavy lifting for you.',
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    document.querySelectorAll('.lp-reveal').forEach((el) => observer.observe(el))

    const floats = Array.from(document.querySelectorAll<HTMLElement>('.lp-parallax'))
    const onScroll = () => {
      const y = window.scrollY
      floats.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '0.05')
        el.style.transform = `translateY(${y * speed}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="lp-root">
      <div className="lp-noise" />

      <nav className="lp-nav">
        <Link href="/" className="lp-logo">
          <Image src="/sf-logo.svg" alt="" width={27} height={26} unoptimized priority />
          <span>Smart Finance</span>
        </Link>
        <div className="lp-navpill">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#insights">Insights</a>
        </div>
        <Link href="/auth/signin" className="lp-signin">
          Sign In
        </Link>
      </nav>

      <header className="lp-hero">
        <h1 className="lp-hero-title" aria-label="Finance">
          {HERO_WORD.map((ch, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </h1>

        <div className="lp-parallax lp-float-a" data-speed="0.05" style={{ top: '18%', left: '7%' }}>
          <div className="lp-float" style={{ animationDelay: '0s' }}>
            <div className="lp-float-label">Grocery Run</div>
            <div className="lp-float-value">-₹1,240</div>
            <div className="lp-float-meta">Food & Drink · Today</div>
          </div>
        </div>

        <div className="lp-parallax lp-float-b" data-speed="0.08" style={{ top: '20%', right: '8%' }}>
          <div className="lp-float" style={{ animationDelay: '1.5s' }}>
            <div className="lp-float-label">Budget Used</div>
            <div className="lp-float-value">82%</div>
            <div className="lp-float-bar">
              <div style={{ width: '82%' }} />
            </div>
            <div className="lp-float-meta">Dining · October</div>
          </div>
        </div>

        <div className="lp-parallax lp-float-c" data-speed="0.04" style={{ bottom: '30%', right: '15%' }}>
          <div className="lp-float" style={{ animationDelay: '3s' }}>
            <div className="lp-float-label">Bill Due Tomorrow</div>
            <div className="lp-float-value">₹2,499</div>
            <div className="lp-float-meta">Electricity · Manual Pay</div>
          </div>
        </div>

        <div className="lp-hero-foot">
          <p className="lp-hero-desc">
            Smart Finance Tracker reads your transactions, budgets, bills and
            subscriptions — then tells you exactly where your money went and what
            to do next. Powered by AI, secured by Supabase RLS.
          </p>
          <div className="lp-hero-labels">
            <span>AI-Powered Insights</span>
            <span>Real-Time Alerts</span>
            <span>Bank-Grade Security</span>
          </div>
        </div>
      </header>

      <section id="features" className="lp-section lp-features">
        <div className="lp-heading-row lp-reveal">
          <h2 className="lp-h2">Features</h2>
          <Link href="/auth/signup" className="lp-circle-cta">
            Get
            <br />
            Started
          </Link>
        </div>

        <div className="lp-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="lp-card lp-reveal">
              <div
                className="lp-card-media"
                style={{
                  background: f.gradient,
                  color: f.light ? '#01472e' : '#fefae0',
                }}
              >
                <div className="lp-card-icon">{f.icon}</div>
                <div>
                  <h3 className="lp-card-title">{f.title}</h3>
                  <p className="lp-card-desc">{f.desc}</p>
                </div>
              </div>
              <div className="lp-card-overlay">
                <Link href="/auth/signup" className="lp-card-btn">
                  Start Tracking
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="lp-section lp-how">
        <div className="lp-heading-row lp-reveal">
          <h2 className="lp-h2">How It Works</h2>
        </div>

        <div className="lp-steps" id="insights">
          {STEPS.map((s) => (
            <div key={s.num} className="lp-reveal">
              <div className="lp-step-num">{s.num}</div>
              <div className="lp-step-title">{s.title}</div>
              <p className="lp-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="lp-cta-block lp-reveal">
          <h2 className="lp-h2">Take Control</h2>
          <Link href="/auth/signup" className="lp-cta-btn">
            Start Tracking Free
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-news lp-reveal">
            <h2 className="lp-footer-title">Money tips, straight to your inbox</h2>
            {subscribed ? (
              <div className="lp-news-done">Thank you — you&apos;re on the list.</div>
            ) : (
              <form
                className="lp-news-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (email.trim()) setSubscribed(true)
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="lp-news-input"
                />
                <button type="submit" className="lp-news-btn">
                  Join
                </button>
              </form>
            )}
          </div>

          <div className="lp-footer-links lp-reveal">
            <div className="lp-col">
              <div className="lp-col-title">Product</div>
              <a href="#features">Features</a>
              <a href="#how">How It Works</a>
              <a href="#insights">AI Insights</a>
              <Link href="/auth/signin">Sign In</Link>
            </div>
            <div className="lp-col">
              <div className="lp-col-title">Company</div>
              <Link href="/auth/signup">Get Started</Link>
              <Link href="/dashboard">Dashboard</Link>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span>© 2026 Smart Finance Tracker</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
