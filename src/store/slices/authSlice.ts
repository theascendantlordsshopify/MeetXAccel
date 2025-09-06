import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User, LoginCredentials, RegisterData, ChangePasswordData } from '@/types'
import authService from '@/api/services/authService'
import { removeToken, setToken } from '@/utils/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  mfaRequired: boolean
  mfaDeviceId: string | null
  passwordExpired: boolean
  graceLoginAllowed: boolean
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  mfaRequired: false,
  mfaDeviceId: null,
  passwordExpired: false,
  graceLoginAllowed: false
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      setToken(response.token)
      return response
    } catch (error: any) {
      if (error.response?.data?.code === 'mfa_required') {
        return rejectWithValue({
          type: 'mfa_required',
          message: error.response.data.message,
          device_id: error.response.data.device_id
        })
      }
      if (error.response?.data?.code === 'password_expired') {
        return rejectWithValue({
          type: 'password_expired',
          message: error.response.data.message,
          grace_login: error.response.data.grace_login_allowed
        })
      }
      return rejectWithValue({
        type: 'login_failed',
        message: error.response?.data?.message || 'Login failed'
      })
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData)
      setToken(response.token)
      return response
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed'
      )
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout()
      removeToken()
      return null
    } catch (error: any) {
      // Even if logout fails on server, clear local state
      removeToken()
      return null
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData: ChangePasswordData, { rejectWithValue }) => {
    try {
      const response = await authService.changePassword(passwordData)
      setToken(response.token) // New token after password change
      return response
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Password change failed'
      )
    }
  }
)

export const forcePasswordChange = createAsyncThunk(
  'auth/forcePasswordChange',
  async (newPassword: string, { rejectWithValue }) => {
    try {
      const response = await authService.forcePasswordChange(newPassword)
      setToken(response.token)
      return response
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Password change failed'
      )
    }
  }
)

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail(token)
      return response
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Email verification failed'
      )
    }
  }
)

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authService.requestPasswordReset(email)
      return response
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Password reset request failed'
      )
    }
  }
)

export const confirmPasswordReset = createAsyncThunk(
  'auth/confirmPasswordReset',
  async ({ token, newPassword }: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await authService.confirmPasswordReset(token, newPassword)
      return response
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Password reset failed'
      )
    }
  }
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearMFA: (state) => {
      state.mfaRequired = false
      state.mfaDeviceId = null
    },
    setMFARequired: (state, action: PayloadAction<{ deviceId?: string }>) => {
      state.mfaRequired = true
      state.mfaDeviceId = action.payload.deviceId || null
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.mfaRequired = false
      state.mfaDeviceId = null
      state.passwordExpired = false
      state.graceLoginAllowed = false
      state.error = null
      removeToken()
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.mfaRequired = false
        state.passwordExpired = false
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action: any) => {
        state.isLoading = false
        state.isAuthenticated = false
        
        if (action.payload?.type === 'mfa_required') {
          state.mfaRequired = true
          state.mfaDeviceId = action.payload.device_id
          state.error = null
        } else if (action.payload?.type === 'password_expired') {
          state.passwordExpired = true
          state.graceLoginAllowed = action.payload.grace_login
          state.error = action.payload.message
        } else {
          state.error = action.payload?.message || 'Login failed'
        }
      })

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action: any) => {
        state.isLoading = false
        state.error = action.payload || 'Registration failed'
      })

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.mfaRequired = false
        state.mfaDeviceId = null
        state.passwordExpired = false
        state.graceLoginAllowed = false
        state.error = null
      })

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.passwordExpired = false
        state.error = null
      })
      .addCase(changePassword.rejected, (state, action: any) => {
        state.isLoading = false
        state.error = action.payload || 'Password change failed'
      })

    // Force Password Change
    builder
      .addCase(forcePasswordChange.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forcePasswordChange.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.passwordExpired = false
        state.graceLoginAllowed = false
        state.error = null
      })
      .addCase(forcePasswordChange.rejected, (state, action: any) => {
        state.isLoading = false
        state.error = action.payload || 'Password change failed'
      })

    // Email Verification
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.isLoading = false
        if (state.user) {
          state.user.is_email_verified = true
          state.user.account_status = 'active'
        }
        state.error = null
      })
      .addCase(verifyEmail.rejected, (state, action: any) => {
        state.isLoading = false
        state.error = action.payload || 'Email verification failed'
      })

    // Password Reset Request
    builder
      .addCase(requestPasswordReset.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(requestPasswordReset.rejected, (state, action: any) => {
        state.isLoading = false
        state.error = action.payload || 'Password reset request failed'
      })

    // Password Reset Confirm
    builder
      .addCase(confirmPasswordReset.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(confirmPasswordReset.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(confirmPasswordReset.rejected, (state, action: any) => {
        state.isLoading = false
        state.error = action.payload || 'Password reset failed'
      })
  }
})

export const { 
  clearError, 
  clearMFA, 
  setMFARequired, 
  updateUser, 
  logout 
} = authSlice.actions

export default authSlice.reducer