import { useState } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Main,
  usePageTitle,
  toast,
} from '@mochi/common'
import { Shield, ShieldAlert, Package } from 'lucide-react'
import { useGrantPermission } from '@/hooks/usePermissions'
import { useInstalledAppsQuery } from '@/hooks/useApps'

// Human-readable permission names and descriptions
// action: verb phrase (e.g., "manage groups")
// description: what this allows (e.g., "create, delete, and modify groups")
const permissionInfo: Record<string, { action: string; description: string }> = {
  'group/manage': {
    action: 'manage groups',
    description: 'create, delete, and modify groups and their members',
  },
  'access/allow': {
    action: 'grant access',
    description: 'grant others access to your content',
  },
  'access/deny': {
    action: 'deny access',
    description: 'deny others access to your content',
  },
  'access/revoke': {
    action: 'revoke access',
    description: 'revoke access that was previously granted',
  },
  'user/read': {
    action: 'read user information',
    description: 'read information about other users on this server',
  },
  'entity/delete': {
    action: 'delete data',
    description: 'permanently delete your data',
  },
  'setting/write': {
    action: 'modify settings',
    description: 'change system settings',
  },
  'permission/manage': {
    action: 'manage permissions',
    description: 'grant and revoke permissions for apps',
  },
  'webpush/send': {
    action: 'send notifications',
    description: 'send push notifications to your devices',
  },
}

// Permission display info with type-specific formatting
interface PermissionDisplayInfo {
  type: 'url' | 'service' | 'capability'
  // For URL: domain name; for service: service name; for capability: action verb
  primary: string
  // Additional context
  secondary: string
}

// Get user-friendly display info for a permission
function getPermissionInfo(permission: string): PermissionDisplayInfo {
  if (permissionInfo[permission]) {
    const info = permissionInfo[permission]
    return {
      type: 'capability',
      primary: info.action,
      secondary: `to ${info.description}`,
    }
  }

  if (permission.startsWith('url:')) {
    const domain = permission.slice(4)
    if (domain === '*') {
      return {
        type: 'url',
        primary: 'any website',
        secondary: 'make network requests to any domain',
      }
    }
    return {
      type: 'url',
      primary: domain,
      secondary: 'and its subdomains',
    }
  }

  if (permission.startsWith('service:')) {
    const service = permission.slice(8)
    // Capitalize service name
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1)
    return {
      type: 'service',
      primary: `${serviceName} service`,
      secondary: '',
    }
  }

  return {
    type: 'capability',
    primary: permission,
    secondary: `to use the ${permission} capability`,
  }
}

// Check if permission is restricted (tier 2)
function isRestrictedPermission(permission: string): boolean {
  const restricted = [
    'url:*',
    'access/allow',
    'access/deny',
    'access/revoke',
    'user/read',
    'entity/delete',
    'setting/write',
    'permission/manage',
    'webpush/send',
  ]
  return restricted.includes(permission)
}

export function PermissionRequest() {
  usePageTitle('Permission request')
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/permissions/request' })
  const grantPermission = useGrantPermission()
  const { data: appsData, isLoading: isLoadingApps } = useInstalledAppsQuery()
  const [completed, setCompleted] = useState<'granted' | 'denied' | null>(null)

  const app = (search as { app?: string }).app || ''
  const permission = (search as { permission?: string }).permission || ''
  const returnUrl = (search as { return?: string }).return || '/'
  const isPopup = !!window.opener

  // Find the app in installed or development apps
  const allApps = [
    ...(appsData?.installed || []),
    ...(appsData?.development || []),
  ]
  const appInfo = allApps.find((a) => a.id === app)
  const appName = appInfo?.name || app

  const restricted = isRestrictedPermission(permission)
  const permissionDisplay = getPermissionInfo(permission)

  const handleAllow = () => {
    if (restricted) {
      toast.error('Restricted permission', {
        description: 'This permission must be enabled in the app settings.',
      })
      return
    }

    grantPermission.mutate(
      { app, permission },
      {
        onSuccess: () => {
          // If opened as popup from another tab, try to close this tab
          if (isPopup) {
            setCompleted('granted')
            window.close()
            // If close fails, the completed state will show a message
            return
          }
          // Otherwise redirect back to the app
          window.location.href = returnUrl
        },
        onError: () => {
          toast.error('Failed to grant permission')
        },
      }
    )
  }

  const handleDeny = () => {
    // If opened as popup from another tab, try to close this tab
    if (isPopup) {
      setCompleted('denied')
      window.close()
      // If close fails, the completed state will show a message
      return
    }
    // Otherwise redirect back
    window.location.href = returnUrl
  }

  const handleOpenSettings = () => {
    navigate({ to: '/app/$appId', params: { appId: app }, search: { tab: 'permissions' } })
  }

  if (!app || !permission) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-muted-foreground'>Invalid permission request</div>
        </div>
      </Main>
    )
  }

  if (isLoadingApps) {
    return (
      <Main className='flex items-center justify-center'>
        <div className='text-muted-foreground'>Loading...</div>
      </Main>
    )
  }

  // Show message if popup couldn't close automatically
  if (completed) {
    return (
      <Main className='flex items-center justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
              <Shield className='h-8 w-8 text-blue-500' />
            </div>
            <CardTitle className='text-xl'>
              {completed === 'granted' ? 'Permission granted' : 'Permission denied'}
            </CardTitle>
            <CardDescription>
              Please close this tab and return to the app.
            </CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  return (
    <Main className='flex items-center justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
            <Package className='h-8 w-8 text-muted-foreground' />
          </div>
          <div className='flex items-center justify-center gap-2'>
            {restricted ? (
              <ShieldAlert className='h-5 w-5 text-amber-500' />
            ) : (
              <Shield className='h-5 w-5 text-blue-500' />
            )}
            <CardTitle className='text-xl'>{appName}</CardTitle>
          </div>
          {permissionDisplay.type === 'url' ? (
            <>
              <CardDescription>wants permission to access</CardDescription>
              <p className='mt-4 text-lg font-medium'>{permissionDisplay.primary}</p>
              <p className='text-sm text-muted-foreground'>{permissionDisplay.secondary}</p>
            </>
          ) : permissionDisplay.type === 'service' ? (
            <>
              <CardDescription>wants permission to use the</CardDescription>
              <p className='mt-4 text-lg font-medium'>{permissionDisplay.primary}</p>
            </>
          ) : (
            <>
              <CardDescription>wants permission to</CardDescription>
              <p className='mt-4 text-lg font-medium'>{permissionDisplay.primary}</p>
              <p className='text-sm text-muted-foreground'>{permissionDisplay.secondary}</p>
            </>
          )}
        </CardHeader>
        <CardContent>
          {restricted && (
            <p className='text-sm text-amber-600'>
              This is a restricted permission. It must be enabled manually in
              the app's permission settings.
            </p>
          )}
        </CardContent>
        <CardFooter className='flex gap-3'>
          {restricted ? (
            <>
              <Button variant='outline' className='flex-1' onClick={handleDeny}>
                Cancel
              </Button>
              <Button className='flex-1' onClick={handleOpenSettings}>
                Open settings
              </Button>
            </>
          ) : (
            <>
              <Button variant='outline' className='flex-1' onClick={handleDeny}>
                Deny
              </Button>
              <Button
                className='flex-1'
                onClick={handleAllow}
                disabled={grantPermission.isPending}
              >
                {grantPermission.isPending ? 'Granting...' : 'Allow'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </Main>
  )
}
