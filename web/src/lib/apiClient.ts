import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie, removeCookie } from '@/lib/cookies'

export const apiClient = axios.create({
  baseURL: '/',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const storeToken = useAuthStore.getState().token
    const cookieToken = getCookie('token')
    const token = storeToken || cookieToken

    config.headers = config.headers ?? {}
    if (token) {
      ;(config.headers as Record<string, string>).Authorization = token.startsWith(
        'Bearer '
      )
        ? token
        : `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    const responseData = response.data as unknown
    if (
      responseData &&
      typeof responseData === 'object' &&
      'error' in responseData &&
      'status' in responseData
    ) {
      const errorData = responseData as { error?: string; status?: number }
      if (errorData.error && errorData.status && errorData.status >= 400) {
        toast.error(errorData.error || 'An error occurred')
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const status = error.response?.status

    switch (status) {
      case 401: {
        if (import.meta.env.PROD) {
          const isAuthEndpoint =
            error.config?.url?.includes('/login') ||
            error.config?.url?.includes('/auth')

          if (!isAuthEndpoint) {
            removeCookie('token')
            useAuthStore.getState().clearAuth()

            toast.error('Session expired', {
              description: 'Please log in again to continue.',
            })

            const currentUrl = window.location.href
            window.location.href = `${import.meta.env.VITE_AUTH_LOGIN_URL}?redirect=${encodeURIComponent(currentUrl)}`
          }
        }
        break
      }

      case 403: {
        toast.error('Access denied', {
          description: "You don't have permission to perform this action.",
        })
        break
      }

      case 500:
      case 502:
      case 503: {
        toast.error('Server error', {
          description: 'Something went wrong. Please try again later.',
        })
        break
      }

      default: {
        if (!error.response) {
          toast.error('Network error', {
            description: 'Please check your internet connection.',
          })
        }
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
