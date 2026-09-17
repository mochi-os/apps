// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { Trans } from '@lingui/react/macro'
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
                <span className='font-medium'>
                  <Trans>Available version:</Trans>
                </span>{' '}
                {appInfo.tracks.find(
                  (track) => track.track === appInfo.app.default_track
                )?.version ?? appInfo.tracks[0]?.version}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>
                  <Trans>Fingerprint:</Trans>
                </span>{' '}
                <span className='font-mono text-xs'>{appInfo.fingerprint}</span>
              </p>
              <p className='text-sm'>
                <span className='font-medium'>
                  <Trans>Entity:</Trans>
                </span>{' '}
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
            <Button variant='outline' disabled={isInstalling}>
              <Trans>Cancel</Trans>
            </Button>
          </ResponsiveDialogClose>
          <Button
            onClick={() => {
              if (!appInfo) return
              const version =
                appInfo.tracks.find(
                  (track) => track.track === appInfo.app.default_track
                )?.version ?? appInfo.tracks[0]?.version
              if (version) onInstall(version)
            }}
            loading={isInstalling}
            icon={<Download className='size-4' />}
            disabled={isLoading || !appInfo?.tracks.length}
          >
            <Trans>Install</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
