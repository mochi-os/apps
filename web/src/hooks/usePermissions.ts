import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppPermissions, PermissionCatalog } from '@/api/types/apps'
import endpoints from '@/api/endpoints'
import { requestHelpers } from '@mochi/web'

export function useAppPermissions(appId: string | null) {
  return useQuery({
    queryKey: ['app-permissions', appId],
    queryFn: () =>
      requestHelpers.get<AppPermissions>(endpoints.permissions.list, {
        params: { app: appId },
      }),
    enabled: !!appId,
  })
}

// The full catalog of permissions that exist, with their translated names and
// security levels. Source of truth lives in core; the grant dialog lists the
// catalog entries not yet granted to the app.
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () =>
      requestHelpers.get<PermissionCatalog>(endpoints.permissions.catalog),
  })
}

export function useSetPermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { app: string; permission: string; enabled: boolean }) =>
      requestHelpers.post(endpoints.permissions.set, {
        app: data.app,
        permission: data.permission,
        enabled: data.enabled.toString(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-permissions', variables.app] })
    },
  })
}
