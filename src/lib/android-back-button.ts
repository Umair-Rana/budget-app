export type AndroidBackButtonResult =
  | 'closed-dialog'
  | 'exit-cancelled'
  | 'exit-confirmed'
  | 'navigate-back'
  | 'navigate-home'

export interface HandleAndroidBackButtonInput {
  closeTopDialog: () => boolean
  confirmExit: () => boolean
  exitApp: () => void
  historyLength: number
  navigateBack: () => void
  navigateHome: () => void
  pathname: string
}

export function handleAndroidBackButton({
  closeTopDialog,
  confirmExit,
  exitApp,
  historyLength,
  navigateBack,
  navigateHome,
  pathname,
}: HandleAndroidBackButtonInput): AndroidBackButtonResult {
  if (closeTopDialog()) {
    return 'closed-dialog'
  }

  if (pathname !== '/') {
    if (historyLength > 1) {
      navigateBack()
      return 'navigate-back'
    }

    navigateHome()
    return 'navigate-home'
  }

  if (!confirmExit()) {
    return 'exit-cancelled'
  }

  exitApp()
  return 'exit-confirmed'
}
