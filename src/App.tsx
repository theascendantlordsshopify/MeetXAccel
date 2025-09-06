import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store'
import { AnimatePresence } from 'framer-motion'

// Layouts
import AppLayout from '@/components/layout/AppLayout'
import PublicLayout from '@/components/layout/PublicLayout'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import PasswordResetPage from '@/pages/auth/PasswordResetPage'
import PasswordResetConfirmPage from '@/pages/auth/PasswordResetConfirmPage'
import EmailVerificationPage from '@/pages/auth/EmailVerificationPage'
import ForcedPasswordChangePage from '@/pages/auth/ForcedPasswordChangePage'

// Dashboard
import DashboardPage from '@/pages/DashboardPage'

// Profile Pages
import ProfilePage from '@/pages/profile/ProfilePage'
import SecurityPage from '@/pages/profile/SecurityPage'
import PublicProfilePage from '@/pages/profile/PublicProfilePage'

// Team Pages
import TeamPage from '@/pages/team/TeamPage'
import InvitePage from '@/pages/team/InvitePage'
import InvitationResponsePage from '@/pages/team/InvitationResponsePage'

// MFA Pages
import MFASetupPage from '@/pages/mfa/MFASetupPage'
import MFADevicesPage from '@/pages/mfa/MFADevicesPage'

// Security Pages
import SessionsPage from '@/pages/security/SessionsPage'
import AuditLogPage from '@/pages/security/AuditLogPage'

// SSO Admin Pages
import SAMLConfigPage from '@/pages/admin/sso/SAMLConfigPage'
import OIDCConfigPage from '@/pages/admin/sso/OIDCConfigPage'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, mfaRequired, passwordExpired } = useAppSelector(state => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (mfaRequired) {
    return <Navigate to="/login" replace />
  }

  if (passwordExpired) {
    return <Navigate to="/force-password-change" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, mfaRequired, passwordExpired } = useAppSelector(state => state.auth)

  if (isAuthenticated && !mfaRequired && !passwordExpired) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Navigate to="/login" replace />} />
          
          {/* Authentication Routes */}
          <Route path="login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
          <Route path="reset-password" element={
            <PublicRoute>
              <PasswordResetPage />
            </PublicRoute>
          } />
          <Route path="reset-password/confirm" element={
            <PublicRoute>
              <PasswordResetConfirmPage />
            </PublicRoute>
          } />
          <Route path="verify-email" element={<EmailVerificationPage />} />
          <Route path="force-password-change" element={<ForcedPasswordChangePage />} />
          
          {/* Public Profile */}
          <Route path=":organizerSlug" element={<PublicProfilePage />} />
          
          {/* Invitation Response */}
          <Route path="invitation" element={<InvitationResponsePage />} />
        </Route>

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Profile Management */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/security" element={<SecurityPage />} />
          
          {/* Team Management */}
          <Route path="team" element={<TeamPage />} />
          <Route path="team/invite" element={<InvitePage />} />
          
          {/* MFA Management */}
          <Route path="mfa/setup" element={<MFASetupPage />} />
          <Route path="mfa/devices" element={<MFADevicesPage />} />
          
          {/* Security Management */}
          <Route path="security/sessions" element={<SessionsPage />} />
          <Route path="security/audit-logs" element={<AuditLogPage />} />
          
          {/* SSO Admin (Admin only) */}
          <Route path="admin/sso/saml" element={<SAMLConfigPage />} />
          <Route path="admin/sso/oidc" element={<OIDCConfigPage />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App