import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@mochi/web'
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
    queryFn: async () => {
      const response = await apiClient.get<{ data: AppVersionsResponse }>(
        endpoints.appVersions,
        { params: { app: appId } }
      )
      return response.data.data
    },
    enabled: !!appId,
  })
}

export function useSetUserVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; version?: string; track?: string }) => {
      const response = await apiClient.post(endpoints.versionSet, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', variables.app] })
      queryClient.invalidateQueries({ queryKey: ['apps', 'installed'] })
    },
  })
}

export function useSetSystemVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; version?: string; track?: string }) => {
      const response = await apiClient.post(endpoints.systemVersionSet, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', variables.app] })
      queryClient.invalidateQueries({ queryKey: ['apps', 'installed'] })
    },
  })
}
