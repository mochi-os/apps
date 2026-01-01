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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Skeleton,
  getErrorMessage,
  toast,
  Alert,
  AlertDescription,
} from '@mochi/common'
import { AlertTriangle } from 'lucide-react'
import type { InstalledApp } from '@/api/types/apps'
import {
  useMultiVersionAvailable,
  useAppVersions,
  useSetUserVersion,
  useSetSystemVersion,
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
  const setSystemVersion = useSetSystemVersion()

  const multiVersionAvailable = availableData?.available ?? false
  const hasMultipleVersions = (versionData?.versions?.length ?? 0) > 1
  const hasTracks = Object.keys(versionData?.tracks ?? {}).length > 0
  const isAdmin = versionData?.is_admin ?? false
  const defaultTrack = versionData?.default_track ?? ''
  const trackWarning = versionData?.track_warning ?? ''

  // Determine current user selection
  const userPref = versionData?.user
  const userValue = userPref?.track
    ? `track:${userPref.track}`
    : userPref?.version
      ? `version:${userPref.version}`
      : 'default'

  // Determine current system selection (admin only)
  const systemPref = versionData?.system
  const systemValue = systemPref?.track
    ? `track:${systemPref.track}`
    : systemPref?.version
      ? `version:${systemPref.version}`
      : 'default'

  // Compute the effective "default" version for display
  // Priority: system preference > default track version
  const effectiveDefaultVersion = (() => {
    if (systemPref?.version) return systemPref.version
    if (systemPref?.track && versionData?.tracks?.[systemPref.track]) {
      return versionData.tracks[systemPref.track]
    }
    if (defaultTrack && versionData?.tracks?.[defaultTrack]) {
      return versionData.tracks[defaultTrack]
    }
    return ''
  })()

  const handleUserVersionChange = (value: string) => {
    if (!app) return
    let { version, track } = parseVersionValue(value)
    // If a track is selected, look up the version for that track
    if (track && versionData?.tracks?.[track]) {
      version = versionData.tracks[track]
    }
    setUserVersion.mutate(
      { app: app.id, version, track },
      {
        onSuccess: () => {
          toast.success('Version changed')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  const handleSystemVersionChange = (value: string) => {
    if (!app) return
    let { version, track } = parseVersionValue(value)
    // If a track is selected, look up the version for that track
    if (track && versionData?.tracks?.[track]) {
      version = versionData.tracks[track]
    }
    setSystemVersion.mutate(
      { app: app.id, version, track },
      {
        onSuccess: () => {
          toast.success('Default for all users updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update default'))
        },
      }
    )
  }

  const renderVersionSelect = (
    value: string,
    onChange: (value: string) => void,
    disabled: boolean,
    defaultLabel: string
  ) => (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className='w-full'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='default'>{defaultLabel}</SelectItem>
        {hasTracks && (
          <SelectGroup>
            <SelectLabel>Track</SelectLabel>
            {Object.entries(versionData?.tracks ?? {}).map(
              ([track, version]) => (
                <SelectItem key={`track:${track}`} value={`track:${track}`} className='pl-6'>
                  {track === defaultTrack
                    ? `${track} (default, version ${version})`
                    : `${track} (version ${version})`}
                </SelectItem>
              )
            )}
          </SelectGroup>
        )}
        {hasMultipleVersions && (
          <SelectGroup>
            <SelectLabel>Version</SelectLabel>
            {[...(versionData?.versions ?? [])].reverse().map((version) => (
              <SelectItem
                key={`version:${version}`}
                value={`version:${version}`}
                className='pl-6'
              >
                {version}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )

  return (
    <AlertDialog open={!!app} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className='sm:max-w-lg'>
        <AlertDialogHeader>
          <AlertDialogTitle>{app?.name}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className='space-y-4 text-sm'>
          <div className='space-y-2'>
            <p className='break-all'><span className='font-medium'>ID:</span> {app?.id}</p>
            <p><span className='font-medium'>Fingerprint:</span> {app?.fingerprint || 'None'}</p>
          </div>

          {/* Show what this app provides */}
          {(app?.classes?.length || app?.services?.length || app?.paths?.length) && (
            <div className='space-y-1 border-t pt-4'>
              <p className='font-medium'>Provides</p>
              <div className='text-muted-foreground space-y-1'>
                {app?.classes && app.classes.length > 0 && (
                  <p>Classes: {app.classes.join(', ')}</p>
                )}
                {app?.services && app.services.length > 0 && (
                  <p>Services: {app.services.join(', ')}</p>
                )}
                {app?.paths && app.paths.length > 0 && (
                  <p>Paths: {app.paths.map((p) => `/${p}`).join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Show warning if user's track no longer exists */}
          {trackWarning && (
            <Alert variant='destructive' className='border-t pt-4'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                {trackWarning}. Select a different track below.
              </AlertDescription>
            </Alert>
          )}

          {multiVersionAvailable && (hasMultipleVersions || hasTracks) && (
            <>
              {isAdmin && (
                <div className='space-y-2 border-t pt-4'>
                  <Label>Default version for all users</Label>
                  {isLoadingVersions ? (
                    <Skeleton className='h-10 w-full' />
                  ) : (
                    renderVersionSelect(
                      systemValue,
                      handleSystemVersionChange,
                      setSystemVersion.isPending,
                      defaultTrack && versionData?.tracks?.[defaultTrack]
                        ? `Default track (version ${versionData.tracks[defaultTrack]})`
                        : 'Default track'
                    )
                  )}
                </div>
              )}
              <div className='space-y-2 border-t pt-4'>
                <Label>{isAdmin ? 'Version you use' : 'Preferred version'}</Label>
                {isLoadingVersions ? (
                  <Skeleton className='h-10 w-full' />
                ) : (
                  renderVersionSelect(
                    userValue,
                    handleUserVersionChange,
                    setUserVersion.isPending,
                    effectiveDefaultVersion
                      ? `Default for all users (version ${effectiveDefaultVersion})`
                      : 'Default for all users'
                  )
                )}
              </div>
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function parseVersionValue(value: string): { version: string; track: string } {
  if (value === 'default') {
    return { version: '', track: '' }
  } else if (value.startsWith('track:')) {
    return { version: '', track: value.slice(6) }
  } else if (value.startsWith('version:')) {
    return { version: value.slice(8), track: '' }
  }
  return { version: '', track: '' }
}
