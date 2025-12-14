const endpoints = {
  auth: {
    code: '_/code',
    verify: '_/verify',
    identity: '_/identity',
    logout: '_/logout',
  },
  apps: {
    list: 'list',
    get: (id: string) => `${id}`,
    market: 'market',
    information: 'information',
    install: 'install',
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints
