import axiosInstance from '@/api/axiosInstance'
import { 
  LoginCredentials, 
  RegisterData, 
  ChangePasswordData,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationData,
  User,
  ApiResponse
} from '@/types'

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await axiosInstance.post('/users/login/', credentials)
    return response.data
  }

  async register(userData: RegisterData): Promise<{ user: User; token: string; message: string }> {
    const response = await axiosInstance.post('/users/register/', userData)
    return response.data
  }

  async logout(): Promise<void> {
    await axiosInstance.post('/users/logout/')
  }

  async changePassword(passwordData: ChangePasswordData): Promise<{ message: string; token: string }> {
    const response = await axiosInstance.post('/users/change-password/', passwordData)
    return response.data
  }

  async forcePasswordChange(newPassword: string): Promise<{ message: string; token: string }> {
    const response = await axiosInstance.post('/users/force-password-change/', {
      new_password: newPassword,
      new_password_confirm: newPassword
    })
    return response.data
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/request-password-reset/', { email })
    return response.data
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/confirm-password-reset/', {
      token,
      new_password: newPassword,
      new_password_confirm: newPassword
    })
    return response.data
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/verify-email/', { token })
    return response.data
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/resend-verification/', { email })
    return response.data
  }

  async getProfile(): Promise<User> {
    const response = await axiosInstance.get('/users/profile/')
    return response.data
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const response = await axiosInstance.patch('/users/profile/', profileData)
    return response.data
  }

  async getPublicProfile(organizerSlug: string): Promise<any> {
    const response = await axiosInstance.get(`/users/public/${organizerSlug}/`)
    return response.data
  }

  // SSO Methods
  async initiateSSO(ssoData: { sso_type: 'saml' | 'oidc'; organization_domain: string; redirect_url?: string }): Promise<{ auth_url: string }> {
    const response = await axiosInstance.post('/users/sso/initiate/', ssoData)
    return response.data
  }

  async ssoDiscovery(domain: string): Promise<{ domain: string; providers: any[] }> {
    const response = await axiosInstance.get(`/users/sso/discovery/?domain=${domain}`)
    return response.data
  }

  async getSSOSessions(): Promise<any[]> {
    const response = await axiosInstance.get('/users/sso/sessions/')
    return response.data.sessions
  }

  async revokeSSOSession(sessionId: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(`/users/sso/sessions/${sessionId}/revoke/`)
    return response.data
  }

  async ssoLogout(): Promise<{ message: string; logout_urls: any[] }> {
    const response = await axiosInstance.post('/users/sso/logout/')
    return response.data
  }
}

export default new AuthService()