// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Paths are RELATIVE and keep the "-/" separator, and both halves matter.
// api-client composes them onto the basepath it computes from the location,
// which a leading slash bypasses; getApiBasepath() returns `/<app>/` without
// the separator, so "list" resolves to /apps/list - not an action, and the SPA
// catch-all answers 200 with HTML. The /_/ entries below stay absolute: those
// are core routes, not this app's.
const endpoints = {
  auth: {
    code: '/_/code',
    verify: '/_/verify',
    identity: '/_/identity',
    logout: '/_/logout',
  },
  apps: {
    list: '-/list',
    get: (id: string) => `-/${id}`,
    market: '-/market',
    information: '-/information',
    installPublisher: '-/install/publisher',
    installFile: '-/install/file',
    installId: '-/install/id',
    directorySearch: '-/directory/search',
    updates: '-/updates',
    upgrade: '-/upgrade',
  },
  // Multi-version apps (0.3+)
  appVersions: '-/user/preferences/app',
  versionSet: '-/user/preferences/version/set',
  systemVersionSet: '-/system/version/set',
  cleanup: '-/system/cleanup',
  // Routing
  routing: '-/routing/data',
  routingSet: '-/user/preferences/routing/set',
  systemRoutingSet: '-/system/routing/set',
  // Permissions
  permissions: {
    list: '-/permissions/list',
    catalog: '-/permissions/catalog',
    revoke: '-/permissions/revoke',
    set: '-/permissions/set',
  },
} as const

export default endpoints
