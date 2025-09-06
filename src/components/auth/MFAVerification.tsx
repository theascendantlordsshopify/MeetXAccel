import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Smartphone, Key } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { loginUser, clearMFA } from '@/store/slices/authSlice'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import mfaService from '@/api/services/mfaService'
import toast from 'react-hot-toast'

const mfaSchema = z.object({
  otp_code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only numbers')
})

type MFAFormData = z.infer<typeof mfaSchema>

const MFAVerification: React.FC = () => {
  const dispatch = useAppDispatch()
  const { isLoading, mfaDeviceId } = useAppSelector(state => state.auth)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<MFAFormData>({
    resolver: zodResolver(mfaSchema)
  })

  const otpCode = watch('otp_code')

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const onSubmit = async (data: MFAFormData) => {
    try {
      const response = await mfaService.verifyMFALogin({
        otp_code: data.otp_code,
        device_id: mfaDeviceId || undefined
      })

      // Complete login with MFA token
      dispatch(loginUser({
        email: '', // Not needed for MFA verification
        password: '', // Not needed for MFA verification
        mfa_code: data.otp_code
      }))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return

    setResendLoading(true)
    try {
      await mfaService.resendSMSCode()
      toast.success('Verification code sent')
      setCountdown(60) // 60 second cooldown
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send code')
    } finally {
      setResendLoading(false)
    }
  }

  const handleBackToLogin = () => {
    dispatch(clearMFA())
  }

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otpCode && otpCode.length === 6 && /^\d+$/.test(otpCode)) {
      handleSubmit(onSubmit)()
    }
  }, [otpCode, handleSubmit])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="mx-auto w-12 h-12 bg-monkai-primary-500 rounded-full flex items-center justify-center mb-4"
        >
          <Shield className="w-6 h-6 text-white" />
        </motion.div>
        
        <h3 className="text-xl font-semibold text-monkai-text-primary">
          Two-Factor Authentication
        </h3>
        <p className="text-monkai-text-secondary mt-2">
          Enter the 6-digit code from your authenticator app or SMS
        </p>
      </div>

      {/* MFA Code Input */}
      <div className="space-y-4">
        <Input
          {...register('otp_code')}
          type="text"
          label="Verification Code"
          placeholder="000000"
          error={errors.otp_code?.message}
          leftIcon={<Key className="w-4 h-4" />}
          className="text-center text-lg tracking-widest"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
        />

        {/* Auto-submit indicator */}
        {otpCode && otpCode.length === 6 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-monkai-text-secondary"
          >
            Verifying code...
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          className="w-full"
          onClick={handleSubmit(onSubmit)}
        >
          Verify Code
        </Button>

        {/* Resend code (for SMS) */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResendCode}
            loading={resendLoading}
            disabled={countdown > 0}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend SMS code'}
          </Button>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLogin}
          >
            Back to login
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="text-center text-xs text-monkai-text-tertiary">
        <p>Having trouble? Contact support for assistance.</p>
      </div>
    </motion.div>
  )
}

export default MFAVerification