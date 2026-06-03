import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'

interface VersionPref {
  version: string
  track: string
}

interface AppVersionsResponse {
  versions: string[]
  tracks: Record<string, string>
  default_track: string
  user: VersionPref | null
  system: VersionPref | null
  is_admin: boolean
  track_warning: string
}

export function useAppVersions(appId: string | null) {
  return useQuery({
    queryKey: ['app-versions', appId],
    queryFn: () =>
      requestHelpers.get<AppVersionsResponse>(endpoints.appVersions, {
        params: { app: appId },
      }),
    enabled: !!appId,
  })
}

export function useSetUserVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { app: string; version?: string; track?: string }) =>
      requestHelpers.post(endpoints.versionSet, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', variables.app] })
      queryClient.invalidateQueries({ queryKey: ['apps'] })
    },
  })
}

export function useSetSystemVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { app: string; version?: string; track?: string }) =>
      requestHelpers.post(endpoints.systemVersionSet, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', variables.app] })
      queryClient.invalidateQueries({ queryKey: ['apps'] })
    },
  })
}
