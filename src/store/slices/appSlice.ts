import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Theme } from '@/types'

interface AppState {
  theme: Theme
  sidebarCollapsed: boolean
  globalLoading: boolean
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: string
    read: boolean
  }>
  breadcrumbs: Array<{
    label: string
    href?: string
  }>
  pageTitle: string
  searchQuery: string
  isOnline: boolean
}

const initialState: AppState = {
  theme: 'monkai',
  sidebarCollapsed: false,
  globalLoading: false,
  notifications: [],
  breadcrumbs: [],
  pageTitle: 'Dashboard',
  searchQuery: '',
  isOnline: navigator.onLine
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
      // Apply theme to document
      document.documentElement.className = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload
    },
    addNotification: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'warning' | 'info'
      title: string
      message: string
    }>) => {
      const notification = {
        id: Date.now().toString(),
        ...action.payload,
        timestamp: new Date().toISOString(),
        read: false
      }
      state.notifications.unshift(notification)
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(n => n.read = true)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; href?: string }>>) => {
      state.breadcrumbs = action.payload
    },
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload
      document.title = `${action.payload} - Calendly Clone`
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    }
  }
})

export const {
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setGlobalLoading,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
  setBreadcrumbs,
  setPageTitle,
  setSearchQuery,
  setOnlineStatus
} = appSlice.actions

export default appSlice.reducer