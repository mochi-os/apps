import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  cn,
  EmptyState,
  PageHeader,
  Main,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Skeleton,
  usePageTitle,
  getErrorMessage,
  toast,
  Section,
  FieldRow,
  DataChip,
} from '@mochi/common'
import { Loader2, Plus, Shield, ShieldAlert, X, Package } from 'lucide-react'
import { useInstalledAppsQuery } from '@/hooks/useApps'
import {
  useAppVersions,
  useSetUserVersion,
  useSetSystemVersion,
} from '@/hooks/useVersions'
import {
  useAppPermissions,
  useSetPermission,
} from '@/hooks/usePermissions'
import type { Permission } from '@/api/types/apps'

type TabType = 'details' | 'versions' | 'permissions'

export const Route = createFileRoute('/_authenticated/app/$appId')({
  component: AppPage,
  validateSearch: (search: Record<string, unknown>): { tab?: TabType } => {
    const tab = search.tab
    if (tab === 'details' || tab === 'versions' || tab === 'permissions') {
      return { tab }
    }
    return {}
  },
})

// All available permissions
const allPermissions = [
  { permission: 'group/manage', restricted: false, label: 'Manage groups' },
  { permission: 'user/read', restricted: true, label: 'Read user data' },
  { permission: 'setting/write', restricted: true, label: 'Modify system settings' },
  { permission: 'permission/manage', restricted: true, label: 'Manage permissions' },
  { permission: 'webpush/send', restricted: true, label: 'Send notifications' },
]

function formatPermission(permission: string): string {
  if (permission.startsWith('url:')) {
    return `Access ${permission.slice(4)}`
  }
  const found = allPermissions.find((p) => p.permission === permission)
  return found?.label || permission
}

function AppPage() {
  const { appId } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = useNavigate()
  const activeTab = tab ?? 'details'
  const { data: appsData, isLoading: isLoadingApps } = useInstalledAppsQuery()

  // Prefetch versions and permissions data so tabs load instantly
  useAppVersions(appId)
  useAppPermissions(appId)

  const setActiveTab = (newTab: TabType) => {
    void navigate({
      to: '/app/$appId',
      params: { appId },
      search: newTab === 'details' ? {} : { tab: newTab },
      replace: true,
    })
  }
  const goBackToApps = () => navigate({ to: '/' })

  // Find app in installed or development apps
  const app = appsData?.installed?.find((a) => a.id === appId) ||
    appsData?.development?.find((a) => a.id === appId)

  usePageTitle(app?.name ?? 'App')

  if (isLoadingApps) {
    return (
      <>
        <PageHeader
          title={<Skeleton className='h-8 w-48' />}
          icon={<Skeleton className='size-4 md:size-5 rounded-md' />}
          back={{ label: 'Back to apps', onFallback: goBackToApps }}
        />
        <Main className='pt-2 space-y-8'>
          <div className='flex items-center border-b'>
             <div className='flex gap-1 -mb-px'>
               {[1, 2, 3].map((i) => (
                  <div key={i} className='px-4 py-2'>
                     <Skeleton className='h-5 w-20' />
                  </div>
               ))}
             </div>
          </div>
          <Skeleton className='h-64 w-full rounded-xl' />
        </Main>
      </>
    )
  }

  if (!app) {
    return (
      <>
        <PageHeader title="App not found" back={{ label: 'Back to apps', onFallback: goBackToApps }} />
        <Main>
          <EmptyState
            icon={Package}
            title="App not found"
            description="The requested app could not be found."
          />
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader 
        title={app.name}
        icon={<Package className='size-4 md:size-5' />}
        back={{ label: 'Back to apps', onFallback: goBackToApps }}
      />
      <Main className='pt-2 space-y-6'>
        <div className='flex items-center border-b'>
          <div className='flex gap-1'>
            {(['details', 'versions', 'permissions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  'border-b-2 -mb-px capitalize',
                  activeTab === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className='pt-2'>
          {activeTab === 'details' && <DetailsTab app={app} />}
          {activeTab === 'versions' && <VersionsTab appId={appId} />}
          {activeTab === 'permissions' && <PermissionsTab appId={appId} appName={app.name} />}
        </div>
      </Main>
    </>
  )
}

interface AppInfo {
  id: string
  name: string
  fingerprint: string
  latest: string
  classes?: string[]
  services?: string[]
  paths?: string[]
}

function DetailsTab({ app }: { app: AppInfo }) {
  return (
    <Section 
      title="Identity" 
      description="App information and configuration"
    >
      <div className="divide-y-0">
        <FieldRow label="Application ID">
          <DataChip value={app.id} />
        </FieldRow>
        
        {app.fingerprint && (
          <FieldRow label="Fingerprint">
            <DataChip value={app.fingerprint} />
          </FieldRow>
        )}

        <FieldRow label="Current Version">
          <DataChip value={app.latest} />
        </FieldRow>

        {(app.classes?.length || app.services?.length || app.paths?.length) && (
          <div className='mt-6 border-t pt-6 space-y-4'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4'>Technical Capabilities</h4>
            
            {app.classes && app.classes.length > 0 && (
              <FieldRow label="Provided Classes">
                <div className="flex flex-wrap gap-2">
                  {app.classes.map(c => <DataChip key={c} value={c} />)}
                </div>
              </FieldRow>
            )}
            
            {app.services && app.services.length > 0 && (
              <FieldRow label="Enabled Services">
                <div className="flex flex-wrap gap-2">
                  {app.services.map(s => <DataChip key={s} value={s} />)}
                </div>
              </FieldRow>
            )}

            {app.paths && app.paths.length > 0 && (
              <FieldRow label="HTTP Paths">
                <div className="flex flex-wrap gap-2">
                  {app.paths.map((p) => <DataChip key={p} value={`/${p}`} />)}
                </div>
              </FieldRow>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

function VersionsTab({ appId }: { appId: string }) {
  const { data: versionData, isLoading: isLoadingVersions, isError } = useAppVersions(appId)
  const setUserVersion = useSetUserVersion()
  const setSystemVersion = useSetSystemVersion()

  const hasMultipleVersions = (versionData?.versions?.length ?? 0) > 1
  const hasTracks = Object.keys(versionData?.tracks ?? {}).length > 0
  const isAdmin = versionData?.is_admin ?? false
  const defaultTrack = versionData?.default_track ?? ''

  // Determine current user selection
  const userPref = versionData?.user
  const userValue = userPref?.track
    ? `track:${userPref.track}`
    : userPref?.version
      ? `version:${userPref.version}`
      : 'default'

  // Determine current system selection (admin only)
  const systemPref = versionData?.system
  const systemValue = systemPref?.track
    ? `track:${systemPref.track}`
    : systemPref?.version
      ? `version:${systemPref.version}`
      : 'default'

  // Compute the effective "default" version for display
  const effectiveDefaultVersion = (() => {
    if (systemPref?.version) return systemPref.version
    if (systemPref?.track && versionData?.tracks?.[systemPref.track]) {
      return versionData.tracks[systemPref.track]
    }
    if (defaultTrack && versionData?.tracks?.[defaultTrack]) {
      return versionData.tracks[defaultTrack]
    }
    return ''
  })()

  const handleUserVersionChange = (value: string) => {
    let { version, track } = parseVersionValue(value)
    if (track && versionData?.tracks?.[track]) {
      version = versionData.tracks[track]
    }
    setUserVersion.mutate(
      { app: appId, version, track },
      {
        onSuccess: () => {
          toast.success('Version changed')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  const handleSystemVersionChange = (value: string) => {
    let { version, track } = parseVersionValue(value)
    if (track && versionData?.tracks?.[track]) {
      version = versionData.tracks[track]
    }
    setSystemVersion.mutate(
      { app: appId, version, track },
      {
        onSuccess: () => {
          toast.success('Default for all users updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update default'))
        },
      }
    )
  }

  if (isLoadingVersions) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-48 w-full rounded-xl' />
      </div>
    )
  }

  if (isError || !hasMultipleVersions && !hasTracks) {
    return (
      <EmptyState
        icon={Package}
        title="Not versioned"
        description="This app does not have version management"
      />
    )
  }

  const renderVersionSelect = (
    value: string,
    onChange: (value: string) => void,
    disabled: boolean,
    defaultLabel: string
  ) => (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className='w-full'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='default'>{defaultLabel}</SelectItem>
        {hasTracks && (
          <SelectGroup>
            <SelectLabel>Track</SelectLabel>
            {Object.entries(versionData?.tracks ?? {}).map(
              ([track, version]) => (
                <SelectItem key={`track:${track}`} value={`track:${track}`} className='pl-6'>
                  {track === defaultTrack
                    ? `${track} (default, version ${version})`
                    : `${track} (version ${version})`}
                </SelectItem>
              )
            )}
          </SelectGroup>
        )}
        {hasMultipleVersions && (
          <SelectGroup>
            <SelectLabel>Version</SelectLabel>
            {[...(versionData?.versions ?? [])].reverse().map((version) => (
              <SelectItem
                key={`version:${version}`}
                value={`version:${version}`}
                className='pl-6'
              >
                {version}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )

  return (
    <div className="space-y-6">
      <Section 
        title="Version Management" 
        description="Select which version of this app to use"
      >
        <div className="divide-y-0">
          {isAdmin && (
            <FieldRow label="System Default" description="The version used by users who haven't made a choice">
              <div className="w-full max-w-sm">
                {renderVersionSelect(
                  systemValue,
                  handleSystemVersionChange,
                  setSystemVersion.isPending,
                  defaultTrack && versionData?.tracks?.[defaultTrack]
                    ? `Default track (version ${versionData.tracks[defaultTrack]})`
                    : 'Default track'
                )}
              </div>
            </FieldRow>
          )}
          
          <FieldRow 
            label={isAdmin ? 'Your Version' : 'Preferred Version'} 
            description="Your personal version override"
          >
            <div className="w-full max-w-sm">
              {renderVersionSelect(
                userValue,
                handleUserVersionChange,
                setUserVersion.isPending,
                effectiveDefaultVersion
                  ? `Default for all users (version ${effectiveDefaultVersion})`
                  : 'Default for all users'
              )}
            </div>
          </FieldRow>
        </div>
      </Section>
    </div>
  )
}

function PermissionsTab({ appId, appName }: { appId: string; appName: string }) {
  const { data, isLoading, error } = useAppPermissions(appId)
  const setPermission = useSetPermission()
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const [revokingPermission, setRevokingPermission] = useState<string | null>(null)
  const [grantingPermission, setGrantingPermission] = useState<string | null>(null)

  const handleRevoke = (permission: string) => {
    setRevokingPermission(permission)
    setPermission.mutate(
      { app: appId, permission, enabled: false },
      {
        onSuccess: () => {
          toast.success('Permission revoked')
          setRevokingPermission(null)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to revoke permission'))
          setRevokingPermission(null)
        },
      }
    )
  }

  const handleGrant = (permission: string) => {
    setGrantingPermission(permission)
    setPermission.mutate(
      { app: appId, permission, enabled: true },
      {
        onSuccess: () => {
          toast.success('Permission granted')
          setGrantingPermission(null)
          setGrantDialogOpen(false)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to grant permission'))
          setGrantingPermission(null)
        },
      }
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Failed to load permissions"
        description="Make sure the Settings app is installed and you have sufficient permissions."
      />
    )
  }

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-48 w-full rounded-xl' />
      </div>
    )
  }

  const grantedPermissions = (data?.permissions ?? [])
    .filter((p) => p.granted && !p.permission.startsWith('_'))
    .sort((a, b) => formatPermission(a.permission).localeCompare(formatPermission(b.permission)))

  const grantedSet = new Set(grantedPermissions.map((p) => p.permission))
  const availablePermissions = allPermissions
    .filter((p) => !grantedSet.has(p.permission))
    .sort((a, b) => a.label.localeCompare(b.label))

  return (
    <Section 
      title="Permissions" 
      description={grantedPermissions.length === 0
        ? 'No permissions granted to this app'
        : 'Manage capabilities granted to this application'}
      action={availablePermissions.length > 0 && (
        <AlertDialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant='outline' size='sm'>
              <Plus className='h-4 w-4 mr-1' />
              Grant
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Grant permission</AlertDialogTitle>
              <AlertDialogDescription>
                Select a capability to grant to {appName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='space-y-2 py-4'>
              {availablePermissions.map((p) => (
                <button
                  key={p.permission}
                  onClick={() => handleGrant(p.permission)}
                  disabled={grantingPermission !== null}
                  className='hover:bg-accent flex w-full items-center justify-between rounded-lg border p-3.5 text-left text-sm transition-colors disabled:opacity-50'
                >
                  <div className='flex items-center gap-3'>
                    {p.restricted ? (
                      <ShieldAlert className='text-destructive h-4 w-4' />
                    ) : (
                      <Shield className='text-primary h-4 w-4' />
                    )}
                    <span className="font-medium">{p.label}</span>
                  </div>
                  {grantingPermission === p.permission ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">{p.permission}</span>
                  )}
                </button>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    >
      <div className='divide-y-0 space-y-2'>
        {grantedPermissions.length > 0 ? (
          grantedPermissions.map((permission) => (
            <PermissionRow
              key={permission.permission}
              permission={permission}
              onRevoke={handleRevoke}
              isRevoking={revokingPermission === permission.permission}
              appName={appName}
              canRevoke={!(appId === 'apps' && permission.permission === 'permission/manage')}
            />
          ))
        ) : (
          <div className="py-8">
            <EmptyState
              icon={Shield}
              title="No permissions granted"
              description="Grant permissions to allow this app to access system features"
            />
          </div>
        )}
      </div>
    </Section>
  )
}

function PermissionRow({
  permission,
  onRevoke,
  isRevoking,
  appName,
  canRevoke,
}: {
  permission: Permission
  onRevoke: (permission: string) => void
  isRevoking: boolean
  appName: string
  canRevoke: boolean
}) {
  return (
    <div className='flex items-center justify-between group rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30'>
      <div className='flex items-center gap-3 text-sm'>
        {permission.restricted ? (
          <ShieldAlert className='text-destructive h-4 w-4' />
        ) : (
          <Shield className='text-primary h-4 w-4' />
        )}
        <div>
          <p className="font-medium">{formatPermission(permission.permission)}</p>
          <p className="text-xs text-muted-foreground font-mono">{permission.permission}</p>
        </div>
      </div>
      {canRevoke && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant='ghost' 
              size='sm' 
              disabled={isRevoking}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isRevoking ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <X className='h-4 w-4' />
              )}
              <span className='sr-only'>Revoke</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke permission?</AlertDialogTitle>
              <AlertDialogDescription>
                This will revoke the &quot;{formatPermission(permission.permission)}&quot; permission
                from {appName}. The app may stop working correctly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onRevoke(permission.permission)}>
                Revoke Permission
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function parseVersionValue(value: string): { version: string; track: string } {
  if (value === 'default') {
    return { version: '', track: '' }
  } else if (value.startsWith('track:')) {
    return { version: '', track: value.slice(6) }
  } else if (value.startsWith('version:')) {
    return { version: value.slice(8), track: '' }
  }
  return { version: '', track: '' }
}
