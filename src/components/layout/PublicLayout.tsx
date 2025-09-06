import React from 'react'
import { Outlet } from 'react-router-dom'
import { Calendar } from 'lucide-react'

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-monkai-bg-primary">
      {/* Simple header for public pages */}
      <header className="border-b border-monkai-border-primary">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">
                Calendly Clone
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="/login"
                className="text-monkai-text-secondary hover:text-monkai-text-primary transition-colors"
              >
                Sign in
              </a>
              <a
                href="/register"
                className="btn-primary"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-monkai-border-primary py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-monkai-text-secondary text-sm">
            © 2024 Calendly Clone. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout