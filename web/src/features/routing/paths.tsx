import { Main, usePageTitle, Skeleton, GeneralError } from '@mochi/common'
import { RoutingTable, useRoutingData } from './routing-table'

export function RoutingPaths() {
  usePageTitle('Path routing')
  const { data, isLoading, error, handleUserChange, handleSystemChange } = useRoutingData()

  if (isLoading) {
    return (
      <Main>
        <div className='space-y-6'>
          <div>
            <Skeleton className='h-8 w-48' />
            <Skeleton className='mt-1 h-4 w-96' />
          </div>
          <div className='space-y-2'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        </div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <GeneralError error={error} minimal />
      </Main>
    )
  }

  const paths = data?.paths ?? {}
  const isAdmin = data?.is_admin ?? false

  return (
    <Main>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-semibold'>Paths</h1>
          <p className='text-muted-foreground mt-1'>
            Configure which app handles each URL path.
          </p>
        </div>
        <RoutingTable
          type='path'
          resources={paths}
          isAdmin={isAdmin}
          onUserChange={handleUserChange}
          onSystemChange={handleSystemChange}
        />
      </div>
    </Main>
  )
}
