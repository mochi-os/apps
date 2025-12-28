import { requestHelpers } from '@mochi/common'
import endpoints from '@/api/endpoints'
import type { InstalledApp, MarketApp, AppInfo, Track } from '@/api/types/apps'

const listInstalledApps = async (): Promise<{
  installed: InstalledApp[]
  development: InstalledApp[]
  can_install: boolean
}> => {
  const response = await requestHelpers.get<{
    installed: InstalledApp[]
    development: InstalledApp[]
    can_install: boolean
  }>(endpoints.apps.list)
  return response
}

const getApp = async (id: string): Promise<InstalledApp> => {
  const response = await requestHelpers.get<{ app: InstalledApp }>(
    endpoints.apps.get(id)
  )
  return response.app
}

const getMarketApps = async (): Promise<MarketApp[]> => {
  const response = await requestHelpers.get<{ apps: MarketApp[] }>(
    endpoints.apps.market
  )
  return response.apps
}

const getAppInfo = async (
  id: string,
  url?: string
): Promise<{
  app: AppInfo
  fingerprint: string
  tracks: Track[]
  peer?: string
}> => {
  const response = await requestHelpers.get<{
    app: AppInfo
    fingerprint: string
    tracks: Track[]
    peer?: string
  }>(endpoints.apps.information, { params: { id, url } })
  return response
}

const installFromPublisher = async (
  id: string,
  version: string,
  peer?: string
): Promise<{ installed: boolean; id: string; version: string }> => {
  const response = await requestHelpers.get<{
    installed: boolean
    id: string
    version: string
  }>(endpoints.apps.installPublisher, { params: { id, version, peer } })
  return response
}

const installFromFile = async (
  file: File,
  privacy: 'public' | 'private' = 'private'
): Promise<{ installed: boolean; id: string; version: string }> => {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('privacy', privacy)
  const response = await requestHelpers.post<{
    installed: boolean
    id: string
    version: string
  }>(endpoints.apps.installFile, formData)
  return response
}

const installById = async (
  id: string
): Promise<{
  installed: boolean
  id: string
  version: string
  name: string
}> => {
  const response = await requestHelpers.get<{
    installed: boolean
    id: string
    version: string
    name: string
  }>(endpoints.apps.installId, { params: { id } })
  return response
}

const getUpdates = async (): Promise<{
  updates: {
    id: string
    name: string
    current: string
    available: string
    publisher: string
  }[]
}> => {
  const response = await requestHelpers.get<{
    updates: {
      id: string
      name: string
      current: string
      available: string
      publisher: string
    }[]
  }>(endpoints.apps.updates)
  return response
}

const upgrade = async (
  id: string,
  version: string
): Promise<{ upgraded: boolean; id: string; version: string }> => {
  const response = await requestHelpers.get<{
    upgraded: boolean
    id: string
    version: string
  }>(endpoints.apps.upgrade, { params: { id, version } })
  return response
}

const appsApi = {
  listInstalled: listInstalledApps,
  get: getApp,
  getMarket: getMarketApps,
  getInfo: getAppInfo,
  installFromPublisher,
  installFromFile,
  installById,
  getUpdates,
  upgrade,
}

export default appsApi
