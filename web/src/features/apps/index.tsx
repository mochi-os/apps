import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  Input,
  Label,
  Main,
  PageHeader,
  Switch,
  usePageTitle,
  toast,
  Skeleton,
} from '@mochi/common'
import { Package, ExternalLink, Download, RefreshCw, MoreVertical, Trash2 } from 'lucide-react'
import type { InstalledApp, MarketApp } from '@/api/types/apps'
import {
  useInstalledAppsQuery,
  useMarketAppsQuery,
  useAppInfoQuery,
  useInstallFromPublisherMutation,
  useInstallFromFileMutation,
  useInstallByIdMutation,
  useUpdatesQuery,
  useUpgradeMutation,
  useCleanupMutation,
} from '@/hooks/useApps'
import { AppInfoDialog } from './components/app-info-dialog'
import { InstallDialog } from './components/install-dialog'

export function Apps() {
  usePageTitle('Apps')
  const navigate = useNavigate()
  const [selectedMarketApp, setSelectedMarketApp] = useState<MarketApp | null>(
    null
  )
  const [installFromPublisher, setInstallFromPublisher] = useState(false)
  const [installFromFile, setInstallFromFile] = useState(false)
  const [appIdInput, setAppIdInput] = useState('')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [allowDiscovery, setAllowDiscovery] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const installFromPublisherMutation = useInstallFromPublisherMutation()
  const installFromFileMutation = useInstallFromFileMutation()
  const installByIdMutation = useInstallByIdMutation()
  const upgradeMutation = useUpgradeMutation()
  const cleanupMutation = useCleanupMutation()

  const installedApps = appsData?.installed
  const developmentApps = appsData?.development

  // Compare versions: returns true if a > b
  const isNewerVersion = (a: string, b: string | null): boolean => {
    if (!b) return !!a // If no current version, any available version is newer
    const partsA = a.split('.').map((n) => parseInt(n, 10) || 0)
    const partsB = b.split('.').map((n) => parseInt(n, 10) || 0)
    const len = Math.max(partsA.length, partsB.length)
    for (let i = 0; i < len; i++) {
      const numA = partsA[i] || 0
      const numB = partsB[i] || 0
      if (numA > numB) return true
      if (numA < numB) return false
    }
    return false
  }

  // Filter updates to only show newer versions
  const availableUpdates = updatesData?.updates?.filter((update) =>
    isNewerVersion(update.available, update.current)
  )

  const handleInstall = (version: string) => {
    if (!selectedAppId) return

    installFromPublisherMutation.mutate(
      { id: selectedAppId, version, peer: appInfo?.peer },
      {
        onSuccess: () => {
          toast.success('App installed', {
            description: 'The app has been installed successfully.',
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
      toast.error('Please enter an app ID')
      return
    }

    installByIdMutation.mutate(
      { id: appIdInput.trim() },
      {
        onSuccess: (data) => {
          toast.success('App installed', {
            description: `${data.name || 'App'} v${data.version} has been installed.`,
          })
          setInstallFromPublisher(false)
          setAppIdInput('')
        },
      }
    )
  }

  const handleUpdateAll = async () => {
    if (!availableUpdates?.length) return

    for (const update of availableUpdates) {
      try {
        await upgradeMutation.mutateAsync({
          id: update.id,
          version: update.available,
        })
      } catch {
        // Error already handled by api-client interceptor
      }
    }
    toast.success('All apps updated')
    // Refetch to update UI immediately
    refetchInstalled()
    refetchUpdates()
  }

  const handleCleanup = () => {
    cleanupMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.removed === 0) {
          toast.info('No unused versions to clean up')
        } else {
          toast.success(`Removed ${data.removed} unused version${data.removed === 1 ? '' : 's'}`)
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
          toast.success('App installed', {
            description: 'The app has been installed successfully.',
          })
          setInstallFromFile(false)
          setSelectedFile(null)
          setAllowDiscovery(false)
        },
      }
    )
  }

  if (isLoadingInstalled && !appsData) {
    return (
      <>
        <Main>
          <section className='mb-8'>
            <div className='mb-4 flex items-center gap-4'>
              <h2 className='text-xl font-semibold'>Installed apps</h2>
            </div>
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
          </section>
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title='Apps'
        icon={<Package className='size-4 md:size-5' />}
        actions={
          (appsData?.can_install ||
            (availableUpdates && availableUpdates.length > 0)) && (
            <div className='flex items-center gap-2'>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept='.zip'
                className='hidden'
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon'>
                    {upgradeMutation.isPending ? (
                      <RefreshCw className='h-4 w-4 animate-spin' />
                    ) : (
                      <MoreVertical className='h-4 w-4' />
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
                        className={`mr-2 h-4 w-4 ${upgradeMutation.isPending ? 'animate-spin' : ''}`}
                      />
                      {upgradeMutation.isPending ? 'Updating...' : 'Update all'}
                    </DropdownMenuItem>
                  )}
                  {appsData?.can_install && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setInstallFromPublisher(true)}
                      >
                        <ExternalLink className='mr-2 h-4 w-4' />
                        Install from publisher
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Download className='mr-2 h-4 w-4' />
                        Install from file
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleCleanup}
                        disabled={cleanupMutation.isPending}
                        className='text-destructive focus:text-destructive'
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        {cleanupMutation.isPending ? 'Cleaning up...' : 'Clean up unused versions'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        }
      />
      <Main>
        {/* Installed Apps Section */}
        <section className='mb-8'>
          <div className='mb-4 flex items-center gap-4'>
            <h2 className='text-xl font-semibold'>Installed apps</h2>
          </div>
          {installedApps?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No apps installed"
              description="Install apps from the market or upload your own"
            />
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {installedApps?.map((app) => (
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

        {/* Development Apps Section - only show if there are any */}
        {developmentApps && developmentApps.length > 0 && (
          <section className='mb-8'>
            <h2 className='mb-4 text-xl font-semibold'>Development apps</h2>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {developmentApps.map((app) => (
                <InstalledAppCard
                  key={app.id}
                  app={app}
                  onClick={() => navigate({ to: '/app/$appId', params: { appId: app.id } })}
                  showId
                />
              ))}
            </div>
          </section>
        )}

        {/* Market Apps Section - only show if user can install */}
        {appsData?.can_install && (
          <section>
            <h2 className='text-xl font-semibold'>Available, but not installed</h2>
            <p className='mb-4 ml-3 text-base text-muted-foreground' style={{ fontVariant: 'small-caps' }}>Recommended</p>
            {isLoadingMarket ? (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className='flex flex-col h-[120px]'>
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
                title="Unavailable"
                description="Unable to connect to the recommendations service"
              />
            ) : marketApps?.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No recommendations available"
              />
            ) : (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {marketApps?.map((app) => (
                  <Card
                    key={app.id}
                    className='flex cursor-pointer flex-col transition-shadow hover:shadow-md'
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

        <AlertDialog
          open={installFromPublisher}
          onOpenChange={(open) => {
            setInstallFromPublisher(open)
            if (!open) {
              setAppIdInput('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Install from publisher</AlertDialogTitle>
              <AlertDialogDescription>
                Enter the app entity to install. For private apps, use the
                format: app@publisher.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='space-y-3 py-4'>
              <Input
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                disabled={installByIdMutation.isPending}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={installByIdMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePublisherInstall}
                disabled={installByIdMutation.isPending}
              >
                {installByIdMutation.isPending ? 'Installing...' : 'Install'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={installFromFile}
          onOpenChange={(open) => {
            setInstallFromFile(open)
            if (!open) {
              setSelectedFile(null)
              setAllowDiscovery(false)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Install from file</AlertDialogTitle>
            </AlertDialogHeader>
            <div className='space-y-4 py-4'>
              <p className='text-sm'>
                <span className='font-medium'>File:</span> {selectedFile?.name}
              </p>
              <div className='flex items-center justify-between rounded-[8px] border px-4 py-3'>
                <Label
                  htmlFor='allow-discovery'
                  className='text-sm font-medium'
                >
                  Allow other instances to discover this app
                </Label>
                <Switch
                  id='allow-discovery'
                  checked={allowDiscovery}
                  onCheckedChange={setAllowDiscovery}
                  disabled={installFromFileMutation.isPending}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFileInstall}
                disabled={installFromFileMutation.isPending}
              >
                {installFromFileMutation.isPending
                  ? 'Installing...'
                  : 'Install'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
  // Show track if user is following a non-Production track
  const showTrack = app.user_track && app.user_track !== 'Production'

  return (
    <Card
      className='flex cursor-pointer flex-col transition-shadow hover:shadow-md'
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className='truncate text-lg'>{app.name}</CardTitle>
        <p className='text-muted-foreground text-sm'>
          {availableVersion && availableVersion !== app.latest
            ? `${app.latest} (update to ${availableVersion} available)`
            : app.latest}
          {showTrack && (
            <span className='ml-1 text-xs'>({app.user_track})</span>
          )}
          {showId && <span className='truncate'> · {app.id}</span>}
        </p>
      </CardHeader>
    </Card>
  )
}
