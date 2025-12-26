import { useState, useRef } from 'react'
import { usePageTitle } from '@mochi/common'
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
  Main,
} from '@mochi/common'
import { Package, ExternalLink, Search, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { InstalledApp, MarketApp } from '@/api/types/apps'
import {
  useInstalledAppsQuery,
  useMarketAppsQuery,
  useAppInfoQuery,
  useInstallFromPublisherMutation,
  useInstallFromFileMutation,
} from '@/hooks/useApps'
import { AppInfoDialog } from './components/app-info-dialog'
import { InstallDialog } from './components/install-dialog'

export function Apps() {
  usePageTitle('Apps')
  const [search, setSearch] = useState('')
  const [selectedMarketApp, setSelectedMarketApp] = useState<MarketApp | null>(
    null
  )
  const [selectedInstalledApp, setSelectedInstalledApp] =
    useState<InstalledApp | null>(null)
  const [installFromPublisher, setInstallFromPublisher] = useState(false)
  const [installFromFile, setInstallFromFile] = useState(false)
  const [publisherId, setPublisherId] = useState('')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePrivacy, setFilePrivacy] = useState<'public' | 'private'>('private')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: appsData, isLoading: isLoadingInstalled } =
    useInstalledAppsQuery()
  const { data: marketApps, isLoading: isLoadingMarket, isError: isMarketError } = useMarketAppsQuery()
  const { data: appInfo, isLoading: isLoadingInfo } =
    useAppInfoQuery(selectedAppId)
  const installFromPublisherMutation = useInstallFromPublisherMutation()
  const installFromFileMutation = useInstallFromFileMutation()

  const filteredInstalledApps = appsData?.installed?.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.id.toLowerCase().includes(search.toLowerCase())
  )

  const filteredDevelopmentApps = appsData?.development?.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.id.toLowerCase().includes(search.toLowerCase())
  )

  const filteredMarketApps = marketApps?.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.id.toLowerCase().includes(search.toLowerCase()) ||
      app.blurb.toLowerCase().includes(search.toLowerCase())
  )

  const handleInstall = (version: string) => {
    if (!selectedAppId) return

    installFromPublisherMutation.mutate(
      { id: selectedAppId, version },
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
    if (!publisherId.trim()) {
      toast.error('Please enter an app ID')
      return
    }
    setSelectedAppId(publisherId.trim())
    setInstallFromPublisher(false)
    setPublisherId('')
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
      { file: selectedFile, privacy: filePrivacy },
      {
        onSuccess: () => {
          toast.success('App installed', {
            description: 'The app has been installed successfully.',
          })
          setInstallFromFile(false)
          setSelectedFile(null)
          setFilePrivacy('private')
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
        <div className='mb-6 flex items-center justify-end gap-2'>
          <div className='relative w-64'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search apps...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-9'
            />
          </div>
          {appsData?.can_install && (
            <>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept='.zip'
                className='hidden'
              />
              <Button
                variant='outline'
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className='mr-2 h-4 w-4' />
                Install from file
              </Button>
              <Button
                variant='outline'
                onClick={() => setInstallFromPublisher(true)}
              >
                <ExternalLink className='mr-2 h-4 w-4' />
                Install from publisher
              </Button>
            </>
          )}
        </div>

        {/* Installed Apps Section */}
        <section className='mb-8'>
          <h2 className='mb-4 text-xl font-semibold'>Installed apps</h2>
          {filteredInstalledApps?.length === 0 ? (
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
              {filteredInstalledApps?.map((app) => (
                <InstalledAppCard
                  key={app.id}
                  app={app}
                  onClick={() => setSelectedInstalledApp(app)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Development Apps Section - only show if there are any */}
        {filteredDevelopmentApps && filteredDevelopmentApps.length > 0 && (
          <section className='mb-8'>
            <h2 className='mb-4 text-xl font-semibold'>Development apps</h2>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {filteredDevelopmentApps.map((app) => (
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
            ) : filteredMarketApps?.length === 0 ? (
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
                {filteredMarketApps?.map((app) => (
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
          onOpenChange={setInstallFromPublisher}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Install from publisher</AlertDialogTitle>
              <AlertDialogDescription>
                Apps installed directly from a publisher have not been vetted
                and may be malware. Apps will automatically update when the
                publisher releases a new version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='py-4'>
              <Input
                placeholder='App ID'
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                maxLength={51}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePublisherInstall}>
                Continue
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
              setFilePrivacy('private')
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
              <div className='space-y-2'>
                <label htmlFor='privacy' className='text-sm font-medium'>
                  Privacy
                </label>
                <select
                  id='privacy'
                  value={filePrivacy}
                  onChange={(e) =>
                    setFilePrivacy(e.target.value as 'public' | 'private')
                  }
                  className='border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm'
                >
                  <option value='private'>Private</option>
                  <option value='public'>Public</option>
                </select>
                <p className='text-muted-foreground text-xs'>
                  Public apps are discoverable by other instances
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFileInstall}
                disabled={installFromFileMutation.isPending}
              >
                {installFromFileMutation.isPending ? 'Installing...' : 'Install'}
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
}: {
  app: InstalledApp
  onClick: () => void
  showId?: boolean
}) {
  return (
    <Card
      className='flex cursor-pointer flex-col transition-shadow hover:shadow-md'
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className='truncate text-lg'>{app.name}</CardTitle>
        <p className='text-muted-foreground truncate text-sm'>
          {app.latest}
          {showId && <> · {app.id}</>}
        </p>
      </CardHeader>
    </Card>
  )
}
