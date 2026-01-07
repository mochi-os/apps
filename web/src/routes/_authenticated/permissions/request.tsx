import { createFileRoute } from '@tanstack/react-router'
import { PermissionRequest } from '@/features/permissions/request'

export const Route = createFileRoute('/_authenticated/permissions/request')({
  component: PermissionRequest,
})
