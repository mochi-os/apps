import { Outlet } from '@tanstack/react-router'
import { cn, LayoutProvider, TopBar } from '@mochi/common'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <LayoutProvider>
      <div className="flex h-svh flex-col">
        <TopBar title="App Manager" />
        <div
          className={cn(
            '@container/content',
            'flex-1 overflow-auto'
          )}
        >
          {children ?? <Outlet />}
        </div>
      </div>
    </LayoutProvider>
  )
}
