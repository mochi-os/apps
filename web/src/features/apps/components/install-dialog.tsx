import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mochi/common'
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{marketApp.name}</AlertDialogTitle>
          {marketApp.blurb && (
            <p className='text-sm'>{marketApp.blurb}</p>
          )}
        </AlertDialogHeader>

        <div className='min-h-[160px] space-y-3'>
          {marketApp.description && (
            <>
              <hr />
              <p className='text-muted-foreground text-sm'>{marketApp.description}</p>
            </>
          )}

          <hr />

          {isLoading ? (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              Loading version information...
            </div>
          ) : appInfo ? (
            <>
              <p className='text-sm'>
                <span className='font-medium'>Available version:</span>{' '}
                {appInfo.tracks[0]?.version}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Fingerprint:</span>{' '}
                <span className='font-mono text-xs'>{appInfo.fingerprint}</span>
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Entity:</span>{' '}
                <span className='font-mono text-xs break-all'>{marketApp.id}</span>
              </p>
            </>
          ) : (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              Unable to load version information
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className='border-0 bg-transparent shadow-none hover:bg-accent'>Cancel</AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            onClick={() => appInfo && onInstall(appInfo.tracks[0]?.version)}
            disabled={isLoading || isInstalling || !appInfo?.tracks[0]}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
