import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { getToken, removeToken, setToken } from '@/utils/auth'
import { store } from '@/store'
import { logout, addNotification } from '@/store/slices/appSlice'
import toast from 'react-hot-toast'

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // Add auth token
    const token = getToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Token ${token}`
      }
    }

    // Add timezone header
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    config.headers = {
      ...config.headers,
      'X-Timezone': timezone
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (import.meta.env.DEV && response.config.metadata) {
      const endTime = new Date()
      const duration = endTime.getTime() - response.config.metadata.startTime.getTime()
      console.log(`API Request: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`)
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Try to refresh token if available
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken
          })
          
          const newToken = response.data.access
          setToken(newToken)
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Token ${newToken}`
          return axiosInstance(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout user
          removeToken()
          store.dispatch(logout())
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, logout user
        removeToken()
        store.dispatch(logout())
        window.location.href = '/login'
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      store.dispatch(addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.'
      }))
    }

    // Handle 429 Rate Limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      const message = retryAfter 
        ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
        : 'Rate limit exceeded. Please try again later.'
      
      toast.error(message)
    }

    // Handle 500+ Server Errors
    if (error.response?.status >= 500) {
      store.dispatch(addNotification({
        type: 'error',
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.'
      }))
    }

    // Handle network errors
    if (!error.response) {
      store.dispatch(addNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.'
      }))
    }

    return Promise.reject(error)
  }
)

export default axiosInstance