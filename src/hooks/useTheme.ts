import { useEffect } from 'react'
import type { AppSettings } from '../types/models'

type ThemePreference = AppSettings['theme']

export function useTheme(theme: ThemePreference) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.dataset.themePreference = theme
      document.documentElement.style.colorScheme = resolved
      const themeColor = resolved === 'dark' ? '#0f1012' : '#f5f5f7'
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((meta) => meta.setAttribute('content', themeColor))
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
