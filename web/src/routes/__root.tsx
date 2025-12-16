import { createRootRoute, Outlet } from '@tanstack/react-router'
import { NavigationProgress } from '@mochi/common'
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: () => (
    <>
      <NavigationProgress />
      <Outlet />
      <Toaster duration={5000} />
    </>
  ),
})
