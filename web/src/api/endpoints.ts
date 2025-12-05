const endpoints = {
  apps: {
    list: '/apps/list',
    get: (id: string) => `/apps/${id}`,
    market: '/apps/market',
    information: '/apps/information',
    install: '/apps/install',
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints
