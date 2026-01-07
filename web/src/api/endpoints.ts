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
    updates: '/apps/-/updates',
    upgrade: '/apps/-/upgrade',
  },
  // Multi-version apps (0.3+)
  available: '/apps/-/available',
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
    grant: '/apps/-/permissions/grant',
    revoke: '/apps/-/permissions/revoke',
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints
