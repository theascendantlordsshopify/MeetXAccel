import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { loginUser, clearError } from '@/store/slices/authSlice'
import { LoginCredentials } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { useState } from 'react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional()
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector(state => state.auth)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember_me: false
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    dispatch(clearError())
    dispatch(loginUser(data as LoginCredentials))
  }

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
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

      {/* Email field */}
      <Input
        {...register('email')}
        type="email"
        label="Email address"
        placeholder="Enter your email"
        error={errors.email?.message}
        leftIcon={<Mail className="w-4 h-4" />}
        required
      />

      {/* Password field */}
      <Input
        {...register('password')}
        type={showPassword ? 'text' : 'password'}
        label="Password"
        placeholder="Enter your password"
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

      {/* Remember me */}
      <div className="flex items-center justify-between">
        <Checkbox
          {...register('remember_me')}
          label="Remember me"
        />
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isLoading}
        className="w-full"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </motion.form>
  )
}

export default LoginForm