import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  overlay?: boolean
  message?: string
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  overlay = false,
  message,
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const spinner = (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={clsx(
          'border-2 border-monkai-bg-tertiary border-t-monkai-primary-500 rounded-full',
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      {message && (
        <p className="text-monkai-text-secondary text-sm mt-3 animate-pulse">
          {message}
        </p>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-monkai-bg-card p-8 rounded-xl border border-monkai-border-primary">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner