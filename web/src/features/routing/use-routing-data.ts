// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { getErrorMessage, toastAction } from '@mochi/web'
import { useLingui } from '@lingui/react/macro'
import {
  useRoutingQuery,
  useSetUserRoutingMutation,
  useSetSystemRoutingMutation,
} from '@/hooks/useApps'

type RoutingType = 'class' | 'service' | 'path'

export function useRoutingData() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useRoutingQuery()
  const setUserRouting = useSetUserRoutingMutation()
  const setSystemRouting = useSetSystemRoutingMutation()

  const handleUserChange = async (
    type: RoutingType,
    name: string,
    appId: string
  ) => {
    try {
      await toastAction(
        setUserRouting.mutateAsync({ type, name, app: appId }),
        {
          loading: t`Saving...`,
          success: t`Preference updated`,
          error: (err) => getErrorMessage(err, t`Failed to update preference`),
        }
      )
    } catch {
      // toastAction already showed error
    }
  }

  const handleSystemChange = async (
    type: RoutingType,
    name: string,
    appId: string
  ) => {
    try {
      await toastAction(
        setSystemRouting.mutateAsync({ type, name, app: appId }),
        {
          loading: t`Saving...`,
          success: t`System default updated`,
          error: (err) =>
            getErrorMessage(err, t`Failed to update system default`),
        }
      )
    } catch {
      // toastAction already showed error
    }
  }

  return {
    data,
    isLoading,
    error,
    refetch,
    handleUserChange,
    handleSystemChange,
  }
}
