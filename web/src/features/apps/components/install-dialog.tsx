import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@mochi/common'
import { Download } from 'lucide-react'
import type { MarketApp, AppInfo, Track } from '@/api/types/apps'

interface InstallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketApp: MarketApp | null
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

export function InstallDialog({
  open,
  onOpenChange,
  marketApp,
  appInfo,
  isLoading,
  onInstall,
  isInstalling,
}: InstallDialogProps) {
  if (!marketApp) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{marketApp.name}</DialogTitle>
          <DialogDescription className='font-mono text-xs'>
            {marketApp.id}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {marketApp.blurb && (
            <p className='text-muted-foreground text-sm'>{marketApp.blurb}</p>
          )}

          {marketApp.description && (
            <p className='text-sm'>{marketApp.description}</p>
          )}

          {isLoading ? (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              Loading version information...
            </div>
          ) : appInfo ? (
            <div className='space-y-3'>
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
              Unable to load version information
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
