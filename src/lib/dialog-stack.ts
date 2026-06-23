type DialogStackEntry = {
  id: string
  onClose: () => void
}

const dialogStack: DialogStackEntry[] = []

export function registerDialogClose(entry: DialogStackEntry) {
  dialogStack.push(entry)

  return () => {
    const index = dialogStack.findIndex((item) => item.id === entry.id)

    if (index >= 0) {
      dialogStack.splice(index, 1)
    }
  }
}

export function closeTopDialog() {
  const entry = dialogStack.at(-1)

  if (!entry) {
    return false
  }

  entry.onClose()
  return true
}

export function getOpenDialogCount() {
  return dialogStack.length
}

export function resetDialogStackForTests() {
  dialogStack.splice(0, dialogStack.length)
}
