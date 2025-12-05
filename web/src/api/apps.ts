import endpoints from '@/api/endpoints'
import type {
  InstalledAppsResponse,
  InstalledAppResponse,
  MarketAppsResponse,
  AppInfoResponse,
  InstallResponse,
  InstalledApp,
  MarketApp,
  AppInfo,
  Track,
} from '@/api/types/apps'
import { requestHelpers } from '@/lib/request'

const listInstalledApps = async (): Promise<InstalledApp[]> => {
  const response = await requestHelpers.get<InstalledAppsResponse>(
    endpoints.apps.list
  )
  return response.data.apps
}

const getApp = async (id: string): Promise<InstalledApp> => {
  const response = await requestHelpers.get<InstalledAppResponse>(
    endpoints.apps.get(id)
  )
  return response.data.app
}

const getMarketApps = async (): Promise<MarketApp[]> => {
  const response = await requestHelpers.get<MarketAppsResponse>(
    endpoints.apps.market
  )
  return response.data.apps
}

const getAppInfo = async (
  id: string
): Promise<{ app: AppInfo; fingerprint: string; tracks: Track[] }> => {
  const response = await requestHelpers.get<AppInfoResponse>(
    endpoints.apps.information,
    { params: { id } }
  )
  return response.data
}

const installApp = async (
  id: string,
  version: string
): Promise<{ installed: boolean; id: string; version: string }> => {
  const response = await requestHelpers.get<InstallResponse>(
    endpoints.apps.install,
    { params: { id, version } }
  )
  return response.data
}

export const appsApi = {
  listInstalled: listInstalledApps,
  get: getApp,
  getMarket: getMarketApps,
  getInfo: getAppInfo,
  install: installApp,
}

export default appsApi
