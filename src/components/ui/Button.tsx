import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { ButtonProps } from '@/types'

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-monkai-bg-primary disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-monkai-primary-500 text-white hover:bg-monkai-primary-600 focus:ring-monkai-primary-500 shadow-monkai hover:shadow-monkai-lg',
    secondary: 'bg-transparent border border-monkai-border-primary text-monkai-text-primary hover:bg-monkai-bg-hover focus:ring-monkai-primary-500',
    ghost: 'bg-transparent text-monkai-text-primary hover:bg-monkai-bg-hover focus:ring-monkai-primary-500',
    danger: 'bg-monkai-error text-white hover:bg-red-600 focus:ring-monkai-error shadow-lg',
    link: 'bg-transparent text-monkai-primary-500 hover:text-monkai-primary-400 focus:ring-monkai-primary-500 underline-offset-4 hover:underline'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const isDisabled = disabled || loading

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </motion.button>
  )
}

export default Button