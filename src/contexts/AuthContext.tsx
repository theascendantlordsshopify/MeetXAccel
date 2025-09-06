import React, { createContext, useContext, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/store'
import { updateUser } from '@/store/slices/authSlice'
import { getToken, isAuthenticated as checkAuth } from '@/utils/auth'
import authService from '@/api/services/authService'

interface AuthContextType {
  isAuthenticated: boolean
  user: any
  login: (credentials: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, token } = useAppSelector(state => state.auth)

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getToken()
      if (storedToken && checkAuth()) {
        try {
          // Fetch current user profile
          const userProfile = await authService.getProfile()
          dispatch(updateUser(userProfile))
        } catch (error) {
          // Token might be invalid, let the axios interceptor handle it
          console.error('Failed to fetch user profile:', error)
        }
      }
    }

    initializeAuth()
  }, [dispatch])

  const login = async (credentials: any) => {
    // This will be handled by the LoginForm component
    // through Redux actions
  }

  const logout = () => {
    // This will be handled by the logout action
  }

  const refreshUser = async () => {
    if (isAuthenticated) {
      try {
        const userProfile = await authService.getProfile()
        dispatch(updateUser(userProfile))
      } catch (error) {
        console.error('Failed to refresh user profile:', error)
      }
    }
  }

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}