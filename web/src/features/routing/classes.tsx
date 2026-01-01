import { Main, usePageTitle } from '@mochi/common'
import { RoutingTable, useRoutingData } from './routing-table'

export function RoutingClasses() {
  usePageTitle('Class routing')
  const { data, isLoading, error, handleUserChange, handleSystemChange } = useRoutingData()

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-muted-foreground'>Loading...</div>
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
  const isAdmin = data?.is_admin ?? false

  return (
    <Main>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-semibold'>Classes</h1>
          <p className='text-muted-foreground mt-1'>
            Configure which app handles entities of each type.
          </p>
        </div>
        <RoutingTable
          type='class'
          resources={classes}
          isAdmin={isAdmin}
          onUserChange={handleUserChange}
          onSystemChange={handleSystemChange}
        />
      </div>
    </Main>
  )
}
