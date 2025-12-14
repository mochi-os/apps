import { useState } from 'react'
import { Package, Download, ExternalLink, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { InstalledApp, MarketApp } from '@/api/types/apps'
import {
  useInstalledAppsQuery,
  useMarketAppsQuery,
  useAppInfoQuery,
  useInstallAppMutation,
} from '@/hooks/useApps'
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
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Header,
  Main,
} from '@mochi/common'
import { InstallDialog } from './components/install-dialog'
import { AppInfoDialog } from './components/app-info-dialog'

export function Apps() {
  const [search, setSearch] = useState('')
  const [showMarket, setShowMarket] = useState(false)
  const [selectedMarketApp, setSelectedMarketApp] = useState<MarketApp | null>(null)
  const [installFromPublisher, setInstallFromPublisher] = useState(false)
  const [publisherId, setPublisherId] = useState('')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  const { data: installedApps, isLoading: isLoadingInstalled } =
    useInstalledAppsQuery()
  const { data: marketApps, isLoading: isLoadingMarket } = useMarketAppsQuery()
  const { data: appInfo, isLoading: isLoadingInfo } = useAppInfoQuery(selectedAppId)
  const installMutation = useInstallAppMutation()

  const filteredInstalledApps = installedApps?.filter(
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

    installMutation.mutate(
      { id: selectedAppId, version },
      {
        onSuccess: () => {
          toast.success('App installed', {
            description: 'The app has been installed successfully.',
          })
          setSelectedAppId(null)
          setSelectedMarketApp(null)
          setShowMarket(false)
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
      toast.error('Please enter an App ID')
      return
    }
    setSelectedAppId(publisherId.trim())
    setInstallFromPublisher(false)
    setPublisherId('')
  }

  if (isLoadingInstalled && !installedApps) {
    return (
      <>
        <Header fixed>
          <h1 className="text-lg font-semibold">Apps</h1>
        </Header>
        <Main>
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted-foreground">Loading apps...</div>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Apps</h1>
      </Header>

      <Main>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {showMarket ? 'App Market' : 'Installed Apps'}
            </h2>
            <p className="text-muted-foreground">
              {showMarket
                ? 'Browse and install apps from the market'
                : 'Manage your installed applications'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showMarket ? 'outline' : 'default'}
              onClick={() => setShowMarket(false)}
            >
              <Package className="mr-2 h-4 w-4" />
              Installed
            </Button>
            <Button
              variant={showMarket ? 'default' : 'outline'}
              onClick={() => setShowMarket(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Market
            </Button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {showMarket && (
            <Button variant="outline" onClick={() => setInstallFromPublisher(true)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              From Publisher
            </Button>
          )}
        </div>

        {showMarket ? (
          <>
            {isLoadingMarket ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-muted-foreground">Loading market...</div>
              </div>
            ) : filteredMarketApps?.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">No apps available</p>
                    <p className="mt-1 text-sm">
                      {search
                        ? 'Try adjusting your search'
                        : 'You have installed every app in the market'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-medium">Important</p>
                  <p>
                    Apps in the App Market have been loosely vetted to prevent obvious
                    malware. Apps will automatically update when the publisher releases
                    a new version.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMarketApps?.map((app) => (
                    <Card
                      key={app.id}
                      className="flex cursor-pointer flex-col transition-shadow hover:shadow-md"
                      onClick={() => handleMarketAppClick(app)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="truncate text-lg">{app.name}</CardTitle>
                        <CardDescription className="truncate font-mono text-xs">
                          {app.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {app.blurb || 'No description'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {filteredInstalledApps?.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">No apps installed</p>
                    <p className="mt-1 text-sm">
                      {search
                        ? 'Try adjusting your search'
                        : 'Install apps from the market to get started'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredInstalledApps?.map((app) => (
                  <InstalledAppCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </>
        )}

        <AlertDialog
          open={installFromPublisher}
          onOpenChange={setInstallFromPublisher}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Install from Publisher</AlertDialogTitle>
              <AlertDialogDescription>
                Apps installed directly from a publisher have not been vetted and may
                be malware. Apps will automatically update when the publisher releases
                a new version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="App ID (51 characters)"
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

        <AppInfoDialog
          open={!!selectedAppId && !selectedMarketApp}
          onOpenChange={(open) => !open && setSelectedAppId(null)}
          appInfo={appInfo}
          isLoading={isLoadingInfo}
          onInstall={handleInstall}
          isInstalling={installMutation.isPending}
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
          isInstalling={installMutation.isPending}
        />
      </Main>
    </>
  )
}

function InstalledAppCard({ app }: { app: InstalledApp }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="truncate text-lg">{app.name}</CardTitle>
        <CardDescription className="truncate font-mono text-xs">
          {app.id}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Version:</span>{' '}
            {app.latest}
          </p>
          <p className="truncate">
            <span className="font-medium text-foreground">Fingerprint:</span>{' '}
            {app.fingerprint}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
