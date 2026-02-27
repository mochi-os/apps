export interface InstalledApp {
  id: string
  name: string
  latest: string
  fingerprint: string
  user_track?: string
  classes?: string[]
  services?: string[]
  paths?: string[]
}

export interface MarketApp {
  id: string
  language: string
  name: string
  blurb: string
  description: string
}

export interface AppInfo {
  id: string
  name: string
  description: string
  default_track: string
}

export interface Track {
  track: string
  version: string
}

export interface Permission {
  permission: string
  granted: boolean
  restricted: boolean
  admin: boolean
}

export interface AppPermissions {
  permissions: Permission[]
}
