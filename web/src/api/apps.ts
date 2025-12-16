import { requestHelpers } from '@mochi/common'
import endpoints from '@/api/endpoints'
import type { InstalledApp, MarketApp, AppInfo, Track } from '@/api/types/apps'

const listInstalledApps = async (): Promise<{
  installed: InstalledApp[]
  development: InstalledApp[]
}> => {
  const response = await requestHelpers.get<{
    installed: InstalledApp[]
    development: InstalledApp[]
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
  id: string
): Promise<{ app: AppInfo; fingerprint: string; tracks: Track[] }> => {
  const response = await requestHelpers.get<{
    app: AppInfo
    fingerprint: string
    tracks: Track[]
  }>(endpoints.apps.information, { params: { id } })
  return response
}

const installApp = async (
  id: string,
  version: string
): Promise<{ installed: boolean; id: string; version: string }> => {
  const response = await requestHelpers.get<{
    installed: boolean
    id: string
    version: string
  }>(endpoints.apps.install, { params: { id, version } })
  return response
}

const appsApi = {
  listInstalled: listInstalledApps,
  get: getApp,
  getMarket: getMarketApps,
  getInfo: getAppInfo,
  install: installApp,
}

export default appsApi
