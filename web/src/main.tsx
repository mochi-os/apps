import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { createQueryClient, ThemeProvider, useAuthStore, isInShell, getRouterBasepath } from '@mochi/common'
import { routeTree } from './routeTree.gen'
import './styles/index.css'

const queryClient = createQueryClient()

// Initialize auth state from cookie on app start
// In shell mode, auth is initialized asynchronously via postMessage in _authenticated/route.tsx
if (!isInShell()) {
  useAuthStore.getState().initialize()
}


const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: getRouterBasepath(),
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
