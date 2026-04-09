import { useMemo } from 'react'
import { AuthenticatedLayout, type SidebarData } from '@mochi/web'
import { Package, Boxes, Plug, FolderTree } from 'lucide-react'
import { useUpdatesQuery } from '@/hooks/useApps'

export function AppsLayout() {
  const { data: updatesData } = useUpdatesQuery()

  const updateCount = updatesData?.updates?.length ?? 0

  const sidebarData: SidebarData = useMemo(() => {
    return {
      navGroups: [
        {
          title: 'Apps',
          items: [
            {
              title: 'Apps',
              url: '/',
              icon: Package,
              badge: updateCount > 0 ? String(updateCount) : undefined,
            },
            { title: 'Classes', url: '/routing/classes', icon: Boxes },
            { title: 'Services', url: '/routing/services', icon: Plug },
            { title: 'Paths', url: '/routing/paths', icon: FolderTree },
          ],
        },
      ],
    }
  }, [updateCount])

  return (
    <AuthenticatedLayout
      sidebarData={sidebarData}
      usePageHeaderForMobileNav
    />
  )
}
