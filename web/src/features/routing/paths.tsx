import { Main, PageHeader, usePageTitle, Skeleton, GeneralError } from '@mochi/web'
import { useLingui } from '@lingui/react/macro'
import { FolderTree } from 'lucide-react'
import { RoutingTable } from './routing-table'
import { useRoutingData } from './use-routing-data'

export function RoutingPaths() {
  const { t } = useLingui()
  usePageTitle(t`Path routing`)
  const { data, isLoading, error, refetch, handleUserChange, handleSystemChange } = useRoutingData()

  const paths = data?.paths ?? {}
  const isAdmin = data?.is_admin ?? false

  return (
    <>
      <PageHeader
        title={t`Paths`}
        icon={<FolderTree className='size-4 md:size-5' />}
        description={t`Configure which app handles each URL path.`}
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
            type='path'
            resources={paths}
            isAdmin={isAdmin}
            onUserChange={handleUserChange}
            onSystemChange={handleSystemChange}
          />
        )}
      </Main>
    </>
  )
}
