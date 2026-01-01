import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  getErrorMessage,
} from '@mochi/common'
import { AlertTriangle } from 'lucide-react'
import {
  useRoutingQuery,
  useSetUserRoutingMutation,
  useSetSystemRoutingMutation,
} from '@/hooks/useApps'
import type { RoutingResource, RoutingApp } from '@/api/apps'

// Development apps have short IDs, installed apps have entity IDs (50-51 chars)
function isDevelopmentApp(id: string): boolean {
  return !/^[1-9A-HJ-NP-Za-km-z]{50,51}$/.test(id)
}

function formatAppName(app: RoutingApp): string {
  return isDevelopmentApp(app.id) ? `${app.name} (development)` : app.name
}

// Sort apps alphabetically, with development version immediately after published version of same app
function sortApps(apps: RoutingApp[]): RoutingApp[] {
  return [...apps].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name)
    if (nameCompare !== 0) {
      return nameCompare
    }
    // Same name: published first, then development
    const aIsDev = isDevelopmentApp(a.id)
    const bIsDev = isDevelopmentApp(b.id)
    return aIsDev === bIsDev ? 0 : aIsDev ? 1 : -1
  })
}

export function useRoutingData() {
  const { data, isLoading, error } = useRoutingQuery()
  const setUserRouting = useSetUserRoutingMutation()
  const setSystemRouting = useSetSystemRoutingMutation()

  const handleUserChange = (
    type: 'class' | 'service' | 'path',
    name: string,
    appId: string
  ) => {
    setUserRouting.mutate(
      { type, name, app: appId },
      {
        onSuccess: () => {
          toast.success('Preference updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  const handleSystemChange = (
    type: 'class' | 'service' | 'path',
    name: string,
    appId: string
  ) => {
    setSystemRouting.mutate(
      { type, name, app: appId },
      {
        onSuccess: () => {
          toast.success('System default updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update system default'))
        },
      }
    )
  }

  return {
    data,
    isLoading,
    error,
    handleUserChange,
    handleSystemChange,
  }
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
  onUserChange: (type: 'class' | 'service' | 'path', name: string, appId: string) => void
  onSystemChange: (type: 'class' | 'service' | 'path', name: string, appId: string) => void
}) {
  const sortedNames = Object.keys(resources).sort()

  if (sortedNames.length === 0) {
    return (
      <div className='text-muted-foreground py-8 text-center'>
        No {type === 'class' ? 'classes' : type === 'service' ? 'services' : 'paths'} configured.
      </div>
    )
  }

  return (
    <div className='rounded-lg border'>
      <table className='w-full'>
        <thead>
          <tr className='border-b bg-muted/50'>
            <th className='px-4 py-3 text-left text-sm font-medium'>
              {type === 'path' ? 'Path' : type === 'class' ? 'Class' : 'Service'}
            </th>
            <th className='px-4 py-3 text-left text-sm font-medium'>Declared by</th>
            {isAdmin && (
              <th className='px-4 py-3 text-left text-sm font-medium'>System default</th>
            )}
            <th className='px-4 py-3 text-left text-sm font-medium'>
              {isAdmin ? 'Your preference' : 'Handler'}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedNames.map((name) => {
            const resource = resources[name]
            const hasConflict = resource.apps.length > 1
            const displayName = type === 'path' ? `/${name}` : name

            // Determine effective handler
            const effectiveApp =
              resource.user ||
              resource.system ||
              (resource.apps.length > 0 ? resource.apps[0].id : '')

            return (
              <tr key={name} className='border-b last:border-b-0'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <code className='text-sm'>{displayName}</code>
                    {hasConflict && (
                      <span title='Multiple apps declare this resource'>
                        <AlertTriangle className='h-4 w-4 text-amber-500' />
                      </span>
                    )}
                  </div>
                </td>
                <td className='px-4 py-3'>
                  <span className='text-muted-foreground text-sm'>
                    {sortApps(resource.apps).map((a) => formatAppName(a)).join(', ')}
                  </span>
                </td>
                {isAdmin && (
                  <td className='px-4 py-3'>
                    <Select
                      value={resource.system || '_default'}
                      onValueChange={(value) =>
                        onSystemChange(type, name, value === '_default' ? '' : value)
                      }
                    >
                      <SelectTrigger className='w-48'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='_default'>
                          <span className='text-muted-foreground'>Default</span>
                        </SelectItem>
                        {sortApps(resource.apps).map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {formatAppName(app)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                )}
                <td className='px-4 py-3'>
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
                          {isAdmin ? 'Use system default' : 'Default'}
                          {!resource.user && effectiveApp && (
                            <span className='ml-1'>
                              ({formatAppName(resource.apps.find((a) => a.id === effectiveApp)!)})
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
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
