import { Main, PageHeader, usePageTitle, Skeleton, GeneralError } from '@mochi/web'
import { Boxes } from 'lucide-react'
import { RoutingTable } from './routing-table'
import { useRoutingData } from './use-routing-data'

export function RoutingClasses() {
  usePageTitle('Class routing')
  const { data, isLoading, error, refetch, handleUserChange, handleSystemChange } = useRoutingData()

  const classes = data?.classes ?? {}
  const isAdmin = data?.is_admin ?? false

  return (
    <>
      <PageHeader
        title='Classes'
        icon={<Boxes className='size-4 md:size-5' />}
        description='Configure which app handles entities of each type.'
      />
      <Main>
        {isLoading ? (
          <div className='space-y-2'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : (
          <RoutingTable
            type='class'
            resources={classes}
            isAdmin={isAdmin}
            onUserChange={handleUserChange}
            onSystemChange={handleSystemChange}
          />
        )}
      </Main>
    </>
  )
}
