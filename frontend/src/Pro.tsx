import { useEffect, useRef } from 'react'
import './Pro.css'

/** Kit (ConvertKit) email-capture form. Its async script injects the form
 *  where it's mounted; a raw <script> in JSX won't execute, so append it via
 *  the DOM. Pro isn't built yet — this collects a launch waitlist. */
function KitSignupForm() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://open-source-jobs.kit.com/18163cee49/index.js'
    script.dataset.uid = '18163cee49'
    host.appendChild(script)
    return () => {
      host.innerHTML = ''
    }
  }, [])
  return <div className="pro-signup" ref={ref} />
}

/** Standalone, minimalist pricing page for Input Pub Pro.
 *  Reached at /pro (see main.tsx); plain anchor links navigate, so it works
 *  as a full page load on GitHub Pages via the 404.html SPA fallback. */
function Pro() {
  return (
    <div className="pro">
      <div className="pro-wrap">
        <a className="pro-back" href="/">
          ← Back to editor
        </a>

        <main className="pro-card">
          <h1 className="pro-title">Input Pub Pro</h1>
        <p className="pro-tagline">Everything in the free editor, plus a little more.</p>

        <div className="pro-price">
          <span className="pro-amount">$5</span>
          <span className="pro-period">/ month</span>
        </div>

        <ul className="pro-features">
          <li>
            <span className="pro-feature-name">Image uploads</span>
            <span className="pro-feature-desc">
              Drop images straight into a note; we host them and insert the link for you.
            </span>
          </li>
          <li>
            <span className="pro-feature-name">Cloud drafts</span>
            <span className="pro-feature-desc">
              Store drafts in the cloud — pick up where you left off on any device.
            </span>
          </li>
        </ul>

        <KitSignupForm />
        <p className="pro-note">
          Coming soon — leave your email and we'll let you know when Pro launches. The free editor
          stays free.
        </p>
        </main>
      </div>
    </div>
  )
}

export default Pro
