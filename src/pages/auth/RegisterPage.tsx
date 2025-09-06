import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { useAppSelector } from '@/store'
import RegistrationForm from '@/components/auth/RegistrationForm'
import Card from '@/components/ui/Card'
import { Helmet } from 'react-helmet-async'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAppSelector(state => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  return (
    <>
      <Helmet>
        <title>Create Account - Calendly Clone</title>
        <meta name="description" content="Create your Calendly Clone account and start scheduling meetings" />
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
              Create your account
            </h2>
            <p className="mt-2 text-monkai-text-secondary">
              Start scheduling meetings in minutes
            </p>
          </div>

          {/* Registration form card */}
          <Card className="p-8">
            <RegistrationForm />
          </Card>

          {/* Footer links */}
          <div className="text-center">
            <p className="text-monkai-text-secondary">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-monkai-primary-500 hover:text-monkai-primary-400 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default RegisterPage