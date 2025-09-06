import React, { createContext, useContext, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/store'
import { setTheme } from '@/store/slices/appSlice'
import { Theme } from '@/types'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  isMonkai: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch()
  const theme = useAppSelector(state => state.app.theme)

  useEffect(() => {
    // Apply theme to document
    document.documentElement.className = theme
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      const colors = {
        light: '#ffffff',
        dark: '#1a1a1a',
        monkai: '#0f0f0f'
      }
      metaThemeColor.setAttribute('content', colors[theme])
    }
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    dispatch(setTheme(newTheme))
  }

  const value: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
    isDark: theme === 'dark' || theme === 'monkai',
    isMonkai: theme === 'monkai'
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}