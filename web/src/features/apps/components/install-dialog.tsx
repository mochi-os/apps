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

import { Trans, useLingui } from '@lingui/react/macro'
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
  const { t } = useLingui()
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
              <Trans>Loading version information...</Trans>
            </div>
          ) : appInfo ? (
            <>
              <p className='text-sm'>
                <span className='font-medium'><Trans>Available version:</Trans></span>{' '}
                {appInfo.tracks.find((track) => track.track === appInfo.app.default_track)
                  ?.version ?? appInfo.tracks[0]?.version}
              </p>
              <p className='text-sm'>
                <span className='font-medium'><Trans>Fingerprint:</Trans></span>{' '}
                <span className='font-mono text-xs'>{appInfo.fingerprint}</span>
              </p>
              <p className='text-sm'>
                <span className='font-medium'><Trans>Entity:</Trans></span>{' '}
                <span className='font-mono text-xs break-all'>
                  {marketApp.id}
                </span>
              </p>
            </>
          ) : (
            <div className='text-muted-foreground py-4 text-center text-sm'>
              <Trans>Unable to load version information</Trans>
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
              <Trans>Cancel</Trans>
            </Button>
          </ResponsiveDialogClose>
          <Button
            onClick={() => {
              if (!appInfo) return
              const version =
                appInfo.tracks.find((track) => track.track === appInfo.app.default_track)
                  ?.version ?? appInfo.tracks[0]?.version
              if (version) onInstall(version)
            }}
            disabled={isLoading || isInstalling || !appInfo?.tracks.length}
          >
            {isInstalling ? t`Installing...` : t`Install`}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
