import Cookies from 'js-cookie'

const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user_data'

export const getToken = (): string | null => {
  // Try to get from cookies first (more secure), then localStorage
  return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string): void => {
  // Store in both cookies and localStorage for flexibility
  Cookies.set(TOKEN_KEY, token, { 
    expires: 7, // 7 days
    secure: import.meta.env.PROD,
    sameSite: 'strict'
  })
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = (): void => {
  Cookies.remove(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export const isAuthenticated = (): boolean => {
  const token = getToken()
  if (!token) return false
  
  try {
    // Basic token validation (check if it's not expired)
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    return payload.exp > currentTime
  } catch {
    // If token parsing fails, consider it invalid
    return false
  }
}

export const getUserFromToken = (): any | null => {
  const token = getToken()
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.user || null
  } catch {
    return null
  }
}

export const hasPermission = (permission: string): boolean => {
  const user = getUserFromToken()
  if (!user || !user.permissions) return false
  
  return user.permissions.some((p: any) => p.codename === permission)
}

export const hasRole = (roleName: string): boolean => {
  const user = getUserFromToken()
  if (!user || !user.roles) return false
  
  return user.roles.some((r: any) => r.name === roleName)
}

export const getTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export const formatUserName = (user: { first_name?: string; last_name?: string; email?: string }): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  if (user.first_name) {
    return user.first_name
  }
  return user.email || 'User'
}

export const getInitials = (user: { first_name?: string; last_name?: string; email?: string }): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  }
  if (user.first_name) {
    return user.first_name[0].toUpperCase()
  }
  if (user.email) {
    return user.email[0].toUpperCase()
  }
  return 'U'
}