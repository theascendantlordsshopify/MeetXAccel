import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  label?: string
  description?: string
  onChange?: (checked: boolean) => void
  className?: string
  name?: string
  value?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
  description,
  onChange,
  className,
  ...props
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked)
  }

  return (
    <div className={clsx('flex items-start space-x-3', className)}>
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        
        <motion.div
          whileTap={{ scale: 0.95 }}
          className={clsx(
            'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200',
            {
              'border-monkai-primary-500 bg-monkai-primary-500': checked || indeterminate,
              'border-monkai-border-primary bg-transparent hover:border-monkai-primary-500': !checked && !indeterminate,
              'opacity-50 cursor-not-allowed': disabled
            }
          )}
          onClick={() => !disabled && onChange?.(!checked)}
        >
          {checked && !indeterminate && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
          )}
          
          {indeterminate && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
            >
              <Minus className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label className="text-sm font-medium text-monkai-text-primary cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-monkai-text-secondary mt-1">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox