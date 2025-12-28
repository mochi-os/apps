import { useState, useRef } from 'react'
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
  Input,
  Label,
  Main,
  Switch,
  usePageTitle,
} from '@mochi/common'
import { Package, ExternalLink, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
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
} from '@/hooks/useApps'
import { AppInfoDialog } from './components/app-info-dialog'
import { InstallDialog } from './components/install-dialog'

export function Apps() {
  usePageTitle('Apps')
  const [selectedMarketApp, setSelectedMarketApp] = useState<MarketApp | null>(
    null
  )
  const [selectedInstalledApp, setSelectedInstalledApp] =
    useState<InstalledApp | null>(null)
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
        onError: () => {
          toast.error('Failed to install app')
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
        onError: (error: Error) => {
          toast.error('Failed to install app', {
            description: error.message,
          })
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
        toast.error(`Failed to upgrade ${update.name}`)
      }
    }
    toast.success('All apps updated')
    // Refetch to update UI immediately
    refetchInstalled()
    refetchUpdates()
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
        onError: () => {
          toast.error('Failed to install app')
        },
      }
    )
  }

  if (isLoadingInstalled && !appsData) {
    return (
      <>
        <Main>
          <div className='flex h-64 items-center justify-center'>
            <div className='text-muted-foreground'>Loading apps...</div>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Main>
        {appsData?.can_install && (
          <div className='mb-6 flex items-center justify-end gap-2'>
            <input
              type='file'
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept='.zip'
              className='hidden'
            />
            <Button
              variant='outline'
              onClick={() => setInstallFromPublisher(true)}
            >
              <ExternalLink className='mr-2 h-4 w-4' />
              Install from publisher
            </Button>
            <Button
              variant='outline'
              onClick={() => fileInputRef.current?.click()}
            >
              <Download className='mr-2 h-4 w-4' />
              Install from file
            </Button>
          </div>
        )}

        {/* Installed Apps Section */}
        <section className='mb-8'>
          <div className='mb-4 flex items-center gap-4'>
            <h2 className='text-xl font-semibold'>Installed apps</h2>
            {availableUpdates && availableUpdates.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleUpdateAll}
                disabled={upgradeMutation.isPending}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                {upgradeMutation.isPending ? 'Updating...' : 'Update all'}
              </Button>
            )}
          </div>
          {installedApps?.length === 0 ? (
            <Card>
              <CardContent className='py-8'>
                <div className='text-muted-foreground text-center'>
                  <Package className='mx-auto mb-4 h-12 w-12 opacity-50' />
                  <p className='font-medium'>No apps installed</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {installedApps?.map((app) => (
                <InstalledAppCard
                  key={app.id}
                  app={app}
                  onClick={() => setSelectedInstalledApp(app)}
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
                  onClick={() => setSelectedInstalledApp(app)}
                  showId
                />
              ))}
            </div>
          </section>
        )}

        {/* Market Apps Section - only show if user can install */}
        {appsData?.can_install && (
          <section>
            <h2 className='mb-4 text-xl font-semibold'>Market</h2>
            {isLoadingMarket ? (
              <div className='flex h-32 items-center justify-center'>
                <div className='text-muted-foreground'>Loading market...</div>
              </div>
            ) : isMarketError ? (
              <Card>
                <CardContent className='py-8'>
                  <div className='text-muted-foreground text-center'>
                    <Package className='mx-auto mb-4 h-12 w-12 opacity-50' />
                    <p className='font-medium'>App Market unavailable</p>
                  </div>
                </CardContent>
              </Card>
            ) : marketApps?.length === 0 ? (
              <Card>
                <CardContent className='py-8'>
                  <div className='text-muted-foreground text-center'>
                    <Package className='mx-auto mb-4 h-12 w-12 opacity-50' />
                    <p className='font-medium'>No apps available</p>
                  </div>
                </CardContent>
              </Card>
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

        <AlertDialog
          open={!!selectedInstalledApp}
          onOpenChange={(open) => !open && setSelectedInstalledApp(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedInstalledApp?.name}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className='space-y-2 text-sm'>
              <p className='break-all'>
                <span className='font-medium'>ID:</span>{' '}
                {selectedInstalledApp?.id}
              </p>
              <p>
                <span className='font-medium'>Version:</span>{' '}
                {selectedInstalledApp?.latest}
              </p>
              <p className='break-all'>
                <span className='font-medium'>Fingerprint:</span>{' '}
                {selectedInstalledApp?.fingerprint || 'None'}
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  return (
    <Card
      className='flex cursor-pointer flex-col transition-shadow hover:shadow-md'
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className='truncate text-lg'>{app.name}</CardTitle>
        <p className='text-muted-foreground text-sm'>
          {availableVersion
            ? `${app.latest} (update to ${availableVersion} available)`
            : app.latest}
          {showId && <span className='truncate'> · {app.id}</span>}
        </p>
      </CardHeader>
    </Card>
  )
}
