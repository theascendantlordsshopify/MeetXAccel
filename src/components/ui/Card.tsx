import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { BaseComponentProps } from '@/types'

interface CardProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  footer?: React.ReactNode
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  footer,
  hover = false,
  padding = 'md',
  onClick,
  className
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const cardClasses = clsx(
    'card',
    {
      'card-hover cursor-pointer': hover || onClick,
    },
    className
  )

  const CardComponent = onClick ? motion.div : 'div'
  const motionProps = onClick ? {
    whileHover: { y: -2 },
    whileTap: { scale: 0.98 },
    onClick
  } : {}

  return (
    <CardComponent
      className={cardClasses}
      {...motionProps}
    >
      {(title || subtitle) && (
        <div className={clsx('border-b border-monkai-border-primary pb-4 mb-4', paddingClasses[padding])}>
          {title && (
            <h3 className="text-lg font-semibold text-monkai-text-primary">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-monkai-text-secondary text-sm mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className={paddingClasses[padding]}>
        {children}
      </div>

      {footer && (
        <div className={clsx('border-t border-monkai-border-primary pt-4 mt-4', paddingClasses[padding])}>
          {footer}
        </div>
      )}
    </CardComponent>
  )
}

export default Card