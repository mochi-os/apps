import { toast, getErrorMessage } from '@mochi/common'
import {
  useRoutingQuery,
  useSetUserRoutingMutation,
  useSetSystemRoutingMutation,
} from '@/hooks/useApps'

type RoutingType = 'class' | 'service' | 'path'

export function useRoutingData() {
  const { data, isLoading, error } = useRoutingQuery()
  const setUserRouting = useSetUserRoutingMutation()
  const setSystemRouting = useSetSystemRoutingMutation()

  const handleUserChange = (type: RoutingType, name: string, appId: string) => {
    setUserRouting.mutate(
      { type, name, app: appId },
      {
        onSuccess: () => {
          toast.success('Preference updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  const handleSystemChange = (type: RoutingType, name: string, appId: string) => {
    setSystemRouting.mutate(
      { type, name, app: appId },
      {
        onSuccess: () => {
          toast.success('System default updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update system default'))
        },
      }
    )
  }

  return {
    data,
    isLoading,
    error,
    handleUserChange,
    handleSystemChange,
  }
}
