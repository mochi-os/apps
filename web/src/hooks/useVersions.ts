import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@mochi/common'
import endpoints from '@/api/endpoints'

interface AvailableResponse {
  available: boolean
  version: string
}

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
}

export function useMultiVersionAvailable() {
  return useQuery({
    queryKey: ['multiversion-available'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: AvailableResponse }>(endpoints.available)
      return response.data.data
    },
    staleTime: Infinity,
  })
}

export function useAppVersions(appId: string | null) {
  return useQuery({
    queryKey: ['app-versions', appId],
    queryFn: async () => {
      console.log('useAppVersions: fetching for appId', appId)
      const response = await apiClient.get<{ data: AppVersionsResponse }>(
        endpoints.appVersions,
        { params: { app: appId } }
      )
      console.log('useAppVersions: got response', response.data)
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
