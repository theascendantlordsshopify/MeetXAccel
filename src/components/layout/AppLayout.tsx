import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { setSidebarCollapsed, setOnlineStatus } from '@/store/slices/appSlice'
import Sidebar from './Sidebar'
import Header from './Header'
import { clsx } from 'clsx'

const AppLayout: React.FC = () => {
  const dispatch = useAppDispatch()
  const { sidebarCollapsed, isOnline } = useAppSelector(state => state.app)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Auto-collapse sidebar on mobile
      if (mobile && !sidebarCollapsed) {
        dispatch(setSidebarCollapsed(true))
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [dispatch, sidebarCollapsed])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true))
    const handleOffline = () => dispatch(setOnlineStatus(false))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [dispatch])

  return (
    <div className="min-h-screen bg-monkai-bg-primary">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-monkai-warning text-black text-center py-2 text-sm font-medium">
          You are currently offline. Some features may not be available.
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={clsx(
          'transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
          isMobile && !sidebarCollapsed && 'fixed inset-y-0 left-0 z-50'
        )}>
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {isMobile && !sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => dispatch(setSidebarCollapsed(true))}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          <main className="flex-1 overflow-y-auto bg-monkai-bg-secondary">
            <div className="container mx-auto px-6 py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout