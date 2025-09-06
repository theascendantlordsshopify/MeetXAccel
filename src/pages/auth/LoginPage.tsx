import React, { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppSelector } from '@/store'
import LoginForm from '@/components/auth/LoginForm'
import SSOProviderButton from '@/components/auth/SSOProviderButton'
import MFAVerification from '@/components/auth/MFAVerification'
import Card from '@/components/ui/Card'
import { Helmet } from 'react-helmet-async'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, mfaRequired, passwordExpired, graceLoginAllowed } = useAppSelector(state => state.auth)

  const redirectTo = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    if (isAuthenticated && !mfaRequired && !passwordExpired) {
      navigate(redirectTo)
    }
  }, [isAuthenticated, mfaRequired, passwordExpired, navigate, redirectTo])

  // Handle password expired state
  if (passwordExpired) {
    if (graceLoginAllowed) {
      navigate('/force-password-change')
      return null
    } else {
      navigate('/reset-password')
      return null
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In - Calendly Clone</title>
        <meta name="description" content="Sign in to your Calendly Clone account" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6"
            >
              <Calendar className="w-8 h-8 text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-gradient">
              Welcome back
            </h2>
            <p className="mt-2 text-monkai-text-secondary">
              Sign in to your account to continue
            </p>
          </div>

          {/* Main form card */}
          <Card className="p-8">
            {mfaRequired ? (
              <MFAVerification />
            ) : (
              <>
                <LoginForm />
                
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-monkai-border-primary" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-monkai-bg-card text-monkai-text-secondary">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* SSO Providers */}
                <div className="space-y-3">
                  <SSOProviderButton provider="google" />
                  <SSOProviderButton provider="microsoft" />
                  <SSOProviderButton provider="saml" />
                </div>
              </>
            )}
          </Card>

          {/* Footer links */}
          {!mfaRequired && (
            <div className="text-center space-y-2">
              <p className="text-monkai-text-secondary">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-monkai-primary-500 hover:text-monkai-primary-400 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
              
              <p className="text-monkai-text-secondary">
                <Link 
                  to="/reset-password" 
                  className="text-monkai-primary-500 hover:text-monkai-primary-400 transition-colors"
                >
                  Forgot your password?
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}

export default LoginPage