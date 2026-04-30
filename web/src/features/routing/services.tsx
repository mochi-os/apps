import { Main, PageHeader, usePageTitle, Skeleton, GeneralError } from '@mochi/web'
import { useLingui } from '@lingui/react/macro'
import { Plug } from 'lucide-react'
import { RoutingTable } from './routing-table'
import { useRoutingData } from './use-routing-data'

export function RoutingServices() {
  const { t } = useLingui()
  usePageTitle(t`Service routing`)
  const { data, isLoading, error, refetch, handleUserChange, handleSystemChange } = useRoutingData()

  const services = data?.services ?? {}
  const isAdmin = data?.is_admin ?? false

  return (
    <>
      <PageHeader
        title={t`Services`}
        icon={<Plug className='size-4 md:size-5' />}
        description={t`Configure which app handles inter-app service calls.`}
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
            type='service'
            resources={services}
            isAdmin={isAdmin}
            onUserChange={handleUserChange}
            onSystemChange={handleSystemChange}
          />
        )}
      </Main>
    </>
  )
}
