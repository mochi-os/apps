// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

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
  name: string
  granted: boolean
  restricted: boolean
  admin: boolean
}

export interface AppPermissions {
  permissions: Permission[]
}

// One entry of the full permission catalog returned by /apps/-/permissions/catalog.
// The catalog is the source of truth for which permissions exist, their
// translated names, and their security levels.
export interface PermissionCatalogEntry {
  permission: string
  name: string
  restricted: boolean
  admin: boolean
}

export interface PermissionCatalog {
  permissions: PermissionCatalogEntry[]
}
