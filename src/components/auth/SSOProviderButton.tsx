import React from 'react'
import { motion } from 'framer-motion'
import { Chrome, Building, Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import authService from '@/api/services/authService'
import toast from 'react-hot-toast'

interface SSOProviderButtonProps {
  provider: 'google' | 'microsoft' | 'saml' | 'oidc'
  organizationDomain?: string
  className?: string
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: Chrome,
    color: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-white'
  },
  microsoft: {
    name: 'Microsoft',
    icon: Building,
    color: 'bg-blue-500 hover:bg-blue-600',
    textColor: 'text-white'
  },
  saml: {
    name: 'SAML SSO',
    icon: Shield,
    color: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-white'
  },
  oidc: {
    name: 'OpenID Connect',
    icon: Shield,
    color: 'bg-purple-600 hover:bg-purple-700',
    textColor: 'text-white'
  }
}

const SSOProviderButton: React.FC<SSOProviderButtonProps> = ({
  provider,
  organizationDomain,
  className
}) => {
  const config = providerConfig[provider]
  const Icon = config.icon

  const handleSSOLogin = async () => {
    try {
      if (provider === 'saml' || provider === 'oidc') {
        if (!organizationDomain) {
          toast.error('Organization domain is required for SSO')
          return
        }

        const response = await authService.initiateSSO({
          sso_type: provider,
          organization_domain: organizationDomain,
          redirect_url: window.location.origin + '/dashboard'
        })

        // Redirect to SSO provider
        window.location.href = response.auth_url
      } else {
        // For OAuth providers (Google, Microsoft), redirect to OAuth initiation endpoint
        const clientId = provider === 'google' 
          ? import.meta.env.VITE_GOOGLE_CLIENT_ID
          : import.meta.env.VITE_MICROSOFT_CLIENT_ID

        if (!clientId) {
          toast.error(`${config.name} SSO is not configured`)
          return
        }

        // Construct OAuth URL
        const redirectUri = `${window.location.origin}/auth/callback`
        const state = `${provider}:${Date.now()}`
        
        let authUrl = ''
        if (provider === 'google') {
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=openid email profile&` +
            `response_type=code&` +
            `state=${state}`
        } else if (provider === 'microsoft') {
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=openid email profile&` +
            `response_type=code&` +
            `state=${state}`
        }

        window.location.href = authUrl
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to initiate ${config.name} login`)
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      <Button
        variant="secondary"
        size="lg"
        onClick={handleSSOLogin}
        className={`w-full ${config.color} ${config.textColor} border-0`}
      >
        <Icon className="w-5 h-5 mr-3" />
        Continue with {config.name}
      </Button>
    </motion.div>
  )
}

export default SSOProviderButton