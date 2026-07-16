// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'
import { AuthenticatedLayout, type SidebarData } from '@mochi/web'
import { Package, Boxes, Plug, FolderTree } from 'lucide-react'
import { useUpdatesQuery } from '@/hooks/useApps'

export function AppsLayout() {
  const { t } = useLingui()
  const { data: updatesData } = useUpdatesQuery()

  const updateCount = updatesData?.updates?.length ?? 0

  const sidebarData: SidebarData = useMemo(() => {
    return {
      navGroups: [
        {
          title: t`Apps`,
          items: [
            {
              title: t`Apps`,
              url: '/',
              icon: Package,
              badge: updateCount > 0 ? String(updateCount) : undefined,
            },
            { title: t`Classes`, url: '/routing/classes', icon: Boxes },
            { title: t`Services`, url: '/routing/services', icon: Plug },
            { title: t`Paths`, url: '/routing/paths', icon: FolderTree },
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
