import { createFileRoute } from '@tanstack/react-router'
import { RoutingPaths } from '@/features/routing/paths'

export const Route = createFileRoute('/_authenticated/routing/paths')({
  component: RoutingPaths,
})
