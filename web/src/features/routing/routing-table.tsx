// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  naturalCompare,
} from '@mochi/web'
import { AlertTriangle } from 'lucide-react'
import type { RoutingResource, RoutingApp } from '@/api/apps'

function formatAppName(app: RoutingApp): string {
  return app.development ? t`${app.name} (development)` : app.name
}

// Sort apps alphabetically, with development version immediately after published version of same app
function sortApps(apps: RoutingApp[]): RoutingApp[] {
  return [...apps].sort((a, b) => {
    const nameCompare = naturalCompare(a.name, b.name)
    if (nameCompare !== 0) {
      return nameCompare
    }
    // Same name: published first, then development
    const aIsDev = a.development
    const bIsDev = b.development
    return aIsDev === bIsDev ? 0 : aIsDev ? 1 : -1
  })
}

export function RoutingTable({
  type,
  resources,
  isAdmin,
  onUserChange,
  onSystemChange,
}: {
  type: 'class' | 'service' | 'path'
  resources: Record<string, RoutingResource>
  isAdmin: boolean
  onUserChange: (
    type: 'class' | 'service' | 'path',
    name: string,
    appId: string
  ) => void
  onSystemChange: (
    type: 'class' | 'service' | 'path',
    name: string,
    appId: string
  ) => void
}) {
  const sortedNames = Object.keys(resources).sort()

  if (sortedNames.length === 0) {
    return (
      <div className='text-muted-foreground py-8 text-center'>
        {type === 'class' ? (
          <Trans>No classes configured.</Trans>
        ) : type === 'service' ? (
          <Trans>No services configured.</Trans>
        ) : (
          <Trans>No paths configured.</Trans>
        )}
      </div>
    )
  }

  return (
    <Table stickyFirstColumn>
      <TableHeader>
        <TableRow>
          <TableHead>
            {type === 'path' ? (
              <Trans>Path</Trans>
            ) : type === 'class' ? (
              <Trans>Class</Trans>
            ) : (
              <Trans>Service</Trans>
            )}
          </TableHead>
          <TableHead>
            <Trans>Declared by</Trans>
          </TableHead>
          {isAdmin && (
            <TableHead>
              <Trans>System default</Trans>
            </TableHead>
          )}
          <TableHead>
            {isAdmin ? <Trans>Your preference</Trans> : <Trans>Handler</Trans>}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedNames.map((name) => {
          const resource = resources[name]
          const hasConflict = resource.apps.length > 1
          const displayName = type === 'path' ? `/${name}` : name

          // Determine effective handler
          const effectiveApp =
            resource.user ||
            resource.system ||
            (resource.apps.length > 0 ? resource.apps[0].id : '')
          // May be undefined: a stale binding can point at an app that no
          // longer declares this resource.
          const effectiveAppInfo = resource.apps.find(
            (a) => a.id === effectiveApp
          )

          return (
            <TableRow key={name}>
              <TableCell>
                <div className='flex items-center gap-2'>
                  <code className='text-sm'>{displayName}</code>
                  {hasConflict && (
                    <span title={t`Multiple apps declare this resource`}>
                      <AlertTriangle className='h-4 w-4 text-amber-500' />
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className='text-muted-foreground text-sm'>
                  {sortApps(resource.apps)
                    .map((a) => formatAppName(a))
                    .join(', ')}
                </span>
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <Select
                    value={resource.system || '_default'}
                    onValueChange={(value) =>
                      onSystemChange(
                        type,
                        name,
                        value === '_default' ? '' : value
                      )
                    }
                  >
                    <SelectTrigger className='w-48'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='_default'>
                        <span className='text-muted-foreground'>
                          <Trans>Default</Trans>
                        </span>
                      </SelectItem>
                      {sortApps(resource.apps).map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {formatAppName(app)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              <TableCell>
                <Select
                  value={resource.user || '_default'}
                  onValueChange={(value) =>
                    onUserChange(type, name, value === '_default' ? '' : value)
                  }
                >
                  <SelectTrigger className='w-48'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='_default'>
                      <span className='text-muted-foreground'>
                        {isAdmin ? (
                          <Trans>Use system default</Trans>
                        ) : (
                          <Trans>Default</Trans>
                        )}
                        {!resource.user && effectiveAppInfo && (
                          <span className='ms-1'>
                            ({formatAppName(effectiveAppInfo)})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                    {sortApps(resource.apps).map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {formatAppName(app)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
