import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { store, persistor } from '@/store'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

import '@/styles/index.css'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return error?.response?.status === 408 || error?.response?.status === 429
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo)
    // In production, send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-monkai-bg-primary flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-monkai-text-primary mb-4">
              Something went wrong
            </h1>
            <p className="text-monkai-text-secondary mb-6">
              We're sorry, but something unexpected happened.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-monkai-primary-500 text-white rounded-lg hover:bg-monkai-primary-600 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <Provider store={store}>
          <PersistGate loading={<LoadingSpinner overlay />} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <ThemeProvider>
                  <AuthProvider>
                    <App />
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#1e1e1e',
                          color: '#ffffff',
                          border: '1px solid #333333'
                        },
                        success: {
                          iconTheme: {
                            primary: '#10b981',
                            secondary: '#ffffff'
                          }
                        },
                        error: {
                          iconTheme: {
                            primary: '#ef4444',
                            secondary: '#ffffff'
                          }
                        }
                      }}
                    />
                  </AuthProvider>
                </ThemeProvider>
              </BrowserRouter>
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
)