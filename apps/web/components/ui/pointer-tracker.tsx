'use client'

import { useEffect } from 'react'

/**
 * Global pointer tracker — sets CSS custom properties on <html> so all
 * [data-glow] elements can use them. Mount once in the root layout.
 */
export default function PointerTracker() {
  useEffect(() => {
    const sync = (e: PointerEvent) => {
      document.documentElement.style.setProperty('--x', e.clientX.toFixed(2))
      document.documentElement.style.setProperty('--y', e.clientY.toFixed(2))
      document.documentElement.style.setProperty('--xp', (e.clientX / window.innerWidth).toFixed(2))
      document.documentElement.style.setProperty('--yp', (e.clientY / window.innerHeight).toFixed(2))
    }
    document.addEventListener('pointermove', sync)
    return () => document.removeEventListener('pointermove', sync)
  }, [])

  return null
}
