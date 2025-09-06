import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAppDispatch } from '@/store'
import { setPageTitle, setBreadcrumbs } from '@/store/slices/appSlice'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'))
    dispatch(setBreadcrumbs([
      { label: 'Dashboard' }
    ]))
  }, [dispatch])

  // Mock data - in real app, this would come from API
  const stats = {
    totalBookings: 156,
    upcomingBookings: 12,
    totalEventTypes: 8,
    activeIntegrations: 3
  }

  const recentActivity = [
    {
      id: '1',
      type: 'booking_created',
      message: 'New booking: Discovery Call with John Doe',
      time: '2 minutes ago',
      icon: Calendar,
      color: 'text-monkai-success'
    },
    {
      id: '2',
      type: 'integration_connected',
      message: 'Google Calendar integration connected',
      time: '1 hour ago',
      icon: CheckCircle,
      color: 'text-monkai-info'
    },
    {
      id: '3',
      type: 'workflow_executed',
      message: 'Welcome email workflow executed',
      time: '3 hours ago',
      icon: Activity,
      color: 'text-monkai-primary-500'
    }
  ]

  const quickActions = [
    {
      title: 'Create Event Type',
      description: 'Set up a new meeting type',
      href: '/event-types/create',
      icon: Plus,
      color: 'bg-monkai-primary-500'
    },
    {
      title: 'View Bookings',
      description: 'Manage your appointments',
      href: '/bookings',
      icon: Users,
      color: 'bg-monkai-accent-500'
    },
    {
      title: 'Set Availability',
      description: 'Update your schedule',
      href: '/availability',
      icon: Clock,
      color: 'bg-monkai-info'
    },
    {
      title: 'View Analytics',
      description: 'Check your performance',
      href: '/analytics',
      icon: TrendingUp,
      color: 'bg-monkai-success'
    }
  ]

  return (
    <>
      <Helmet>
        <title>Dashboard - Calendly Clone</title>
      </Helmet>

      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Welcome to your Dashboard
          </h1>
          <p className="text-xl text-monkai-text-secondary">
            Manage your scheduling and grow your business
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-monkai-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-monkai-text-primary">{stats.totalBookings}</h3>
            <p className="text-monkai-text-secondary">Total Bookings</p>
          </Card>

          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-monkai-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-monkai-text-primary">{stats.upcomingBookings}</h3>
            <p className="text-monkai-text-secondary">Upcoming</p>
          </Card>

          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-monkai-info rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-monkai-text-primary">{stats.totalEventTypes}</h3>
            <p className="text-monkai-text-secondary">Event Types</p>
          </Card>

          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-monkai-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-monkai-text-primary">{stats.activeIntegrations}</h3>
            <p className="text-monkai-text-secondary">Integrations</p>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-monkai-text-primary mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Link to={action.href}>
                  <Card hover className="p-6 h-full">
                    <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mb-4`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-monkai-text-primary mb-2">
                      {action.title}
                    </h3>
                    <p className="text-monkai-text-secondary text-sm mb-4">
                      {action.description}
                    </p>
                    <div className="flex items-center text-monkai-primary-500 text-sm font-medium">
                      Get started
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Activity Feed */}
          <Card title="Recent Activity" className="h-fit">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-monkai-bg-hover transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color} bg-opacity-20`}>
                    <activity.icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-monkai-text-primary">{activity.message}</p>
                    <p className="text-xs text-monkai-text-tertiary">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-monkai-border-primary">
              <Link to="/security/audit-logs">
                <Button variant="ghost" size="sm" className="w-full">
                  View all activity
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* System Status */}
          <Card title="System Status" className="h-fit">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-monkai-success bg-opacity-10">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-monkai-success" />
                  <span className="text-monkai-text-primary">Calendar Sync</span>
                </div>
                <span className="text-monkai-success text-sm font-medium">Active</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-monkai-success bg-opacity-10">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-monkai-success" />
                  <span className="text-monkai-text-primary">Email Notifications</span>
                </div>
                <span className="text-monkai-success text-sm font-medium">Active</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-monkai-warning bg-opacity-10">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-monkai-warning" />
                  <span className="text-monkai-text-primary">Video Integration</span>
                </div>
                <span className="text-monkai-warning text-sm font-medium">Setup Required</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-monkai-border-primary">
              <Link to="/integrations">
                <Button variant="ghost" size="sm" className="w-full">
                  Manage integrations
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  )
}

export default DashboardPage