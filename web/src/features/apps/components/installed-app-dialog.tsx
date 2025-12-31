import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  getErrorMessage,
} from '@mochi/common'
import { toast } from 'sonner'
import type { InstalledApp } from '@/api/types/apps'
import {
  useMultiVersionAvailable,
  useAppVersions,
  useSetUserVersion,
} from '@/hooks/useVersions'

interface InstalledAppDialogProps {
  app: InstalledApp | null
  onClose: () => void
}

export function InstalledAppDialog({ app, onClose }: InstalledAppDialogProps) {
  const { data: availableData } = useMultiVersionAvailable()
  const appIdForVersions = availableData?.available ? app?.id ?? null : null
  const { data: versionData, isLoading: isLoadingVersions } = useAppVersions(appIdForVersions)
  const setUserVersion = useSetUserVersion()

  const multiVersionAvailable = availableData?.available ?? false
  const hasMultipleVersions = (versionData?.versions?.length ?? 0) > 1
  const hasTracks = Object.keys(versionData?.tracks ?? {}).length > 0

  // Determine current selection
  const userPref = versionData?.user
  const currentValue = userPref?.track
    ? `track:${userPref.track}`
    : userPref?.version
      ? `version:${userPref.version}`
      : 'default'

  const handleVersionChange = (value: string) => {
    if (!app) return

    let version = ''
    let track = ''

    if (value === 'default') {
      // Clear user preference
    } else if (value.startsWith('track:')) {
      track = value.slice(6)
    } else if (value.startsWith('version:')) {
      version = value.slice(8)
    }

    setUserVersion.mutate(
      { app: app.id, version, track },
      {
        onSuccess: () => {
          toast.success('Version preference updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  return (
    <AlertDialog open={!!app} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{app?.name}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className='space-y-4 text-sm'>
          <div className='space-y-2'>
            <p className='break-all'>
              <span className='font-medium'>ID:</span> {app?.id}
            </p>
            <p className='break-all'>
              <span className='font-medium'>Fingerprint:</span>{' '}
              {app?.fingerprint || 'None'}
            </p>
            <p>
              <span className='font-medium'>Version:</span> {app?.latest}
            </p>
          </div>

          {multiVersionAvailable && (hasMultipleVersions || hasTracks) && (
            <div className='space-y-2 border-t pt-4'>
              <Label>Preferred version</Label>
              {isLoadingVersions ? (
                <Skeleton className='h-10 w-full' />
              ) : (
                <Select
                  value={currentValue}
                  onValueChange={handleVersionChange}
                  disabled={setUserVersion.isPending}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='default'>System default</SelectItem>
                    {hasTracks && (
                      <>
                        {Object.entries(versionData?.tracks ?? {}).map(
                          ([track, version]) => (
                            <SelectItem key={`track:${track}`} value={`track:${track}`}>
                              {track} (version {version})
                            </SelectItem>
                          )
                        )}
                      </>
                    )}
                    {hasMultipleVersions && (
                      <>
                        {[...(versionData?.versions ?? [])].reverse().map((version) => (
                          <SelectItem
                            key={`version:${version}`}
                            value={`version:${version}`}
                          >
                            Version {version}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className='text-muted-foreground text-xs'>
                Choose which version of this app to use
              </p>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
