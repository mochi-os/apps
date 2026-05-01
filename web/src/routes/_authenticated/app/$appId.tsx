import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Button,
  cn,
  ConfirmDialog,
  EmptyState,
  GeneralError,
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
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger, naturalCompare,} from '@mochi/web'
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
  { permission: 'account/read', restricted: false, label: "Read connected accounts" },
  { permission: 'account/manage', restricted: false, label: "Manage connected accounts" },
  { permission: 'account/ai', restricted: true, label: "Use AI services" },
  { permission: 'account/mcp', restricted: true, label: "Use MCP services" },
  { permission: 'account/notify', restricted: true, label: "Send account notifications" },
  { permission: 'group/manage', restricted: false, label: "Manage groups" },
  { permission: 'interests/read', restricted: false, label: "Read interests" },
  { permission: 'interests/write', restricted: false, label: "Write interests" },
  { permission: 'user/read', restricted: true, label: "Read user data" },
  { permission: 'setting/write', restricted: true, label: "Modify system settings" },
  { permission: 'permission/manage', restricted: true, label: "Manage permissions" },
  { permission: 'webpush/send', restricted: true, label: "Send notifications" },
]

function formatPermission(permission: string): string {
  if (permission.startsWith('service/')) {
    return `Handle ${permission.slice(8)} service`
  }
  if (permission.startsWith('url:')) {
    return `Access ${permission.slice(4)}`
  }
  const found = allPermissions.find((p) => p.permission === permission)
  return found?.label || permission
}

function AppPage() {
  const { t } = useLingui()
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
          back={{ label: t`Back to apps`, onFallback: goBackToApps }}
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
        <PageHeader title={t`App not found`} back={{ label: t`Back to apps`, onFallback: goBackToApps }} />
        <Main>
          <EmptyState
            icon={Package}
            title={t`App not found`}
            description={t`The requested app could not be found.`}
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
        back={{ label: t`Back to apps`, onFallback: goBackToApps }}
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
  const { t } = useLingui()
  return (
    <Section
      title={t`Identity`}
      description={t`App information and configuration`}
    >
      <div className="divide-y-0">
        <FieldRow label={t`Application ID`}>
          <DataChip value={app.id} truncate='middle' />
        </FieldRow>
        
        {app.fingerprint && (
          <FieldRow label={t`Fingerprint`}>
            <DataChip value={app.fingerprint} truncate='middle' />
          </FieldRow>
        )}

        <FieldRow label={t`Current Version`}>
          <DataChip value={app.latest} />
        </FieldRow>

        {(app.classes?.length || app.services?.length || app.paths?.length) && (
          <div className='mt-6 border-t pt-6 space-y-4'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4'><Trans>Technical Capabilities</Trans></h4>
            
            {app.classes && app.classes.length > 0 && (
              <FieldRow label={t`Provided Classes`}>
                <div className="flex flex-wrap gap-2">
                  {app.classes.map(c => <DataChip key={c} value={c} />)}
                </div>
              </FieldRow>
            )}
            
            {app.services && app.services.length > 0 && (
              <FieldRow label={t`Enabled Services`}>
                <div className="flex flex-wrap gap-2">
                  {app.services.map(s => <DataChip key={s} value={s} />)}
                </div>
              </FieldRow>
            )}

            {app.paths && app.paths.length > 0 && (
              <FieldRow label={t`HTTP Paths`}>
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
  const { t } = useLingui()
  const { data: versionData, isLoading: isLoadingVersions, isError } = useAppVersions(appId)
  const setUserVersion = useSetUserVersion()
  const setSystemVersion = useSetSystemVersion()

  const hasMultipleVersions = (versionData?.versions?.length ?? 0) > 1
  const hasTracks = Object.keys(versionData?.tracks ?? {}).length > 0
  const isAdmin = versionData?.is_admin ?? false
  const defaultTrack = versionData?.default_track ?? ''

  // Resolve a version preference to a dropdown value, ensuring it matches an available option
  const resolveValue = (pref: { version: string; track: string } | null | undefined) => {
    if (!pref) return 'default'
    if (pref.track) {
      if (versionData?.tracks?.[pref.track] !== undefined) return `track:${pref.track}`
      return 'default'
    }
    if (pref.version) {
      if (hasMultipleVersions && versionData?.versions?.includes(pref.version)) return `version:${pref.version}`
      // Version set without a track — check if it matches a track's current version
      // Prefer the publisher's default track when multiple tracks share the same version
      const tracks = versionData?.tracks ?? {}
      if (defaultTrack && tracks[defaultTrack] === pref.version) return `track:${defaultTrack}`
      for (const [track, ver] of Object.entries(tracks)) {
        if (ver === pref.version) return `track:${track}`
      }
      return 'default'
    }
    return 'default'
  }

  const userValue = resolveValue(versionData?.user)
  const systemPref = versionData?.system
  const systemValue = resolveValue(systemPref)

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
    const parsed = parseVersionValue(value)
    const { track } = parsed
    let { version } = parsed
    if (track && versionData?.tracks?.[track]) {
      version = versionData.tracks[track]
    }
    setUserVersion.mutate(
      { app: appId, version, track },
      {
        onSuccess: () => {
          toast.success(t`Version changed`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update preference`))
        },
      }
    )
  }

  const handleSystemVersionChange = (value: string) => {
    const parsed = parseVersionValue(value)
    const { track } = parsed
    let { version } = parsed
    if (track && versionData?.tracks?.[track]) {
      version = versionData.tracks[track]
    }
    setSystemVersion.mutate(
      { app: appId, version, track },
      {
        onSuccess: () => {
          toast.success(t`Default for all users updated`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update default`))
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

  if (isError || (!hasMultipleVersions && !hasTracks)) {
    return (
      <EmptyState
        icon={Package}
        title={t`Not versioned`}
        description={t`This app does not have version management`}
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
            <SelectLabel><Trans>Track</Trans></SelectLabel>
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
            <SelectLabel><Trans>Version</Trans></SelectLabel>
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
        title={t`Version Management`} 
        description={t`Select which version of this app to use`}
      >
        <div className="divide-y-0">
          {isAdmin && (
            <FieldRow label={t`System Default`} description="The version used by users who haven't made a choice">
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
            label={isAdmin ? "Your Version" : "Preferred Version"} 
            description={t`Your personal version override`}
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
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useAppPermissions(appId)
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
          toast.success(t`Permission revoked`)
          setRevokingPermission(null)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to revoke permission`))
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
          toast.success(t`Permission granted`)
          setGrantingPermission(null)
          setGrantDialogOpen(false)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to grant permission`))
          setGrantingPermission(null)
        },
      }
    )
  }

  if (error) {
    return <GeneralError error={error} minimal mode='inline' reset={refetch} />
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
    .sort((a, b) => naturalCompare(formatPermission(a.permission), formatPermission(b.permission)))

  const grantedSet = new Set(grantedPermissions.map((p) => p.permission))
  const availablePermissions = allPermissions
    .filter((p) => !grantedSet.has(p.permission))
    .sort((a, b) => naturalCompare(a.label, b.label))

  return (
    <Section 
      title={t`Permissions`} 
      description={grantedPermissions.length === 0
        ? "No permissions granted to this app" : "Manage capabilities granted to this application"}
      action={availablePermissions.length > 0 && (
        <ResponsiveDialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
          <ResponsiveDialogTrigger asChild>
            <Button variant='outline' size='sm'>
              <Plus className='h-4 w-4 mr-1' />
              <Trans>Grant</Trans>
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className='flex flex-col overflow-hidden sm:max-w-lg data-[vaul-drawer-direction=bottom]:mt-4 data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-1rem)]'>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle><Trans>Grant permission</Trans></ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Select a capability to grant to {appName}.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className='min-h-0 flex-1 space-y-2 overflow-y-auto py-1'>
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
            <ResponsiveDialogFooter className='border-t pt-3'>
              <ResponsiveDialogClose asChild>
                <Button variant='outline'><Trans>Cancel</Trans></Button>
              </ResponsiveDialogClose>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
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
              title={t`No permissions granted`}
              description={t`Grant permissions to allow this app to access system features`}
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
  const { t } = useLingui()
  const [confirmOpen, setConfirmOpen] = useState(false)

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
        </div>
      </div>
      {canRevoke && (
        <>
          <Button 
            variant='ghost' 
            size='sm' 
            disabled={isRevoking}
            onClick={() => setConfirmOpen(true)}
            className="text-muted-foreground h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {isRevoking ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <X className='h-4 w-4' />
            )}
            <span className='sr-only'><Trans>Revoke</Trans></span>
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={t`Revoke permission?`}
            desc={`This will revoke the "${formatPermission(permission.permission)}" permission from ${appName}. The app may stop working correctly.`}
            confirmText='Revoke permission'
            destructive
            handleConfirm={() => onRevoke(permission.permission)}
            isLoading={isRevoking}
          />
        </>
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
