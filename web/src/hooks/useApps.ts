import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import appsApi from '@/api/apps'

const appKeys = {
  all: () => ['apps'] as const,
  installed: () => ['apps', 'installed'] as const,
  market: () => ['apps', 'market'] as const,
  info: (id: string) => ['apps', 'info', id] as const,
  updates: () => ['apps', 'updates'] as const,
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

export const useAppInfoQuery = (id: string | null, url?: string) =>
  useQuery({
    queryKey: appKeys.info(id ?? ''),
    queryFn: () => appsApi.getInfo(id!, url),
    enabled: !!id,
  })

export const useUpdatesQuery = () =>
  useQuery({
    queryKey: appKeys.updates(),
    queryFn: () => appsApi.getUpdates(),
    retry: false,
  })

export const useInstallFromPublisherMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      version,
      peer,
    }: {
      id: string
      version: string
      peer?: string
    }) => appsApi.installFromPublisher(id, version, peer),
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

export const useInstallByIdMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => appsApi.installById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.all() })
    },
  })
}

export const useUpgradeMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) =>
      appsApi.upgrade(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.all() })
    },
  })
}

export const useCleanupMutation = () => {
  return useMutation({
    mutationFn: () => appsApi.cleanup(),
  })
}
