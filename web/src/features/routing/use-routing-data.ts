// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { toast, getErrorMessage } from '@mochi/web'
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

  const handleUserChange = (type: RoutingType, name: string, appId: string) => {
    setUserRouting.mutate(
      { type, name, app: appId },
      {
        onSuccess: () => {
          toast.success(t`Preference updated`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update preference`))
        },
      }
    )
  }

  const handleSystemChange = (type: RoutingType, name: string, appId: string) => {
    setSystemRouting.mutate(
      { type, name, app: appId },
      {
        onSuccess: () => {
          toast.success(t`System default updated`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update system default`))
        },
      }
    )
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
