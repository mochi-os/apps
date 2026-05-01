import { useState, useRef } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  HeaderSearch,
  Input,
  Label,
  Main,
  PageHeader,
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Switch,
  useDebounce,
  usePageTitle,
  toast,
  Skeleton,
  DataChip,
} from '@mochi/web'
import { Package, ExternalLink, Download, RefreshCw, MoreHorizontal, Trash2 } from 'lucide-react'
import type { InstalledApp, MarketApp } from '@/api/types/apps'
import type { DirectoryApp } from '@/api/apps'
import {
  useInstalledAppsQuery,
  useMarketAppsQuery,
  useAppInfoQuery,
  useInstallFromPublisherMutation,
  useInstallFromFileMutation,
  useInstallByIdMutation,
  useDirectorySearchQuery,
  useUpdatesQuery,
  useUpgradeMutation,
  useCleanupMutation,
} from '@/hooks/useApps'
import { AppInfoDialog } from './components/app-info-dialog'
import { InstallDialog } from './components/install-dialog'

export function Apps() {
  const { t } = useLingui()
  usePageTitle(t`Apps`)
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMarketApp, setSelectedMarketApp] = useState<MarketApp | null>(
    null
  )
  const [installFromPublisher, setInstallFromPublisher] = useState(false)
  const [installFromFile, setInstallFromFile] = useState(false)
  const [appIdInput, setAppIdInput] = useState('')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [allowDiscovery, setAllowDiscovery] = useState(false)
  const [selectedDirectoryApp, setSelectedDirectoryApp] =
    useState<DirectoryApp | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchQuery, 250)
  const isSearching = searchQuery.trim().length >= 2

  const {
    data: appsData,
    isLoading: isLoadingInstalled,
    refetch: refetchInstalled,
  } = useInstalledAppsQuery()
  const {
    data: marketApps,
    isLoading: isLoadingMarket,
    isError: isMarketError,
  } = useMarketAppsQuery()
  const { data: appInfo, isLoading: isLoadingInfo } =
    useAppInfoQuery(selectedAppId)
  const { data: updatesData, refetch: refetchUpdates } = useUpdatesQuery()
  const { data: directoryApps, isLoading: isLoadingDirectory } =
    useDirectorySearchQuery(
      appsData?.can_install ? debouncedSearch : ''
    )
  const installFromPublisherMutation = useInstallFromPublisherMutation()
  const installFromFileMutation = useInstallFromFileMutation()
  const installByIdMutation = useInstallByIdMutation()
  const upgradeMutation = useUpgradeMutation()
  const cleanupMutation = useCleanupMutation()

  const installedApps = appsData?.installed
  const developmentApps = appsData?.development

  const filteredInstalledApps = installedApps?.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDevelopmentApps = developmentApps?.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Server-side filter in action_updates already returns only strictly-newer versions
  const availableUpdates = updatesData?.updates

  const handleInstall = (version: string) => {
    if (!selectedAppId) return

    installFromPublisherMutation.mutate(
      { id: selectedAppId, version, peer: appInfo?.peer },
      {
        onSuccess: () => {
          toast.success(t`App installed`, {
            description: t`The app has been installed successfully.`,
          })
          setSelectedAppId(null)
          setSelectedMarketApp(null)
        },
      }
    )
  }

  const handleMarketAppClick = (app: MarketApp) => {
    setSelectedMarketApp(app)
    setSelectedAppId(app.id)
  }

  const handlePublisherInstall = () => {
    if (!appIdInput.trim()) {
      toast.error(t`Please enter an app ID`)
      return
    }

    installByIdMutation.mutate(
      { id: appIdInput.trim() },
      {
        onSuccess: (data) => {
          toast.success(t`App installed`, {
            description: `${data.name || 'App'} v${data.version} has been installed.`,
          })
          setInstallFromPublisher(false)
          setAppIdInput('')
        },
      }
    )
  }

  const handleDirectoryInstall = () => {
    if (!selectedDirectoryApp) return
    const target = selectedDirectoryApp
    installByIdMutation.mutate(
      { id: target.id },
      {
        onSuccess: (data) => {
          toast.success(t`App installed`, {
            description: `${data.name || target.name} v${data.version} has been installed.`,
          })
          setSelectedDirectoryApp(null)
        },
      }
    )
  }

  const handleUpdateAll = async () => {
    if (!availableUpdates?.length) return

    const results = await Promise.allSettled(
      availableUpdates.map((update) =>
        upgradeMutation.mutateAsync({ id: update.id, version: update.available })
      )
    )

    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed === 0) {
      toast.success(t`All apps updated`)
    } else if (failed === results.length) {
      toast.error(t`Update failed`, { description: t`No apps could be updated.` })
    } else {
      toast.warning(`${results.length - failed} updated, ${failed} failed`)
    }

    refetchInstalled()
    refetchUpdates()
  }

  const handleCleanup = () => {
    cleanupMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.removed === 0) {
          toast.info(t`No unused versions to clean up`)
        } else {
          toast.success(t`Removed ${data.removed} unused version${data.removed === 1 ? '' : 's'}`)
        }
      },
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setInstallFromFile(true)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleFileInstall = () => {
    if (!selectedFile) return

    installFromFileMutation.mutate(
      { file: selectedFile, privacy: allowDiscovery ? 'public' : 'private' },
      {
        onSuccess: () => {
          toast.success(t`App installed`, {
            description: t`The app has been installed successfully.`,
          })
          setInstallFromFile(false)
          setSelectedFile(null)
          setAllowDiscovery(false)
        },
      }
    )
  }

  return (
    <>
      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept='.zip'
        className='hidden'
      />
      {(() => {
        const actionMenu = (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                aria-label={t`App actions`}
                title={t`App actions`}
              >
                {upgradeMutation.isPending ? (
                  <RefreshCw className='h-4 w-4 animate-spin' />
                ) : (
                  <MoreHorizontal className='h-4 w-4' />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {availableUpdates && availableUpdates.length > 0 && (
                <DropdownMenuItem
                  onClick={handleUpdateAll}
                  disabled={upgradeMutation.isPending}
                >
                  <RefreshCw
                    className={`me-2 h-4 w-4 ${upgradeMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  {upgradeMutation.isPending ? t`Updating...` : t`Update all`}
                </DropdownMenuItem>
              )}
              {appsData?.can_install && (
                <>
                  <DropdownMenuItem onClick={() => setInstallFromPublisher(true)}>
                    <ExternalLink className='me-2 h-4 w-4' />
                    <Trans>Install from publisher</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Download className='me-2 h-4 w-4' />
                    <Trans>Install from file</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCleanup}
                    disabled={cleanupMutation.isPending}
                  >
                    <Trash2 className='me-2 h-4 w-4' />
                    {cleanupMutation.isPending
                      ? t`Cleaning up...` : t`Clean up unused versions`}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )

        return (
          <>
            <PageHeader
              title={t`Apps`}
              icon={<Package className='size-4 md:size-5' />}
              showSidebarTrigger
              menuAction={
                (appsData?.can_install ||
                  (availableUpdates && availableUpdates.length > 0))
                  ? actionMenu
                  : undefined
              }
              primaryAction={
                <HeaderSearch
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder={t`Search apps...`}
                  label={t`Search apps`}
                />
              }
            />
          </>
        )
      })()}
      <Main>
        {/* Installed Apps Section */}
        <section className='mb-8'>
          <div className='mb-4 flex items-center gap-4'>
            <h2 className='text-xl font-semibold'><Trans>Installed apps</Trans></h2>
          </div>
          {isLoadingInstalled ? (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className='flex flex-col'>
                  <CardHeader>
                    <Skeleton className='h-6 w-32' />
                    <Skeleton className='mt-2 h-4 w-24' />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : installedApps?.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t`No apps installed`}
              description={t`Install apps from the market or upload your own`}
            />
          ) : filteredInstalledApps?.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t`No matching apps`}
              description={`No installed apps match "${searchQuery}"`}
            />
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {filteredInstalledApps?.map((app) => (
                <InstalledAppCard
                  key={app.id}
                  app={app}
                  onClick={() => navigate({ to: '/app/$appId', params: { appId: app.id } })}
                  availableVersion={
                    availableUpdates?.find((u) => u.id === app.id)?.available
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Development Apps Section - only show if there are any that match */}
        {developmentApps && developmentApps.length > 0 && (
          <section className='mb-8'>
            <h2 className='mb-4 text-xl font-semibold'><Trans>Development apps</Trans></h2>
            {filteredDevelopmentApps?.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t`No matching apps`}
                description={`No development apps match "${searchQuery}"`}
              />
            ) : (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {filteredDevelopmentApps?.map((app) => (
                  <InstalledAppCard
                    key={app.id}
                    app={app}
                    onClick={() => navigate({ to: '/app/$appId', params: { appId: app.id } })}
                    showId
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Market Apps Section - only show if user can install AND not searching */}
        {appsData?.can_install && !isSearching && (
          <section>
            <h2 className='text-xl font-semibold'><Trans>Available, but not installed</Trans></h2>
            <p className='mb-4 ms-3 text-xs font-medium tracking-wide text-muted-foreground uppercase'><Trans>Recommended</Trans></p>
            {isLoadingMarket ? (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className='flex flex-col h-30'>
                    <CardHeader className='pb-3'>
                      <Skeleton className='h-6 w-3/4' />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className='h-4 w-full mb-2' />
                      <Skeleton className='h-4 w-2/3' />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isMarketError ? (
              <EmptyState
                icon={Package}
                title={t`Unavailable`}
                description={t`Unable to connect to the recommendations service`}
              />
            ) : marketApps?.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t`No recommendations available`}
              />
            ) : (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {marketApps?.map((app) => (
                  <Card
                    key={app.id}
                    className='flex cursor-pointer flex-col transition-[background-color,border-color,box-shadow] hover:bg-surface-2 hover:border-border-strong hover:shadow-md'
                    onClick={() => handleMarketAppClick(app)}
                  >
                    <CardHeader className='pb-3'>
                      <CardTitle className='truncate text-lg'>
                        {app.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='flex-1'>
                      <p className='text-muted-foreground line-clamp-2 text-sm'>
                        {app.blurb || 'No description'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Directory Search Section - show only while searching */}
        {appsData?.can_install && isSearching && (
          <section>
            <h2 className='mb-4 text-xl font-semibold'><Trans>From the directory</Trans></h2>
            {isLoadingDirectory ? (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className='flex flex-col h-30'>
                    <CardHeader className='pb-3'>
                      <Skeleton className='h-6 w-3/4' />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className='h-4 w-1/3' />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !directoryApps?.length ? (
              <EmptyState
                icon={Package}
                title={t`No matches in directory`}
                description={`No installable apps in the directory match "${searchQuery}"`}
              />
            ) : (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {directoryApps.map((app) => (
                  <Card
                    key={app.id}
                    role='button'
                    tabIndex={0}
                    className='flex cursor-pointer flex-col transition-[background-color,border-color,box-shadow] hover:bg-surface-2 hover:border-border-strong hover:shadow-md'
                    onClick={() => setSelectedDirectoryApp(app)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedDirectoryApp(app)
                      }
                    }}
                  >
                    <CardHeader className='pb-3'>
                      <CardTitle className='truncate text-lg'>
                        {app.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DataChip value={app.fingerprint} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        <ResponsiveDialog
          open={!!selectedDirectoryApp}
          onOpenChange={(open) => {
            if (!open) setSelectedDirectoryApp(null)
          }}
        >
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                Install {selectedDirectoryApp?.name}?
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button
                  variant='outline'
                  disabled={installByIdMutation.isPending}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </ResponsiveDialogClose>
              <Button
                onClick={handleDirectoryInstall}
                disabled={installByIdMutation.isPending}
              >
                {installByIdMutation.isPending ? t`Installing...` : t`Install`}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={installFromPublisher}
          onOpenChange={(open) => {
            setInstallFromPublisher(open)
            if (!open) {
              setAppIdInput('')
            }
          }}
        >
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle><Trans>Install from publisher</Trans></ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Enter the app entity to install. For private apps, use the
                format: app@publisher.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className='space-y-3 py-4'>
              <Input
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                disabled={installByIdMutation.isPending}
              />
            </div>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button variant='outline' disabled={installByIdMutation.isPending}>
                  <Trans>Cancel</Trans>
                </Button>
              </ResponsiveDialogClose>
              <Button
                onClick={handlePublisherInstall}
                disabled={installByIdMutation.isPending}
              >
                {installByIdMutation.isPending ? t`Installing...` : t`Install`}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={installFromFile}
          onOpenChange={(open) => {
            setInstallFromFile(open)
            if (!open) {
              setSelectedFile(null)
              setAllowDiscovery(false)
            }
          }}
        >
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle><Trans>Install from file</Trans></ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className='space-y-4 py-4'>
              <p className='text-sm'>
                <span className='font-medium'>File:</span> {selectedFile?.name}
              </p>
              <div className='flex items-center justify-between rounded-xl border px-4 py-3'>
                <Label
                  htmlFor='allow-discovery'
                  className='text-sm font-medium'
                >
                  <Trans>Add to directory</Trans>
                </Label>
                <Switch
                  id='allow-discovery'
                  checked={allowDiscovery}
                  onCheckedChange={setAllowDiscovery}
                  disabled={installFromFileMutation.isPending}
                />
              </div>
            </div>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button variant='outline'><Trans>Cancel</Trans></Button>
              </ResponsiveDialogClose>
              <Button
                onClick={handleFileInstall}
                disabled={installFromFileMutation.isPending}
              >
                {installFromFileMutation.isPending
                  ? t`Installing...` : t`Install`}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <AppInfoDialog
          open={!!selectedAppId && !selectedMarketApp}
          onOpenChange={(open) => !open && setSelectedAppId(null)}
          appInfo={appInfo}
          isLoading={isLoadingInfo}
          onInstall={handleInstall}
          isInstalling={installFromPublisherMutation.isPending}
        />

        <InstallDialog
          open={!!selectedMarketApp}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMarketApp(null)
              setSelectedAppId(null)
            }
          }}
          marketApp={selectedMarketApp}
          appInfo={appInfo}
          isLoading={isLoadingInfo}
          onInstall={handleInstall}
          isInstalling={installFromPublisherMutation.isPending}
        />
      </Main>
    </>
  )
}

function InstalledAppCard({
  app,
  onClick,
  showId,
  availableVersion,
}: {
  app: InstalledApp
  onClick: () => void
  showId?: boolean
  availableVersion?: string
}) {
  const { t } = useLingui()
  // Show track if user is following a non-Production track
  const showTrack = app.user_track && app.user_track !== 'Production'

  return (
    <Card
      role='button'
      tabIndex={0}
      className='flex cursor-pointer flex-col transition-[background-color,border-color,box-shadow] hover:bg-surface-2 hover:border-border-strong hover:shadow-md'
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <CardHeader>
        <CardTitle className='truncate text-lg'>{app.name}</CardTitle>
        <div className='flex flex-wrap items-center gap-2 mt-1.5'>
          <DataChip value={app.latest ?? 'v1.0.0'} />
          {availableVersion && availableVersion !== app.latest && (
            <DataChip
              value={availableVersion}
              label={t`Update`}
            />
          )}
          {showTrack && app.user_track && (
            <DataChip value={app.user_track} label={t`Track`} />
          )}
          {showId && (
            <span className='text-xs text-muted-foreground truncate font-mono opacity-80'>
              {app.id}
            </span>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}
