import {
  Button,
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@mochi/web'
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{marketApp.name}</ResponsiveDialogTitle>
          {marketApp.blurb && (
            <ResponsiveDialogDescription className='text-sm'>
              {marketApp.blurb}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>

        <div className='min-h-[160px] space-y-3'>
          {marketApp.description && (
            <>
              <hr />
              <p className='text-muted-foreground text-sm'>
                {marketApp.description}
              </p>
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
                {appInfo.tracks.find((t) => t.track === appInfo.app.default_track)
                  ?.version ?? appInfo.tracks[0]?.version}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Fingerprint:</span>{' '}
                <span className='font-mono text-xs'>{appInfo.fingerprint}</span>
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Entity:</span>{' '}
                <span className='font-mono text-xs break-all'>
                  {marketApp.id}
                </span>
              </p>
            </>
          ) : (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              Unable to load version information
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button
              variant='outline'
              disabled={isInstalling}
              className='border-input hover:bg-accent focus:border-input focus-visible:border-input bg-transparent shadow-none focus:ring-0 focus:outline-none focus-visible:ring-0'
            >
              Cancel
            </Button>
          </ResponsiveDialogClose>
          <Button
            onClick={() => {
              if (!appInfo) return
              const version =
                appInfo.tracks.find((t) => t.track === appInfo.app.default_track)
                  ?.version ?? appInfo.tracks[0]?.version
              if (version) onInstall(version)
            }}
            disabled={isLoading || isInstalling || !appInfo?.tracks.length}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
