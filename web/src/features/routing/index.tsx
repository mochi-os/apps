import {
  Main,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  usePageTitle,
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

export function Routing() {
  usePageTitle('App Routing')
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

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-muted-foreground'>Loading routing configuration...</div>
        </div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-red-500'>Error: {String(error)}</div>
        </div>
      </Main>
    )
  }

  const classes = data?.classes ?? {}
  const services = data?.services ?? {}
  const paths = data?.paths ?? {}
  const isAdmin = data?.is_admin ?? false

  const hasData =
    Object.keys(classes).length > 0 ||
    Object.keys(services).length > 0 ||
    Object.keys(paths).length > 0

  return (
    <Main>
      <div className='space-y-8'>
        <div>
          <h1 className='text-2xl font-semibold'>App routing</h1>
          <p className='text-muted-foreground mt-1'>
            Configure which app handles each class, service, and path.
          </p>
        </div>

        {!hasData ? (
          <div className='text-muted-foreground py-8 text-center'>
            No routing configuration available.
          </div>
        ) : (
          <>
            {Object.keys(classes).length > 0 && (
              <RoutingSection
                title='Classes'
                description='Which app handles entities of each type'
                type='class'
                resources={classes}
                isAdmin={isAdmin}
                onUserChange={handleUserChange}
                onSystemChange={handleSystemChange}
              />
            )}

            {Object.keys(services).length > 0 && (
              <RoutingSection
                title='Services'
                description='Which app handles inter-app service calls'
                type='service'
                resources={services}
                isAdmin={isAdmin}
                onUserChange={handleUserChange}
                onSystemChange={handleSystemChange}
              />
            )}

            {Object.keys(paths).length > 0 && (
              <RoutingSection
                title='Paths'
                description='Which app handles each URL path'
                type='path'
                resources={paths}
                isAdmin={isAdmin}
                onUserChange={handleUserChange}
                onSystemChange={handleSystemChange}
              />
            )}
          </>
        )}
      </div>
    </Main>
  )
}

function RoutingSection({
  title,
  description,
  type,
  resources,
  isAdmin,
  onUserChange,
  onSystemChange,
}: {
  title: string
  description: string
  type: 'class' | 'service' | 'path'
  resources: Record<string, RoutingResource>
  isAdmin: boolean
  onUserChange: (type: 'class' | 'service' | 'path', name: string, appId: string) => void
  onSystemChange: (type: 'class' | 'service' | 'path', name: string, appId: string) => void
}) {
  const sortedNames = Object.keys(resources).sort()

  return (
    <section>
      <h2 className='text-lg font-medium'>{title}</h2>
      <p className='text-muted-foreground mb-4 text-sm'>{description}</p>
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
                      {resource.apps.map((a) => formatAppName(a)).join(', ')}
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
                          {resource.apps.map((app) => (
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
                        {resource.apps.map((app) => (
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
    </section>
  )
}
