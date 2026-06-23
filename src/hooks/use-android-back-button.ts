import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { handleAndroidBackButton } from '@/lib/android-back-button'
import { closeTopDialog } from '@/lib/dialog-stack'

export function useAndroidBackButton() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined
    }

    let active = true
    let removeListener: (() => void) | undefined

    void CapacitorApp.addListener('backButton', () => {
      handleAndroidBackButton({
        closeTopDialog,
        confirmExit: () => window.confirm('Exit Baldi Budget?'),
        exitApp: () => void CapacitorApp.exitApp(),
        historyLength: window.history.length,
        navigateBack: () => navigate(-1),
        navigateHome: () => navigate('/', { replace: true }),
        pathname: location.pathname,
      })
    }).then((handle) => {
      if (!active) {
        void handle.remove()
        return
      }

      removeListener = () => {
        void handle.remove()
      }
    })

    return () => {
      active = false
      removeListener?.()
    }
  }, [location.pathname, navigate])
}
