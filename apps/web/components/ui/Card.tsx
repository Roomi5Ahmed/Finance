import { HTMLAttributes, forwardRef } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow ${className}`}
    {...props}
  >
    {children}
  </div>
))
Card.displayName = 'Card'

export { Card }
