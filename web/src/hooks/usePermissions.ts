import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppPermissions, PermissionCatalog } from '@/api/types/apps'
import endpoints from '@/api/endpoints'
import { apiClient } from '@mochi/web'

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

// The full catalog of permissions that exist, with their translated names and
// security levels. Source of truth lives in core; the grant dialog lists the
// catalog entries not yet granted to the app.
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: async () => {
      const response = await apiClient.get<PermissionCatalog>(
        endpoints.permissions.catalog
      )
      return response.data
    },
  })
}

export function useGrantPermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; permission: string }) => {
      const response = await apiClient.post(endpoints.permissions.grant, data)
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
      const response = await apiClient.post(endpoints.permissions.set, {
        app: data.app,
        permission: data.permission,
        enabled: data.enabled.toString(),
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-permissions', variables.app] })
    },
  })
}
