import React, { forwardRef } from 'react'
import { clsx } from 'clsx'
import { InputProps } from '@/types'

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  label,
  helperText,
  leftIcon,
  rightIcon,
  className,
  ...props
}, ref) => {
  const inputClasses = clsx(
    'form-input',
    {
      'border-monkai-error focus:border-monkai-error focus:ring-monkai-error': error,
      'pl-10': leftIcon,
      'pr-10': rightIcon,
      'opacity-50 cursor-not-allowed': disabled
    },
    className
  )

  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-monkai-error ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-monkai-text-tertiary">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          required={required}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-monkai-text-tertiary">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="form-error">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-monkai-text-tertiary text-sm mt-1">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input