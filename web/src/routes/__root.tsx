import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { NavigationProgress } from '@mochi/common'

export const Route = createRootRoute({
  component: () => (
    <>
      <NavigationProgress />
      <Outlet />
      <Toaster duration={5000} />
    </>
  ),
})
