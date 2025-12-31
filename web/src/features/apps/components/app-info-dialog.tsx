import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@mochi/common'
import { Download, AlertTriangle } from 'lucide-react'
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {isLoading
              ? 'Loading...'
              : (appInfo?.app?.name ?? 'App information')}
          </DialogTitle>
          {appInfo?.app && (
            <DialogDescription className='font-mono text-xs'>
              {appInfo.app.id}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <p>
              This app is installed directly from its publisher and has not been
              vetted. It may be malware.
            </p>
          </div>

          {isLoading ? (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              Loading app information...
            </div>
          ) : appInfo?.app ? (
            <div className='space-y-3'>
              {appInfo.app.description && (
                <p className='text-sm'>{appInfo.app.description}</p>
              )}

              <p className='text-sm'>
                <span className='font-medium'>Fingerprint:</span>{' '}
                <span className='font-mono text-xs'>{appInfo.fingerprint}</span>
              </p>

              <div>
                <p className='mb-2 text-sm font-medium'>Available versions:</p>
                <div className='space-y-2'>
                  {appInfo.tracks.map((track) => (
                    <div
                      key={track.track}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div>
                        <p className='font-medium'>{track.track}</p>
                        <p className='text-muted-foreground text-sm'>
                          Version {track.version}
                        </p>
                      </div>
                      <Button
                        size='sm'
                        onClick={() => onInstall(track.version)}
                        disabled={isInstalling}
                      >
                        <Download className='mr-2 h-4 w-4' />
                        {isInstalling ? 'Installing...' : 'Install'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              Unable to load app information. The app may not exist or the
              publisher may be offline.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
