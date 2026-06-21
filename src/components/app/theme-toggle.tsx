import { Laptop, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/providers/theme-context'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Laptop

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Change theme"
          aria-haspopup="menu"
          title="Change theme"
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuItem
          aria-label={`Light theme${theme === 'light' ? ' selected' : ''}`}
          onClick={() => setTheme('light')}
        >
          <Sun className="size-4" aria-hidden="true" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          aria-label={`Dark theme${theme === 'dark' ? ' selected' : ''}`}
          onClick={() => setTheme('dark')}
        >
          <Moon className="size-4" aria-hidden="true" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          aria-label={`System theme${theme === 'system' ? ' selected' : ''}`}
          onClick={() => setTheme('system')}
        >
          <Laptop className="size-4" aria-hidden="true" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
