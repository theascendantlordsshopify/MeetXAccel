import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  Clock,
  Zap,
  Bell,
  UserCheck,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store'
import { toggleSidebar } from '@/store/slices/appSlice'
import { hasPermission } from '@/utils/auth'
import { clsx } from 'clsx'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  badge?: number
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'Event Types',
    href: '/event-types',
    icon: Calendar,
    permission: 'can_create_events'
  },
  {
    name: 'Bookings',
    href: '/bookings',
    icon: Users,
    permission: 'can_manage_bookings'
  },
  {
    name: 'Availability',
    href: '/availability',
    icon: Clock
  },
  {
    name: 'Integrations',
    href: '/integrations',
    icon: Zap,
    permission: 'can_manage_integrations'
  },
  {
    name: 'Workflows',
    href: '/workflows',
    icon: BarChart3
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell
  },
  {
    name: 'Contacts',
    href: '/contacts',
    icon: UserCheck
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    permission: 'can_view_reports'
  },
  {
    name: 'Team',
    href: '/team',
    icon: Users,
    permission: 'can_view_users'
  },
  {
    name: 'Security',
    href: '/security',
    icon: Shield
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch()
  const { sidebarCollapsed } = useAppSelector(state => state.app)
  const { user } = useAppSelector(state => state.auth)
  const location = useLocation()

  const filteredNavItems = navigationItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  )

  return (
    <div className="h-full bg-monkai-bg-secondary border-r border-monkai-border-primary flex flex-col">
      {/* Logo and toggle */}
      <div className="p-4 border-b border-monkai-border-primary">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">
                Calendly Clone
              </span>
            </motion.div>
          )}
          
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg hover:bg-monkai-bg-hover transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-monkai-text-secondary" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-monkai-text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => clsx(
                'nav-link group relative',
                isActive && 'nav-link-active'
              )}
            >
              <Icon className={clsx(
                'w-5 h-5 transition-colors',
                isActive ? 'text-white' : 'text-monkai-text-secondary group-hover:text-monkai-text-primary'
              )} />
              
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-3 font-medium"
                >
                  {item.name}
                </motion.span>
              )}

              {item.badge && item.badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-monkai-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </motion.span>
              )}

              {/* Tooltip for collapsed sidebar */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-monkai-bg-primary text-monkai-text-primary text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {item.name}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="p-4 border-t border-monkai-border-primary">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-monkai-primary-500 rounded-full flex items-center justify-center text-white font-medium">
              {user.first_name?.[0] || user.email[0]}
            </div>
            
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-monkai-text-primary truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-monkai-text-secondary truncate">
                  {user.email}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar