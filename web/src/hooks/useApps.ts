import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import appsApi from '@/api/apps'

const appKeys = {
  all: () => ['apps'] as const,
  installed: () => ['apps', 'installed'] as const,
  market: () => ['apps', 'market'] as const,
  info: (id: string) => ['apps', 'info', id] as const,
}

export const useInstalledAppsQuery = () =>
  useQuery({
    queryKey: appKeys.installed(),
    queryFn: () => appsApi.listInstalled(),
  })

export const useMarketAppsQuery = () =>
  useQuery({
    queryKey: appKeys.market(),
    queryFn: () => appsApi.getMarket(),
    retry: false,
  })

export const useAppInfoQuery = (id: string | null) =>
  useQuery({
    queryKey: appKeys.info(id ?? ''),
    queryFn: () => appsApi.getInfo(id!),
    enabled: !!id,
  })

export const useInstallFromPublisherMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) =>
      appsApi.installFromPublisher(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.all() })
    },
  })
}

export const useInstallFromFileMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      privacy,
    }: {
      file: File
      privacy: 'public' | 'private'
    }) => appsApi.installFromFile(file, privacy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.all() })
    },
  })
}
