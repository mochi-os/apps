import { LayoutGrid } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Apps',
      items: [
        {
          title: 'Browse Apps',
          url: '/',
          icon: LayoutGrid,
        },
      ],
    },
  ],
}
