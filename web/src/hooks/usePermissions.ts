import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppPermissions } from '@/api/types/apps'
import endpoints from '@/api/endpoints'
import { apiClient } from '@mochi/common'

const NO_GLOBAL_ERROR_TOAST_CONFIG = {
  mochi: { showGlobalErrorToast: false },
} as const

export function useAppPermissions(appId: string | null) {
  return useQuery({
    queryKey: ['app-permissions', appId],
    queryFn: async () => {
      const response = await apiClient.get<AppPermissions>(
        endpoints.permissions.list,
        { params: { app: appId } }
      )
      return response.data
    },
    enabled: !!appId,
  })
}

export function useGrantPermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; permission: string }) => {
      const response = await apiClient.post(
        endpoints.permissions.grant,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-permissions', variables.app] })
    },
  })
}

export function useRevokePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; permission: string }) => {
      const response = await apiClient.post(
        endpoints.permissions.revoke,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-permissions', variables.app] })
    },
  })
}

export function useSetPermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; permission: string; enabled: boolean }) => {
      const response = await apiClient.post(
        endpoints.permissions.set,
        {
          app: data.app,
          permission: data.permission,
          enabled: data.enabled.toString(),
        },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-permissions', variables.app] })
    },
  })
}
