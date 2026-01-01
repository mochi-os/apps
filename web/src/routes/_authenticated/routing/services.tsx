import { createFileRoute } from '@tanstack/react-router'
import { RoutingServices } from '@/features/routing/services'

export const Route = createFileRoute('/_authenticated/routing/services')({
  component: RoutingServices,
})
