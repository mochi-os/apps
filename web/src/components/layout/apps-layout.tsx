import { useMemo } from 'react'
import { AuthenticatedLayout } from '@mochi/common'
import type { SidebarData } from '@mochi/common'
import { Package, Boxes, Plug, FolderTree } from 'lucide-react'

export function AppsLayout() {
  const sidebarData: SidebarData = useMemo(() => {
    return {
      navGroups: [
        {
          title: '',
          items: [
            { title: 'Apps', url: '/', icon: Package },
            { title: 'Classes', url: '/routing/classes', icon: Boxes },
            { title: 'Services', url: '/routing/services', icon: Plug },
            { title: 'Paths', url: '/routing/paths', icon: FolderTree },
          ],
        },
      ],
    }
  }, [])

  return <AuthenticatedLayout sidebarData={sidebarData} />
}
