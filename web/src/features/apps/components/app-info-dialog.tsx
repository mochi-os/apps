import {
  Button,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Skeleton,
} from '@mochi/web'
import { Download, AlertTriangle } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import type { AppInfo, Track } from '@/api/types/apps'

interface AppInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appInfo:
    | {
        app: AppInfo
        fingerprint: string
        tracks: Track[]
      }
    | undefined
  isLoading: boolean
  onInstall: (version: string) => void
  isInstalling: boolean
}

export function AppInfoDialog({
  open,
  onOpenChange,
  appInfo,
  isLoading,
  onInstall,
  isInstalling,
}: AppInfoDialogProps) {
  const { t } = useLingui()
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-md'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              (appInfo?.app?.name ?? t`App information`)
            )}
          </ResponsiveDialogTitle>
          {appInfo?.app && (
            <ResponsiveDialogDescription className='font-mono text-xs'>
              {appInfo.app.id}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>

        <div className='space-y-4 py-4'>
          <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <p>
              <Trans>
                This app is installed directly from its publisher and has not been
                vetted. It may be malware.
              </Trans>
            </p>
          </div>

          {isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
              
              <div className='pt-2'>
                 <div className="flex gap-2 items-center mb-1">
                    <span className='font-medium text-sm'><Trans>Fingerprint:</Trans></span>
                    <Skeleton className='h-4 w-32' />
                 </div>
              </div>

              <div>
                <p className='mb-2 text-sm font-medium'><Trans>Available versions:</Trans></p>
                <div className='space-y-2'>
                   <div className='flex items-center justify-between rounded-lg border p-3'>
                      <div className='space-y-1'>
                        <Skeleton className='h-5 w-24' />
                        <Skeleton className='h-4 w-16' />
                      </div>
                      <Skeleton className='h-9 w-20' />
                   </div>
                </div>
              </div>
            </div>
          ) : appInfo?.app ? (
            <div className='space-y-3'>
              {appInfo.app.description && (
                <p className='text-sm'>{appInfo.app.description}</p>
              )}

              <p className='text-sm'>
                <span className='font-medium'><Trans>Fingerprint:</Trans></span>{' '}
                <span className='font-mono text-xs'>{appInfo.fingerprint}</span>
              </p>

              <div>
                <p className='mb-2 text-sm font-medium'><Trans>Available versions:</Trans></p>
                <div className='space-y-2'>
                  {appInfo.tracks.map((track) => (
                    <div
                      key={track.track}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div>
                        <p className='font-medium'>{track.track}</p>
                        <p className='text-muted-foreground text-sm'>
                          <Trans>Version {track.version}</Trans>
                        </p>
                      </div>
                      <Button
                        size='sm'
                        onClick={() => onInstall(track.version)}
                        disabled={isInstalling}
                      >
                        <Download className='me-2 h-4 w-4' />
                        {isInstalling ? t`Installing...` : t`Install`}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              <Trans>
                Unable to load app information. The app may not exist or the
                publisher may be offline.
              </Trans>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
