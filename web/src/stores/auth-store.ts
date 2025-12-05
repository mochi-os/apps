import { create } from 'zustand'
import { getCookie, removeCookie } from '@/lib/cookies'

const TOKEN_COOKIE = 'token'

interface AuthState {
  token: string
  isLoading: boolean
  isInitialized: boolean
  isAuthenticated: boolean

  setLoading: (isLoading: boolean) => void
  syncFromCookie: () => void
  clearAuth: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const initialToken = getCookie(TOKEN_COOKIE) || ''

  return {
    token: initialToken,
    isLoading: false,
    isInitialized: false,
    isAuthenticated: Boolean(initialToken),

    setLoading: (isLoading) => {
      set({ isLoading })
    },

    syncFromCookie: () => {
      const cookieToken = getCookie(TOKEN_COOKIE) || ''
      const storeToken = get().token

      if (cookieToken !== storeToken) {
        set({
          token: cookieToken,
          isAuthenticated: Boolean(cookieToken),
          isInitialized: true,
        })
      } else {
        set({ isInitialized: true })
      }
    },

    clearAuth: () => {
      removeCookie(TOKEN_COOKIE)

      set({
        token: '',
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      })
    },

    initialize: () => {
      get().syncFromCookie()
    },
  }
})
