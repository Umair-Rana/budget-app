import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleAndroidBackButton } from '@/lib/android-back-button'
import {
  closeTopDialog,
  getOpenDialogCount,
  registerDialogClose,
  resetDialogStackForTests,
} from '@/lib/dialog-stack'

beforeEach(() => {
  resetDialogStackForTests()
})

describe('dialog stack', () => {
  it('closes the most recently registered dialog first', () => {
    const closeFirst = vi.fn()
    const closeSecond = vi.fn()

    registerDialogClose({ id: 'first', onClose: closeFirst })
    registerDialogClose({ id: 'second', onClose: closeSecond })

    expect(getOpenDialogCount()).toBe(2)
    expect(closeTopDialog()).toBe(true)
    expect(closeSecond).toHaveBeenCalledTimes(1)
    expect(closeFirst).not.toHaveBeenCalled()
  })

  it('unregisters dialogs when they unmount', () => {
    const unregister = registerDialogClose({
      id: 'dialog',
      onClose: vi.fn(),
    })

    unregister()

    expect(getOpenDialogCount()).toBe(0)
    expect(closeTopDialog()).toBe(false)
  })
})

describe('Android back button behavior', () => {
  function createBackButtonMocks() {
    return {
      closeTopDialog: vi.fn(() => false),
      confirmExit: vi.fn(() => true),
      exitApp: vi.fn(),
      navigateBack: vi.fn(),
      navigateHome: vi.fn(),
    }
  }

  it('closes an open dialog before navigating', () => {
    const mocks = createBackButtonMocks()
    mocks.closeTopDialog.mockReturnValue(true)

    const result = handleAndroidBackButton({
      ...mocks,
      historyLength: 2,
      pathname: '/transactions',
    })

    expect(result).toBe('closed-dialog')
    expect(mocks.navigateBack).not.toHaveBeenCalled()
    expect(mocks.exitApp).not.toHaveBeenCalled()
  })

  it('navigates back on nested routes with history', () => {
    const mocks = createBackButtonMocks()

    const result = handleAndroidBackButton({
      ...mocks,
      historyLength: 2,
      pathname: '/transactions',
    })

    expect(result).toBe('navigate-back')
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1)
  })

  it('navigates home on nested routes without history', () => {
    const mocks = createBackButtonMocks()

    const result = handleAndroidBackButton({
      ...mocks,
      historyLength: 1,
      pathname: '/transactions',
    })

    expect(result).toBe('navigate-home')
    expect(mocks.navigateHome).toHaveBeenCalledTimes(1)
  })

  it('asks before exiting from overview', () => {
    const mocks = createBackButtonMocks()

    const result = handleAndroidBackButton({
      ...mocks,
      historyLength: 1,
      pathname: '/',
    })

    expect(result).toBe('exit-confirmed')
    expect(mocks.confirmExit).toHaveBeenCalledTimes(1)
    expect(mocks.exitApp).toHaveBeenCalledTimes(1)
  })
})
