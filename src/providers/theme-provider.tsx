import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  ThemeProviderContext,
  type Theme,
  type ThemeProviderState,
} from '@/providers/theme-context'

const storageKey = 'household-finance-theme'

function getInitialTheme(defaultTheme: Theme) {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  return (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getInitialTheme(defaultTheme),
  )

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      root.classList.remove('light', 'dark')

      const resolvedTheme =
        theme === 'system'
          ? mediaQuery.matches
            ? 'dark'
            : 'light'
          : theme

      root.classList.add(resolvedTheme)
    }

    applyTheme()

    if (theme !== 'system') {
      return undefined
    }

    mediaQuery.addEventListener('change', applyTheme)

    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme])

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        localStorage.setItem(storageKey, nextTheme)
        setThemeState(nextTheme)
      },
    }),
    [theme],
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
