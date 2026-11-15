'use client'

import React, { useRef, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlowCardProps {
  children: ReactNode
  className?: string
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange'
}

const glowColorMap = {
  blue:   { base: 155, spread: 200 },
  purple: { base: 155, spread: 200 },
  green:  { base: 155, spread: 200 },
  red:    { base: 155, spread: 200 },
  orange: { base: 155, spread: 200 },
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'purple',
}) => {
  const { base, spread } = glowColorMap[glowColor]
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current
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
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--glow-opacity', '0')
  }, [])

  return (
    <div
      ref={cardRef}
      data-glow
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        '--base': base,
        '--spread': spread,
        '--radius': '16',
      } as React.CSSProperties}
      className={cn('relative overflow-hidden bg-[#ffffff] rounded-[16px]', className)}
    >
      <div data-glow className="pointer-events-none" />
      {children}
    </div>
  )
}

export { GlowCard }
