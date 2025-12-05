import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import appsApi from '@/api/apps'

export const appKeys = {
  all: () => ['apps'] as const,
  installed: () => ['apps', 'installed'] as const,
  detail: (id: string) => ['apps', 'detail', id] as const,
  market: () => ['apps', 'market'] as const,
  info: (id: string) => ['apps', 'info', id] as const,
}

export const useInstalledAppsQuery = () =>
  useQuery({
    queryKey: appKeys.installed(),
    queryFn: () => appsApi.listInstalled(),
  })

export const useAppQuery = (id: string) =>
  useQuery({
    queryKey: appKeys.detail(id),
    queryFn: () => appsApi.get(id),
    enabled: !!id,
  })

export const useMarketAppsQuery = () =>
  useQuery({
    queryKey: appKeys.market(),
    queryFn: () => appsApi.getMarket(),
  })

export const useAppInfoQuery = (id: string | null) =>
  useQuery({
    queryKey: appKeys.info(id ?? ''),
    queryFn: () => appsApi.getInfo(id!),
    enabled: !!id,
  })

export const useInstallAppMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) =>
      appsApi.install(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.all() })
    },
  })
}
