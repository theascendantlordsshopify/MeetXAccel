import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search, 
  Bell, 
  Menu, 
  Sun, 
  Moon, 
  Palette,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store'
import { toggleSidebar, setTheme, markAllNotificationsRead } from '@/store/slices/appSlice'
import { logoutUser } from '@/store/slices/authSlice'
import { Theme } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { clsx } from 'clsx'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  const { theme, notifications, pageTitle } = useAppSelector(state => state.app)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const unreadNotifications = notifications.filter(n => !n.read)

  const handleLogout = () => {
    dispatch(logoutUser())
    navigate('/login')
  }

  const handleThemeChange = (newTheme: Theme) => {
    dispatch(setTheme(newTheme))
  }

  const themeIcons = {
    light: Sun,
    dark: Moon,
    monkai: Palette
  }

  const ThemeIcon = themeIcons[theme]

  return (
    <header className="bg-monkai-bg-card border-b border-monkai-border-primary px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(toggleSidebar())}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-xl font-semibold text-monkai-text-primary">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={setSearchQuery}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const themes: Theme[] = ['light', 'dark', 'monkai']
                const currentIndex = themes.indexOf(theme)
                const nextTheme = themes[(currentIndex + 1) % themes.length]
                handleThemeChange(nextTheme)
              }}
              className="p-2"
            >
              <ThemeIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-monkai-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                </motion.span>
              )}
            </Button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-80 bg-monkai-bg-card border border-monkai-border-primary rounded-xl shadow-monkai-xl z-50"
              >
                <div className="p-4 border-b border-monkai-border-primary">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-monkai-text-primary">Notifications</h3>
                    {unreadNotifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dispatch(markAllNotificationsRead())}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-monkai-text-secondary">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={clsx(
                          'p-4 border-b border-monkai-border-primary last:border-b-0 hover:bg-monkai-bg-hover transition-colors',
                          !notification.read && 'bg-monkai-bg-tertiary'
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={clsx(
                            'w-2 h-2 rounded-full mt-2',
                            notification.type === 'success' && 'bg-monkai-success',
                            notification.type === 'error' && 'bg-monkai-error',
                            notification.type === 'warning' && 'bg-monkai-warning',
                            notification.type === 'info' && 'bg-monkai-info'
                          )} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-monkai-text-primary">
                              {notification.title}
                            </p>
                            <p className="text-xs text-monkai-text-secondary mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-monkai-text-tertiary mt-1">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 10 && (
                  <div className="p-4 border-t border-monkai-border-primary">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/notifications')}
                      className="w-full"
                    >
                      View all notifications
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2"
            >
              <div className="w-8 h-8 bg-monkai-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                {user?.first_name?.[0] || user?.email[0] || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-monkai-text-secondary" />
            </Button>

            {/* User dropdown */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-56 bg-monkai-bg-card border border-monkai-border-primary rounded-xl shadow-monkai-xl z-50"
              >
                <div className="p-4 border-b border-monkai-border-primary">
                  <p className="font-medium text-monkai-text-primary">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-sm text-monkai-text-secondary">
                    {user?.email}
                  </p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-monkai-bg-hover transition-colors"
                  >
                    <User className="w-4 h-4 text-monkai-text-secondary" />
                    <span className="text-monkai-text-primary">Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-monkai-bg-hover transition-colors"
                  >
                    <Settings className="w-4 h-4 text-monkai-text-secondary" />
                    <span className="text-monkai-text-primary">Settings</span>
                  </button>

                  <div className="border-t border-monkai-border-primary my-2" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-monkai-bg-hover transition-colors text-monkai-error"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Sidebar