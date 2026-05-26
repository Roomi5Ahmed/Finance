'use client'

import React, { useRef, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlowButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange'
}

const glowColorMap = {
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
  red:    { base: 0,   spread: 200 },
  orange: { base: 30,  spread: 200 },
}

const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
  glowColor = 'purple',
}) => {
  const { base, spread } = glowColorMap[glowColor]
  const btnRef = useRef<HTMLButtonElement>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const xp = x / rect.width
    el.style.setProperty('--x', `${x}px`)
    el.style.setProperty('--y', `${y}px`)
    el.style.setProperty('--xp', xp.toFixed(2))
    el.style.setProperty('--glow-opacity', '1')
  }, [])

  const handlePointerLeave = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    el.style.setProperty('--glow-opacity', '0')
  }, [])

  return (
    <button
      ref={btnRef}
      data-glow
      type={type}
      onClick={onClick}
      disabled={disabled}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        '--base': base,
        '--spread': spread,
        '--radius': '10',
        '--border': '1.5',
        '--size': '150',
      } as React.CSSProperties}
      className={cn(
        'glow-btn relative rounded-lg transition-colors disabled:opacity-50',
        className
      )}
    >
      <div data-glow className="pointer-events-none" />
      {children}
    </button>
  )
}

export { GlowButton }
