const endpoints = {
  auth: {
    code: '/_/code',
    verify: '/_/verify',
    identity: '/_/identity',
    logout: '/_/logout',
  },
  apps: {
    list: 'list',
    get: (id: string) => `${id}`,
    market: 'market',
    information: 'information',
    installPublisher: 'install/publisher',
    installFile: 'install/file',
    installId: 'install/id',
    updates: 'updates',
    upgrade: 'upgrade',
  },
  // Multi-version apps (0.3+)
  available: 'available',
  appVersions: 'user/preferences/app',
  versionSet: 'user/preferences/version/set',
  systemVersionSet: 'system/version/set',
} as const

export type Endpoints = typeof endpoints

export default endpoints
