import { useEffect, useState } from 'react'

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

function shouldSuggestInstall(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as NavigatorWithStandalone).standalone)
  return isAppleMobile && isSafari && !isStandalone
}

export function useInstallHint(dismissed: boolean | undefined) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!dismissed && shouldSuggestInstall())
  }, [dismissed])

  return { visible, hide: () => setVisible(false) }
}

