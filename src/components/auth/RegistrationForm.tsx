import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { registerUser, clearError } from '@/store/slices/authSlice'
import { RegisterData } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import PasswordStrengthMeter from './PasswordStrengthMeter'

const registrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  password_confirm: z.string(),
  terms_accepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine(data => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ['password_confirm']
})

type RegistrationFormData = z.infer<typeof registrationSchema>

const steps = [
  {
    title: 'Personal Information',
    description: 'Tell us about yourself',
    fields: ['first_name', 'last_name', 'email']
  },
  {
    title: 'Account Details',
    description: 'Create your account credentials',
    fields: ['username', 'password', 'password_confirm']
  },
  {
    title: 'Terms & Conditions',
    description: 'Review and accept our terms',
    fields: ['terms_accepted']
  }
]

const RegistrationForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector(state => state.auth)
  const [currentStep, setCurrentStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    getValues
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange'
  })

  const password = watch('password')
  const currentStepFields = steps[currentStep].fields

  const onSubmit = async (data: RegistrationFormData) => {
    dispatch(clearError())
    dispatch(registerUser(data as RegisterData))
  }

  const nextStep = async () => {
    const isValid = await trigger(currentStepFields as any)
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = async () => {
    return await trigger(currentStepFields as any)
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index <= currentStep
                  ? 'bg-monkai-primary-500 text-white'
                  : 'bg-monkai-bg-tertiary text-monkai-text-tertiary'
              }`}
              animate={{
                scale: index === currentStep ? 1.1 : 1,
                backgroundColor: index <= currentStep ? '#9d4edd' : '#2a2a2a'
              }}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </motion.div>
            
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 transition-colors ${
                index < currentStep ? 'bg-monkai-primary-500' : 'bg-monkai-bg-tertiary'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-monkai-text-primary">
          {steps[currentStep].title}
        </h3>
        <p className="text-monkai-text-secondary text-sm">
          {steps[currentStep].description}
        </p>
      </div>

      {/* Global error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-monkai-error bg-opacity-10 border border-monkai-error rounded-lg p-4"
        >
          <p className="text-monkai-error text-sm">{error}</p>
        </motion.div>
      )}

      {/* Form steps */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Step 0: Personal Information */}
            {currentStep === 0 && (
              <>
                <Input
                  {...register('first_name')}
                  type="text"
                  label="First Name"
                  placeholder="Enter your first name"
                  error={errors.first_name?.message}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Input
                  {...register('last_name')}
                  type="text"
                  label="Last Name"
                  placeholder="Enter your last name"
                  error={errors.last_name?.message}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Input
                  {...register('email')}
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  error={errors.email?.message}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
              </>
            )}

            {/* Step 1: Account Details */}
            {currentStep === 1 && (
              <>
                <Input
                  {...register('username')}
                  type="text"
                  label="Username"
                  placeholder="Choose a username"
                  error={errors.username?.message}
                  leftIcon={<User className="w-4 h-4" />}
                  helperText="This will be part of your booking URL"
                  required
                />

                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Create a strong password"
                  error={errors.password?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-monkai-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                {password && <PasswordStrengthMeter password={password} />}

                <Input
                  {...register('password_confirm')}
                  type={showPasswordConfirm ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  error={errors.password_confirm?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="hover:text-monkai-text-primary transition-colors"
                    >
                      {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </>
            )}

            {/* Step 2: Terms & Conditions */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-monkai-bg-tertiary rounded-lg p-6 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-monkai-text-primary mb-4">Terms and Conditions</h4>
                  <div className="text-sm text-monkai-text-secondary space-y-2">
                    <p>By creating an account, you agree to our terms of service and privacy policy.</p>
                    <p>You acknowledge that you have read and understood our data processing practices.</p>
                    <p>You consent to receive important account and service-related communications.</p>
                  </div>
                </div>

                <Checkbox
                  {...register('terms_accepted')}
                  label="I agree to the Terms and Conditions and Privacy Policy"
                  description="Required to create your account"
                  error={errors.terms_accepted?.message}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={nextStep}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export default RegisterPage