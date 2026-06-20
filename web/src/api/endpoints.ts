// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

const endpoints = {
  auth: {
    code: '/_/code',
    verify: '/_/verify',
    identity: '/_/identity',
    logout: '/_/logout',
  },
  apps: {
    list: '/apps/-/list',
    get: (id: string) => `/apps/-/${id}`,
    market: '/apps/-/market',
    information: '/apps/-/information',
    installPublisher: '/apps/-/install/publisher',
    installFile: '/apps/-/install/file',
    installId: '/apps/-/install/id',
    directorySearch: '/apps/-/directory/search',
    updates: '/apps/-/updates',
    upgrade: '/apps/-/upgrade',
  },
  // Multi-version apps (0.3+)
  appVersions: '/apps/-/user/preferences/app',
  versionSet: '/apps/-/user/preferences/version/set',
  systemVersionSet: '/apps/-/system/version/set',
  cleanup: '/apps/-/system/cleanup',
  // Routing
  routing: '/apps/-/routing/data',
  routingSet: '/apps/-/user/preferences/routing/set',
  systemRoutingSet: '/apps/-/system/routing/set',
  // Permissions
  permissions: {
    list: '/apps/-/permissions/list',
    catalog: '/apps/-/permissions/catalog',
    revoke: '/apps/-/permissions/revoke',
    set: '/apps/-/permissions/set',
  },
} as const

export default endpoints
