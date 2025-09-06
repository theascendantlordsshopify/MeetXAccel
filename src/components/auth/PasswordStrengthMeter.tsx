import React from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { clsx } from 'clsx'

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password)
  },
  {
    label: 'Contains lowercase letter',
    test: (password) => /[a-z]/.test(password)
  },
  {
    label: 'Contains number',
    test: (password) => /\d/.test(password)
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
]

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  className
}) => {
  const metRequirements = requirements.filter(req => req.test(password))
  const strength = metRequirements.length
  const strengthPercentage = (strength / requirements.length) * 100

  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-monkai-error'
    if (strength <= 3) return 'bg-monkai-warning'
    if (strength <= 4) return 'bg-yellow-500'
    return 'bg-monkai-success'
  }

  const getStrengthLabel = () => {
    if (strength <= 2) return 'Weak'
    if (strength <= 3) return 'Fair'
    if (strength <= 4) return 'Good'
    return 'Strong'
  }

  if (!password) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={clsx('space-y-3', className)}
    >
      {/* Strength bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-monkai-text-secondary">Password strength</span>
          <span className={clsx(
            'text-sm font-medium',
            strength <= 2 && 'text-monkai-error',
            strength === 3 && 'text-monkai-warning',
            strength === 4 && 'text-yellow-500',
            strength === 5 && 'text-monkai-success'
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        
        <div className="w-full bg-monkai-bg-tertiary rounded-full h-2">
          <motion.div
            className={clsx('h-2 rounded-full transition-all duration-300', getStrengthColor())}
            initial={{ width: 0 }}
            animate={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-2">
        <p className="text-sm text-monkai-text-secondary">Password requirements:</p>
        <div className="grid grid-cols-1 gap-1">
          {requirements.map((requirement, index) => {
            const isMet = requirement.test(password)
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-2"
              >
                <div className={clsx(
                  'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                  isMet ? 'bg-monkai-success' : 'bg-monkai-bg-tertiary'
                )}>
                  {isMet ? (
                    <Check className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <X className="w-2.5 h-2.5 text-monkai-text-tertiary" />
                  )}
                </div>
                <span className={clsx(
                  'text-xs transition-colors',
                  isMet ? 'text-monkai-success' : 'text-monkai-text-tertiary'
                )}>
                  {requirement.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default PasswordStrengthMeter