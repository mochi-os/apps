// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Paths are RELATIVE so they compose with the basepath api-client computes
// from the current location. An absolute path (a leading slash) deliberately
// bypasses that basepath - see api-client.ts - so the previous "/apps/-/..."
// form addressed a fixed location and broke under alternate path routing or
// domain-entity routing. The /_/ entries below are the exception and stay
// absolute: those are core cross-cutting routes, not this app's.
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
    directorySearch: 'directory/search',
    updates: 'updates',
    upgrade: 'upgrade',
  },
  // Multi-version apps (0.3+)
  appVersions: 'user/preferences/app',
  versionSet: 'user/preferences/version/set',
  systemVersionSet: 'system/version/set',
  cleanup: 'system/cleanup',
  // Routing
  routing: 'routing/data',
  routingSet: 'user/preferences/routing/set',
  systemRoutingSet: 'system/routing/set',
  // Permissions
  permissions: {
    list: 'permissions/list',
    catalog: 'permissions/catalog',
    revoke: 'permissions/revoke',
    set: 'permissions/set',
  },
} as const

export default endpoints
